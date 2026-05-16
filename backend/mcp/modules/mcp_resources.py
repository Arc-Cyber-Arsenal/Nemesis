"""
MCP Resources - Resource definitions and handlers
"""
import json
from typing import List
from mcp.types import Resource


def get_resources() -> List[Resource]:
    """List available resources"""
    return [
        Resource(
            uri="exegol://status",
            name="Current Status",
            description="Current assessment status and container info",
            mimeType="application/json"
        ),
        Resource(
            uri="exegol://containers",
            name="Exegol Containers",
            description="List of all Exegol containers",
            mimeType="application/json"
        )
    ]


async def handle_resource_read(uri: str, mcp_service) -> str:
    """Read resource content"""
    await mcp_service.initialize()

    if uri == "exegol://status":
        status_info = {
            "current_assessment": mcp_service.current_assessment_name,
            "assessment_id": mcp_service.current_assessment_id,
            "current_container": mcp_service.current_container,
            "current_target": mcp_service.current_target,
            "containers_available": len(mcp_service.containers_cache),
            "recent_commands": len(mcp_service.command_history),
            "tool_cache_size": len(mcp_service.tool_cache)
        }
        return json.dumps(status_info, indent=2)

    elif uri == "exegol://containers":
        containers = await mcp_service.discover_containers()
        return json.dumps(containers, indent=2)
    else:
        raise ValueError(f"Unknown resource: {uri}")
