"""
Base Parser - Abstract base class for all scan parsers
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum


class ItemType(str, Enum):
    """Types of items that can be parsed from scans"""
    SERVICE = "service"      # From nmap: host:port/service
    ENDPOINT = "endpoint"    # From ffuf: discovered URLs
    FINDING = "finding"      # From nuclei: vulnerabilities
    TECHNOLOGY = "technology"  # Tech stack detection
    HOST = "host"            # Discovered hosts


class ScanType(str, Enum):
    """Supported scan types"""
    NMAP = "nmap"
    NUCLEI = "nuclei"
    FFUF = "ffuf"
    UNKNOWN = "unknown"


@dataclass
class ParsedItem:
    """A single parsed item from a scan"""
    id: str                          # Unique ID for frontend tracking
    item_type: ItemType              # Type of item
    name: str                        # Display name
    source: ScanType                 # Which tool produced this
    source_file: str                 # Original filename
    dedup_key: str                   # Key for deduplication
    is_duplicate: bool = False       # True if already exists in DB
    severity: Optional[str] = None   # For findings: CRITICAL/HIGH/MEDIUM/LOW/INFO
    details: Dict[str, Any] = field(default_factory=dict)  # Additional data
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "item_type": self.item_type.value,
            "name": self.name,
            "source": self.source.value,
            "source_file": self.source_file,
            "dedup_key": self.dedup_key,
            "is_duplicate": self.is_duplicate,
            "severity": self.severity,
            "details": self.details
        }


@dataclass
class ParseResult:
    """Result of parsing a scan file"""
    success: bool
    scan_type: ScanType
    filename: str
    items: List[ParsedItem] = field(default_factory=list)
    error: Optional[str] = None
    stats: Dict[str, int] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "success": self.success,
            "scan_type": self.scan_type.value,
            "filename": self.filename,
            "items": [item.to_dict() for item in self.items],
            "error": self.error,
            "stats": self.stats
        }


class BaseParser(ABC):
    """Abstract base class for scan parsers"""
    
    scan_type: ScanType = ScanType.UNKNOWN
    
    @abstractmethod
    def can_parse(self, content: bytes, filename: str) -> bool:
        """
        Check if this parser can handle the given content
        
        Args:
            content: Raw file content
            filename: Original filename
            
        Returns:
            True if this parser can handle the file
        """
        pass
    
    @abstractmethod
    def parse(self, content: bytes, filename: str) -> ParseResult:
        """
        Parse the scan file content
        
        Args:
            content: Raw file content
            filename: Original filename
            
        Returns:
            ParseResult with parsed items
        """
        pass
    
    def _generate_id(self, prefix: str, *parts) -> str:
        """Generate a unique ID for an item"""
        import hashlib
        key = ":".join(str(p) for p in parts)
        hash_suffix = hashlib.md5(key.encode()).hexdigest()[:8]
        return f"{prefix}_{hash_suffix}"
