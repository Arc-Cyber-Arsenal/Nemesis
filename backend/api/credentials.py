"""
API routes for Credentials management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.credential import Credential
from models.assessment import Assessment
from schemas.credential import (
    CredentialCreate,
    CredentialUpdate,
    CredentialResponse,
    CredentialListResponse
)
from websocket.manager import manager
from websocket.events import event_credential_added, EventType, create_event
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/assessments/{assessment_id}/credentials", response_model=CredentialListResponse)
async def list_credentials(
    assessment_id: int,
    credential_type: str = None,
    db: Session = Depends(get_db)
):
    """
    List all credentials for an assessment

    Optional filters:
    - credential_type: Filter by type (bearer_token, cookie, etc.)
    """
    # Check that assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found"
        )

    # Base query
    query = db.query(Credential).filter(Credential.assessment_id == assessment_id)

    # Filter by type if specified
    if credential_type:
        query = query.filter(Credential.credential_type == credential_type)

    credentials = query.order_by(Credential.created_at.desc()).all()

    # Calculate statistics by type
    by_type = {}
    for cred in credentials:
        cred_type = cred.credential_type
        by_type[cred_type] = by_type.get(cred_type, 0) + 1

    return {
        "credentials": credentials,
        "total": len(credentials),
        "by_type": by_type
    }


@router.post("/assessments/{assessment_id}/credentials", response_model=CredentialResponse, status_code=status.HTTP_201_CREATED)
async def create_credential(
    assessment_id: int,
    credential: CredentialCreate,
    db: Session = Depends(get_db)
):
    """
    Add a new credential to an assessment
    """
    # Check that assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found"
        )

    # Check that placeholder is unique for this assessment
    existing = db.query(Credential).filter(
        Credential.assessment_id == assessment_id,
        Credential.placeholder == credential.placeholder
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Placeholder '{credential.placeholder}' already exists for this assessment"
        )

    # Create credential
    db_credential = Credential(
        assessment_id=assessment_id,
        **credential.model_dump()
    )

    db.add(db_credential)
    db.commit()
    db.refresh(db_credential)

    # Broadcast WebSocket event
    credential_dict = CredentialResponse.model_validate(db_credential).model_dump(mode='json')
    await manager.broadcast(
        event_credential_added(assessment_id, credential_dict),
        assessment_id=assessment_id
    )
    logger.info("Credential added", credential_id=db_credential.id, credential_type=db_credential.credential_type, assessment_id=assessment_id)

    return db_credential


@router.get("/credentials/{credential_id}", response_model=CredentialResponse)
async def get_credential(credential_id: int, db: Session = Depends(get_db)):
    """
    Get a specific credential by ID
    """
    credential = db.query(Credential).filter(Credential.id == credential_id).first()

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credential {credential_id} not found"
        )

    return credential


@router.patch("/credentials/{credential_id}", response_model=CredentialResponse)
async def update_credential(
    credential_id: int,
    credential_update: CredentialUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a credential (partial update)
    """
    db_credential = db.query(Credential).filter(Credential.id == credential_id).first()

    if not db_credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credential {credential_id} not found"
        )

    # Update only provided fields
    update_data = credential_update.model_dump(exclude_unset=True)

    # Check placeholder uniqueness if modified
    if "placeholder" in update_data:
        existing = db.query(Credential).filter(
            Credential.assessment_id == db_credential.assessment_id,
            Credential.placeholder == update_data["placeholder"],
            Credential.id != credential_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Placeholder '{update_data['placeholder']}' already exists for this assessment"
            )

    for field, value in update_data.items():
        setattr(db_credential, field, value)

    db.commit()
    db.refresh(db_credential)

    # Broadcast WebSocket event
    credential_dict = CredentialResponse.model_validate(db_credential).model_dump(mode='json')
    await manager.broadcast(
        create_event(
            EventType.CREDENTIAL_UPDATED,
            {"credential_id": credential_id, "credential": credential_dict},
            assessment_id=db_credential.assessment_id
        ),
        assessment_id=db_credential.assessment_id
    )
    logger.info("Credential updated", credential_id=credential_id, assessment_id=db_credential.assessment_id)

    return db_credential


@router.delete("/credentials/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credential(credential_id: int, db: Session = Depends(get_db)):
    """
    Delete a credential
    """
    credential = db.query(Credential).filter(Credential.id == credential_id).first()

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credential {credential_id} not found"
        )

    assessment_id = credential.assessment_id

    db.delete(credential)
    db.commit()

    # Broadcast WebSocket event
    await manager.broadcast(
        create_event(
            EventType.CREDENTIAL_DELETED,
            {"credential_id": credential_id},
            assessment_id=assessment_id
        ),
        assessment_id=assessment_id
    )
    logger.info("Credential deleted", credential_id=credential_id, assessment_id=assessment_id)

    return None


@router.get("/assessments/{assessment_id}/credentials/by-placeholder/{placeholder}", response_model=CredentialResponse)
async def get_credential_by_placeholder(
    assessment_id: int,
    placeholder: str,
    db: Session = Depends(get_db)
):
    """
    Get a credential by its placeholder (useful for command execution)
    """
    credential = db.query(Credential).filter(
        Credential.assessment_id == assessment_id,
        Credential.placeholder == placeholder
    ).first()

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credential with placeholder '{placeholder}' not found in assessment {assessment_id}"
        )

    return credential
