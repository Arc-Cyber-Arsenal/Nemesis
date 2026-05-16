"""
Tool Usage Statistics Schemas
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class ToolUsage(BaseModel):
    """Single tool usage statistics"""
    tool: str = Field(..., description="Tool name (e.g., 'nmap', 'curl')")
    count: int = Field(..., description="Number of times this tool was used")
    percentage: float = Field(..., description="Percentage of total commands")
    success_rate: float = Field(..., description="Success rate percentage (0-100)")


class ToolCategoryStats(BaseModel):
    """Statistics for a tool category"""
    count: int = Field(..., description="Total commands in this category")
    percentage: float = Field(..., description="Percentage of total commands")
    tools: List[str] = Field(..., description="List of tools in this category")


class ToolCount(BaseModel):
    """Simple tool count pair"""
    tool: str
    count: int


class AssessmentToolUsage(BaseModel):
    """Tool usage for a specific assessment"""
    assessment_id: int
    assessment_name: str
    total_commands: int
    top_tools: List[ToolCount] = Field(
        ..., 
        description="Top tools used in this assessment"
    )


class ToolUsageStatsResponse(BaseModel):
    """Complete tool usage statistics response"""
    total_commands: int = Field(..., description="Total number of commands analyzed")
    total_assessments: int = Field(..., description="Number of assessments included")
    date_range: Optional[str] = Field(None, description="Date range analyzed (if filtered)")
    
    most_used_tools: List[ToolUsage] = Field(
        ..., 
        description="Top N most used tools"
    )
    
    tool_categories: Dict[str, ToolCategoryStats] = Field(
        ...,
        description="Statistics grouped by category (recon, web, exploitation, etc.)"
    )
    
    by_assessment: List[AssessmentToolUsage] = Field(
        ...,
        description="Tool usage broken down by assessment"
    )
    
    unknown_tools: List[str] = Field(
        default=[],
        description="Tools that couldn't be categorized"
    )
