"""
Command Pydantic schemas
"""
from datetime import datetime
from typing import Optional, Dict, List, Union, Any
from pydantic import BaseModel, ConfigDict


class CommandExecute(BaseModel):
    """Schema for executing a command"""
    command: str
    phase: Optional[str] = None


class PythonExecRequest(BaseModel):
    """Schema for executing Python code via stdin (no escaping needed)"""
    code: str
    phase: Optional[str] = None


class HttpRequestRequest(BaseModel):
    """Schema for making structured HTTP requests from inside Exegol.

    Generates a Python requests script passed via stdin — no curl escaping.
    Supports {{PLACEHOLDER}} credential substitution on url, headers, cookies, auth.
    """
    url: str
    method: str = "GET"
    headers: Optional[Dict[str, str]] = None
    params: Optional[Dict[str, str]] = None
    data: Optional[Union[Dict[str, str], str]] = None   # form data or raw body
    json_body: Optional[Dict[str, Any]] = None          # JSON body ('json' is reserved in Python)
    cookies: Optional[Dict[str, str]] = None
    auth: Optional[List[str]] = None                    # [username, password]
    timeout: int = 30
    follow_redirects: bool = True
    verify_ssl: bool = True
    proxy: Optional[str] = None                         # e.g. "http://127.0.0.1:8080" for Burp
    phase: Optional[str] = None


class CommandResponse(BaseModel):
    """Schema for command response"""
    id: int
    assessment_id: int
    container_name: Optional[str]
    command: str
    stdout: Optional[str]
    stderr: Optional[str]
    returncode: Optional[int]
    execution_time: Optional[float]
    success: Optional[bool]
    phase: Optional[str]
    status: Optional[str]  # completed, failed, timeout, running
    command_type: Optional[str] = 'shell'  # 'shell' | 'python'
    source_code: Optional[str] = None      # Raw Python code (for python_exec)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommandWithAssessmentResponse(CommandResponse):
    """Schema for command response with assessment info"""
    assessment_name: str


class CommandsPaginatedResponse(BaseModel):
    """Schema for paginated commands response"""
    commands: list[CommandWithAssessmentResponse]
    total: int
    skip: int
    limit: int
    has_more: bool
