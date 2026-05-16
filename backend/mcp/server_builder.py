"""
Shared MCP server builder.

Creates a low-level ``Server("nemesis-mcp")`` and registers its tools / resources.
Used by both the stdio entry point (``nemesis_mcp_server.py``) and the HTTP mount
(``http_app.py``) so both transports expose the same surface.
"""
from mcp.server import Server
from mcp.types import Tool, TextContent, Resource

# Resolve imports whether this module is loaded from the backend root or
# through the ``backend.mcp`` package path.
import os
import sys

_MODULES_DIR = os.path.join(os.path.dirname(__file__), "modules")
if _MODULES_DIR not in sys.path:
    sys.path.insert(0, _MODULES_DIR)

from mcp_tools import get_tool_definitions  # noqa: E402
from mcp_handlers import handle_tool_call  # noqa: E402
from mcp_resources import get_resources, handle_resource_read  # noqa: E402


def build_mcp_server(mcp_service) -> Server:
    """Build a low-level MCP Server with tools and resources wired up.

    ``mcp_service`` is the ``AidaMCPService`` instance used by handlers. It
    must already be constructed; callers are responsible for calling
    ``await mcp_service.initialize()`` before serving traffic.
    """
    server = Server("nemesis-mcp")

    @server.list_resources()
    async def _list_resources() -> list[Resource]:
        return get_resources()

    @server.read_resource()
    async def _read_resource(uri: str) -> str:
        return await handle_resource_read(uri, mcp_service)

    @server.list_tools()
    async def _list_tools() -> list[Tool]:
        return get_tool_definitions()

    @server.call_tool()
    async def _call_tool(name: str, arguments: dict) -> list[TextContent]:
        return await handle_tool_call(name, arguments, mcp_service)

    return server
