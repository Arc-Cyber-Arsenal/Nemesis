"""
Logging middleware for FastAPI
Logs all HTTP requests with timing, status codes, and context
"""
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from utils.logger import get_logger
from utils.log_context import generate_request_id, request_context

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests and responses with structured logging
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log details

        Args:
            request: FastAPI request object
            call_next: Next middleware/route handler

        Returns:
            Response object
        """
        # Generate request ID
        req_id = generate_request_id()

        # Extract assessment_id from path if present
        assessment_id = None
        if "/assessments/" in request.url.path:
            try:
                path_parts = request.url.path.split("/")
                if "assessments" in path_parts:
                    idx = path_parts.index("assessments")
                    if idx + 1 < len(path_parts) and path_parts[idx + 1].isdigit():
                        assessment_id = int(path_parts[idx + 1])
            except (ValueError, IndexError):
                pass

        # Start timing
        start_time = time.time()

        # Set up request context
        with request_context(request_id=req_id, assessment_id=assessment_id):
            # Log incoming request
            logger.info(
                "Request started",
                method=request.method,
                path=request.url.path,
                query_params=dict(request.query_params) if request.query_params else None,
                client_host=request.client.host if request.client else None,
            )

            # Process request
            try:
                response = await call_next(request)
                duration_ms = int((time.time() - start_time) * 1000)

                # Log successful response
                logger.info(
                    "Request completed",
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                )

                # Add request ID to response headers
                response.headers["X-Request-ID"] = req_id

                return response

            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)

                # Log failed request
                logger.error(
                    "Request failed",
                    method=request.method,
                    path=request.url.path,
                    duration_ms=duration_ms,
                    error=str(e),
                    exc_info=True
                )
                raise


class AccessLogMiddleware(BaseHTTPMiddleware):
    """
    Simplified access log middleware (similar to Apache/Nginx access logs)
    Logs only essential information to access.log
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.access_logger = get_logger("access")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Log access information"""
        start_time = time.time()

        try:
            response = await call_next(request)
            duration_ms = int((time.time() - start_time) * 1000)

            # Simple access log format
            self.access_logger.info(
                "access",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=duration_ms,
                client=request.client.host if request.client else None,
            )

            return response

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)

            self.access_logger.error(
                "access_error",
                method=request.method,
                path=request.url.path,
                status=500,
                duration_ms=duration_ms,
                client=request.client.host if request.client else None,
                error=str(e)
            )
            raise
