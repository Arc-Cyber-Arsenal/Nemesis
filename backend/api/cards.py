"""
Card CRUD API endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Card, Assessment
from schemas.card import CardCreate, CardUpdate, CardResponse
from websocket.manager import manager
from websocket.events import event_card_added, event_card_updated, event_card_deleted
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/assessments/{assessment_id}/cards", tags=["cards"])


@router.get("", response_model=List[CardResponse])
async def list_cards(
    assessment_id: int,
    card_type: str = None,
    db: Session = Depends(get_db)
):
    """Get all cards for an assessment"""
    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    query = db.query(Card).filter(Card.assessment_id == assessment_id)

    # Filter by card_type if provided
    if card_type:
        query = query.filter(Card.card_type == card_type)

    cards = query.order_by(Card.section_number, Card.created_at).all()
    return cards


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(
    assessment_id: int,
    card_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific card"""
    card = db.query(Card).filter(
        Card.id == card_id,
        Card.assessment_id == assessment_id
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card with id {card_id} not found"
        )

    return card


@router.post("", response_model=CardResponse, status_code=status.HTTP_201_CREATED)
async def create_card(
    assessment_id: int,
    card: CardCreate,
    db: Session = Depends(get_db)
):
    """Create a new card (Finding/Observation/Info)"""
    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found"
        )

    # Validate card_type
    if card.card_type not in ["finding", "observation", "info"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="card_type must be one of: finding, observation, info"
        )

    # Create card
    new_card = Card(
        assessment_id=assessment_id,
        **card.model_dump()
    )

    db.add(new_card)
    db.commit()
    db.refresh(new_card)

    # Broadcast WebSocket event
    card_dict = CardResponse.model_validate(new_card).model_dump(mode='json')
    await manager.broadcast(
        event_card_added(assessment_id, card_dict),
        assessment_id=assessment_id
    )
    logger.info("Card added", card_id=new_card.id, card_type=new_card.card_type, assessment_id=assessment_id)

    return new_card


@router.put("/{card_id}", response_model=CardResponse)
@router.patch("/{card_id}", response_model=CardResponse)
async def update_card(
    assessment_id: int,
    card_id: int,
    card_update: CardUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing card (partial update supported)"""
    card = db.query(Card).filter(
        Card.id == card_id,
        Card.assessment_id == assessment_id
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card with id {card_id} not found"
        )

    # Update fields (partial update - only provided fields)
    update_data = card_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(card, field, value)

    db.commit()
    db.refresh(card)

    # Broadcast WebSocket event
    card_dict = CardResponse.model_validate(card).model_dump(mode='json')
    await manager.broadcast(
        event_card_updated(assessment_id, card_id, card_dict),
        assessment_id=assessment_id
    )
    logger.info("Card updated", card_id=card_id, assessment_id=assessment_id)

    return card


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    assessment_id: int,
    card_id: int,
    db: Session = Depends(get_db)
):
    """Delete a card"""
    card = db.query(Card).filter(
        Card.id == card_id,
        Card.assessment_id == assessment_id
    ).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card with id {card_id} not found"
        )

    db.delete(card)
    db.commit()

    # Broadcast WebSocket event
    await manager.broadcast(
        event_card_deleted(assessment_id, card_id),
        assessment_id=assessment_id
    )
    logger.info("Card deleted", card_id=card_id, assessment_id=assessment_id)

    return None
