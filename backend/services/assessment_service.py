"""
Assessment service - Business logic for assessments
"""
from sqlalchemy.orm import Session
from models import Assessment
from schemas.assessment import AssessmentCreate
from services.container_service import ContainerService


class AssessmentService:
    def __init__(self, db: Session):
        self.db = db
        self.container_service = ContainerService()

    async def create_assessment(self, assessment_data: AssessmentCreate) -> Assessment:
        """Create a new assessment with workspace in Exegol container"""
        # Create assessment in DB
        new_assessment = Assessment(**assessment_data.model_dump())
        self.db.add(new_assessment)
        self.db.commit()
        self.db.refresh(new_assessment)

        # Create workspace folder in Exegol container (not on host)
        workspace_result = await self.container_service.create_workspace(
            assessment_name=assessment_data.name,
            db=self.db
        )
        new_assessment.workspace_path = workspace_result["workspace_path"]
        new_assessment.container_name = workspace_result["container_name"]
        self.db.commit()
        self.db.refresh(new_assessment)

        return new_assessment
