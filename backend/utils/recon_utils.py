"""
Recon Data utilities for normalization and validation
"""
import re


def normalize_data_type(data_type: str) -> str:
    """
    Normalize data_type to lowercase snake_case

    Examples:
        "Endpoint" -> "endpoint"
        "API Endpoint" -> "api_endpoint"
        "Database-Table" -> "database_table"
        "web service" -> "web_service"

    Args:
        data_type: Raw data type string

    Returns:
        Normalized lowercase snake_case string
    """
    if not data_type:
        return ""

    # Convert to lowercase
    normalized = data_type.lower().strip()

    # Replace spaces, hyphens, and multiple underscores with single underscore
    normalized = re.sub(r'[\s\-]+', '_', normalized)

    # Remove any non-alphanumeric characters except underscores
    normalized = re.sub(r'[^a-z0-9_]', '', normalized)

    # Remove leading/trailing underscores
    normalized = normalized.strip('_')

    # Collapse multiple underscores
    normalized = re.sub(r'_+', '_', normalized)

    return normalized


# Recommended categories for consistency (not enforced)
RECOMMENDED_CATEGORIES = [
    "endpoint",
    "subdomain",
    "service",
    "technology",
    "database",
    "credential",
    "port",
    "vulnerability"
]
