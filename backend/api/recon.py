"""
Recon Data API endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import ReconData, Assessment
from schemas.recon import ReconDataCreate, ReconDataUpdate, ReconDataResponse
from websocket.manager import manager
from websocket.events import event_recon_added, event_recon_updated, event_recon_deleted
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/assessments/{assessment_id}/recon", tags=["recon"])


@router.get("", response_model=List[ReconDataResponse])
async def list_recon_data(
    assessment_id: int,
    data_type: str = None,
    db: Session = Depends(get_db)
):
    """Get all recon data for an assessment"""
    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    query = db.query(ReconData).filter(ReconData.assessment_id == assessment_id)

    # Filter by data_type if provided
    if data_type:
        query = query.filter(ReconData.data_type == data_type)

    recon_data = query.order_by(ReconData.created_at).all()
    return recon_data


@router.get("/types", response_model=List[str])
async def list_recon_types(
    assessment_id: int,
    db: Session = Depends(get_db)
):
    """Get all unique data_types used in this assessment's recon data"""
    from sqlalchemy import distinct

    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    # Get distinct data_types
    types = db.query(distinct(ReconData.data_type)).filter(
        ReconData.assessment_id == assessment_id
    ).order_by(ReconData.data_type).all()

    return [t[0] for t in types if t[0]]


@router.post("", response_model=ReconDataResponse, status_code=status.HTTP_201_CREATED)
async def create_recon_data(
    assessment_id: int,
    recon: ReconDataCreate,
    db: Session = Depends(get_db)
):
    """Add new recon data with flexible categories"""
    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    # Create recon data (data_type is normalized by Pydantic validator)
    new_recon = ReconData(
        assessment_id=assessment_id,
        **recon.model_dump()
    )

    db.add(new_recon)
    db.commit()
    db.refresh(new_recon)

    # Broadcast WebSocket event
    recon_dict = ReconDataResponse.model_validate(new_recon).model_dump(mode='json')
    await manager.broadcast(
        event_recon_added(assessment_id, recon_dict),
        assessment_id=assessment_id
    )
    logger.info("Recon data added", recon_id=new_recon.id, data_type=new_recon.data_type, assessment_id=assessment_id)

    return new_recon


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def create_recon_data_batch(
    assessment_id: int,
    batch_data: dict,
    db: Session = Depends(get_db)
):
    """Add multiple recon data entries in one transaction"""
    entries = batch_data.get("entries", [])
    
    if not entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No entries provided"
        )
    
    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    # Validate and normalize entries using Pydantic schema
    from schemas.recon import ReconDataCreate
    validated_entries = []
    for entry in entries:
        try:
            validated_entry = ReconDataCreate(**entry)
            validated_entries.append(validated_entry)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid entry: {str(e)}"
            )

    # Batch creation
    recon_entries = []
    for validated_entry in validated_entries:
        recon_entry = ReconData(
            assessment_id=assessment_id,
            **validated_entry.model_dump()
        )
        recon_entries.append(recon_entry)
    
    db.add_all(recon_entries)
    db.commit()
    
    # Refresh to get IDs
    for entry in recon_entries:
        db.refresh(entry)

    # Broadcast WebSocket events for all added entries
    for entry in recon_entries:
        recon_dict = ReconDataResponse.model_validate(entry).model_dump(mode='json')
        await manager.broadcast(
            event_recon_added(assessment_id, recon_dict),
            assessment_id=assessment_id
        )

    # Summary by type
    summary = {}
    for entry in recon_entries:
        data_type = entry.data_type
        summary[data_type] = summary.get(data_type, 0) + 1

    logger.info("Recon data batch added", count=len(recon_entries), summary=summary, assessment_id=assessment_id)

    return {
        "created_count": len(recon_entries),
        "summary": summary,
        "entries": recon_entries
    }


@router.patch("/{recon_id}", response_model=ReconDataResponse)
async def update_recon_data(
    assessment_id: int,
    recon_id: int,
    recon_update: ReconDataUpdate,
    db: Session = Depends(get_db)
):
    """Update existing recon data (partial update supported)"""
    recon = db.query(ReconData).filter(
        ReconData.id == recon_id,
        ReconData.assessment_id == assessment_id
    ).first()

    if not recon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recon data with id {recon_id} not found"
        )

    # Update fields (partial update - only provided fields)
    update_data = recon_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(recon, field, value)

    db.commit()
    db.refresh(recon)

    # Broadcast WebSocket event
    recon_dict = ReconDataResponse.model_validate(recon).model_dump(mode='json')
    await manager.broadcast(
        event_recon_updated(assessment_id, recon_id, recon_dict),
        assessment_id=assessment_id
    )
    logger.info("Recon data updated", recon_id=recon_id, assessment_id=assessment_id)

    return recon


@router.delete("/{recon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recon_data(
    assessment_id: int,
    recon_id: int,
    db: Session = Depends(get_db)
):
    """Delete recon data"""
    recon = db.query(ReconData).filter(
        ReconData.id == recon_id,
        ReconData.assessment_id == assessment_id
    ).first()

    if not recon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recon data with id {recon_id} not found"
        )

    db.delete(recon)
    db.commit()

    # Broadcast WebSocket event
    await manager.broadcast(
        event_recon_deleted(assessment_id, recon_id),
        assessment_id=assessment_id
    )
    logger.info("Recon data deleted", recon_id=recon_id, assessment_id=assessment_id)

    return None
