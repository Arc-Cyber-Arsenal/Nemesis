"""
Logging context management for propagating contextual information across logs
Uses contextvars for async-safe context propagation
"""
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Dict, Generator, Optional

import structlog

# Context variables for request tracking
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
assessment_id_var: ContextVar[Optional[int]] = ContextVar("assessment_id", default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar("user_id", default=None)
container_name_var: ContextVar[Optional[str]] = ContextVar("container_name", default=None)
phase_var: ContextVar[Optional[str]] = ContextVar("phase", default=None)


def generate_request_id() -> str:
    """Generate a unique request ID"""
    return str(uuid.uuid4())[:8]


def get_request_id() -> Optional[str]:
    """Get current request ID from context"""
    return request_id_var.get()


def set_request_id(request_id: str) -> None:
    """Set request ID in context"""
    request_id_var.set(request_id)
    structlog.contextvars.bind_contextvars(request_id=request_id)


def get_assessment_id() -> Optional[int]:
    """Get current assessment ID from context"""
    return assessment_id_var.get()


def set_assessment_id(assessment_id: int) -> None:
    """Set assessment ID in context"""
    assessment_id_var.set(assessment_id)
    structlog.contextvars.bind_contextvars(assessment_id=assessment_id)


def get_user_id() -> Optional[str]:
    """Get current user ID from context"""
    return user_id_var.get()


def set_user_id(user_id: str) -> None:
    """Set user ID in context"""
    user_id_var.set(user_id)
    structlog.contextvars.bind_contextvars(user_id=user_id)


def get_container_name() -> Optional[str]:
    """Get current container name from context"""
    return container_name_var.get()


def set_container_name(container_name: str) -> None:
    """Set container name in context"""
    container_name_var.set(container_name)
    structlog.contextvars.bind_contextvars(container_name=container_name)


def get_phase() -> Optional[str]:
    """Get current phase from context"""
    return phase_var.get()


def set_phase(phase: str) -> None:
    """Set phase in context"""
    phase_var.set(phase)
    structlog.contextvars.bind_contextvars(phase=phase)


def clear_context() -> None:
    """Clear all context variables"""
    structlog.contextvars.clear_contextvars()
    request_id_var.set(None)
    assessment_id_var.set(None)
    user_id_var.set(None)
    container_name_var.set(None)
    phase_var.set(None)


@contextmanager
def log_context(**kwargs: Any) -> Generator[None, None, None]:
    """
    Context manager for adding temporary context to logs

    Example:
        with log_context(assessment_id=123, phase="reconnaissance"):
            logger.info("Starting scan")  # Will include assessment_id and phase
    """
    # Bind context variables
    structlog.contextvars.bind_contextvars(**kwargs)

    try:
        yield
    finally:
        # Unbind context variables
        structlog.contextvars.unbind_contextvars(*kwargs.keys())


@contextmanager
def request_context(
    request_id: Optional[str] = None,
    assessment_id: Optional[int] = None,
    user_id: Optional[str] = None
) -> Generator[str, None, None]:
    """
    Context manager for HTTP request tracking

    Args:
        request_id: Request ID (auto-generated if not provided)
        assessment_id: Assessment ID if applicable
        user_id: User ID if authenticated

    Yields:
        request_id: The request ID for this context

    Example:
        with request_context(assessment_id=123) as req_id:
            logger.info("Processing request")
    """
    # Generate request ID if not provided
    if request_id is None:
        request_id = generate_request_id()

    # Build context
    context: Dict[str, Any] = {"request_id": request_id}
    if assessment_id is not None:
        context["assessment_id"] = assessment_id
        assessment_id_var.set(assessment_id)
    if user_id is not None:
        context["user_id"] = user_id
        user_id_var.set(user_id)

    # Set request ID
    request_id_var.set(request_id)

    # Bind all context
    structlog.contextvars.bind_contextvars(**context)

    try:
        yield request_id
    finally:
        # Clear context after request
        structlog.contextvars.unbind_contextvars(*context.keys())
        request_id_var.set(None)
        if assessment_id is not None:
            assessment_id_var.set(None)
        if user_id is not None:
            user_id_var.set(None)


@contextmanager
def timed_operation(logger: structlog.stdlib.BoundLogger, operation: str) -> Generator[None, None, None]:
    """
    Context manager for timing operations

    Args:
        logger: Logger instance
        operation: Name of the operation

    Example:
        with timed_operation(logger, "database_query"):
            result = db.query(...)
        # Logs: "database_query completed in 45ms"
    """
    import time

    start_time = time.time()
    try:
        yield
    finally:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"{operation} completed", operation=operation, duration_ms=duration_ms)
