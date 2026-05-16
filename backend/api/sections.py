"""
Assessment sections (phases) API endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import AssessmentSection, Assessment
from schemas.section import SectionCreate, SectionUpdate, SectionResponse
from websocket.manager import manager
from websocket.events import event_section_updated
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/assessments/{assessment_id}/sections", tags=["sections"])


@router.get("", response_model=List[SectionResponse])
async def list_sections(
    assessment_id: int,
    db: Session = Depends(get_db)
):
    """Get all sections for an assessment"""
    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    sections = (
        db.query(AssessmentSection)
        .filter(AssessmentSection.assessment_id == assessment_id)
        .order_by(AssessmentSection.section_number)
        .all()
    )

    return sections


@router.post("", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
async def create_section(
    assessment_id: int,
    section: SectionCreate,
    db: Session = Depends(get_db)
):
    """Create or update a section"""
    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    # Check if section already exists
    existing = db.query(AssessmentSection).filter(
        AssessmentSection.assessment_id == assessment_id,
        AssessmentSection.section_type == section.section_type,
        AssessmentSection.section_number == section.section_number
    ).first()

    if existing:
        # Update existing
        for field, value in section.model_dump().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)

        # Broadcast WebSocket event
        section_dict = SectionResponse.model_validate(existing).model_dump(mode='json')
        await manager.broadcast(
            event_section_updated(assessment_id, section_dict),
            assessment_id=assessment_id
        )
        logger.info("Section updated", section_id=existing.id, section_type=existing.section_type, assessment_id=assessment_id)

        return existing

    # Create new
    new_section = AssessmentSection(
        assessment_id=assessment_id,
        **section.model_dump()
    )

    db.add(new_section)
    db.commit()
    db.refresh(new_section)

    # Broadcast WebSocket event
    section_dict = SectionResponse.model_validate(new_section).model_dump(mode='json')
    await manager.broadcast(
        event_section_updated(assessment_id, section_dict),
        assessment_id=assessment_id
    )
    logger.info("Section created", section_id=new_section.id, section_type=new_section.section_type, assessment_id=assessment_id)

    return new_section


@router.put("/{section_id}", response_model=SectionResponse)
async def update_section(
    assessment_id: int,
    section_id: int,
    section_update: SectionUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing section"""
    section = db.query(AssessmentSection).filter(
        AssessmentSection.id == section_id,
        AssessmentSection.assessment_id == assessment_id
    ).first()

    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Section with id {section_id} not found"
        )

    # Update fields
    update_data = section_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(section, field, value)

    db.commit()
    db.refresh(section)

    # Broadcast WebSocket event
    section_dict = SectionResponse.model_validate(section).model_dump(mode='json')
    await manager.broadcast(
        event_section_updated(assessment_id, section_dict),
        assessment_id=assessment_id
    )
    logger.info("Section updated", section_id=section_id, assessment_id=assessment_id)

    return section


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    assessment_id: int,
    section_id: int,
    db: Session = Depends(get_db)
):
    """Delete a section"""
    section = db.query(AssessmentSection).filter(
        AssessmentSection.id == section_id,
        AssessmentSection.assessment_id == assessment_id
    ).first()

    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Section with id {section_id} not found"
        )

    db.delete(section)
    db.commit()
    return None
