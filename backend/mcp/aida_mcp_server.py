#!/usr/bin/env python3
"""
Nemesis MCP Server - Main Entry Point
AI-Driven Security Assessment - Model Context Protocol Server

Refactored with modular architecture for better maintainability

Changes in version 2.0:
- Rebranded to Nemesis (AI-Driven Security Assessment)
- Modular structure (classes, tools, handlers, resources separated)
- Renamed: start_assessment → load_assessment
- Removed: list_containers, select_container (auto-managed)
- Added: Enhanced tools for findings, observations, and recon data
"""
import asyncio
import sys
import signal
import logging
from pathlib import Path

try:
    from mcp.server.models import InitializationOptions
    from mcp.server import NotificationOptions
    from mcp.server.stdio import stdio_server

    # Add parent directory to path for utils import
    sys.path.insert(0, str(Path(__file__).parent.parent))

    # Import structured logging
    from utils.logger import setup_logging, get_logger
    from config import settings

    # Setup logging for MCP server
    # Disable console logging to prevent stdout pollution (MCP uses stdout for JSON protocol)
    # Disable file logging because MCP working directory may be read-only
    setup_logging(
        log_level=settings.LOG_LEVEL,
        log_format="json",  # Use JSON format for structured logs
        log_dir=settings.LOG_DIR,
        enable_file_logging=False,  # DISABLED: MCP working directory may be read-only
        enable_console_logging=False,  # DISABLED: stdout reserved for MCP protocol
        max_bytes=settings.LOG_FILE_MAX_BYTES,
        backup_count=settings.LOG_FILE_BACKUP_COUNT
    )

    # Silence MCP SDK loggers to prevent stdout pollution
    for logger_name in ["mcp", "mcp.server", "mcp.server.stdio", "anyio", "httpx", "httpcore"]:
        sdk_logger = logging.getLogger(logger_name)
        sdk_logger.setLevel(logging.CRITICAL)
        sdk_logger.handlers = []
        sdk_logger.addHandler(logging.NullHandler())
        sdk_logger.propagate = False

    logger = get_logger(__name__)

    # Add this dir + modules dir to path so we can import the shared
    # builder and the handler modules without colliding with the
    # installed ``mcp`` package.
    sys.path.insert(0, str(Path(__file__).parent / "modules"))
    sys.path.insert(0, str(Path(__file__).parent))

    from mcp_classes import AidaMCPService
    from server_builder import build_mcp_server

except Exception as e:
    # Log to stderr for debugging (won't pollute stdout MCP protocol)
    import traceback
    print(f"FATAL MCP INIT ERROR: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)

# Initialize MCP service and build the transport-agnostic server
mcp_service = AidaMCPService()
server = build_mcp_server(mcp_service)


async def main():
    """Main server function"""

    def signal_handler(signum, frame):
        logger.info("Shutting down MCP server", signal=signum)
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info(
        "MCP server starting",
        server="nemesis-mcp",
        project="Nemesis - AI-Driven Security Assessment",
        version="1.1.0",
        log_level=settings.LOG_LEVEL
    )

    # Initialize MCP service
    await mcp_service.initialize()

    try:
        async with stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="nemesis-mcp",
                    server_version="1.1.0",
                    capabilities=server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={}
                    )
                )
            )
    except Exception as e:
        logger.error("MCP server error", error=str(e), exc_info=True)
        raise
    finally:
        await mcp_service.cleanup()
        logger.info("MCP server shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())
