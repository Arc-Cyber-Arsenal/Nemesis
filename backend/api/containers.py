"""
Container management API endpoints
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Assessment
from services.container_service import ContainerService

router = APIRouter(prefix="/containers", tags=["containers"])


@router.get("")
async def list_containers():
    """List all pentesting containers (Exegol)"""
    container_service = ContainerService()
    containers = await container_service.discover_containers()
    return containers


@router.post("/select")
async def select_container(container_name: str):
    """Select the active pentesting container"""
    container_service = ContainerService()
    result = await container_service.select_container(container_name)
    return result


@router.get("/workspace/{assessment_id}")
async def get_workspace_path(
    assessment_id: int,
    db: Session = Depends(get_db)
):
    """Get workspace path for an assessment"""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    return {
        "assessment_id": assessment_id,
        "workspace_path": assessment.workspace_path
    }


@router.post("/workspace/{assessment_id}")
async def create_workspace(
    assessment_id: int,
    db: Session = Depends(get_db)
):
    """Create workspace folder for an assessment in the pentesting container"""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    container_service = ContainerService()
    workspace_result = await container_service.create_workspace(assessment.name, db=db)

    # Update assessment with workspace path and container name
    assessment.workspace_path = workspace_result["workspace_path"]
    assessment.container_name = workspace_result["container_name"]
    db.commit()

    return {
        "assessment_id": assessment_id,
        "workspace_path": workspace_result["workspace_path"],
        "container_name": workspace_result["container_name"],
        "message": "Workspace created successfully"
    }
