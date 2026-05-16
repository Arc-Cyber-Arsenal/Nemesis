"""
Nuclei Parser - Parse nuclei JSON/JSONL output
"""
import json
from typing import List, Dict, Any
from .base_parser import BaseParser, ParsedItem, ParseResult, ItemType, ScanType


class NucleiParser(BaseParser):
    """Parser for nuclei JSON/JSONL output (-json or -jsonl flag)"""
    
    scan_type = ScanType.NUCLEI
    
    def can_parse(self, content: bytes, filename: str) -> bool:
        """Check if content is nuclei JSON output"""
        try:
            text = content.decode('utf-8', errors='ignore').strip()
            
            # Must be JSON file
            if not filename.lower().endswith('.json') and not filename.lower().endswith('.jsonl'):
                return False
            
            # Try to parse first line (JSONL) or whole content (JSON array)
            lines = text.split('\n')
            first_line = lines[0].strip()
            
            if first_line.startswith('['):
                # JSON array format
                data = json.loads(text)
                if isinstance(data, list) and len(data) > 0:
                    return self._is_nuclei_result(data[0])
            elif first_line.startswith('{'):
                # JSONL format - check first line
                data = json.loads(first_line)
                return self._is_nuclei_result(data)
            
            return False
        except Exception:
            return False
    
    def _is_nuclei_result(self, obj: Dict) -> bool:
        """Check if object looks like a nuclei result"""
        # Nuclei results have specific fields
        nuclei_fields = ['template-id', 'template', 'info', 'host', 'matched-at']
        # Also check for newer nuclei format
        nuclei_fields_alt = ['templateID', 'template', 'info', 'host', 'matchedAt']
        
        has_nuclei_fields = any(f in obj for f in nuclei_fields)
        has_nuclei_fields_alt = any(f in obj for f in nuclei_fields_alt)
        
        return has_nuclei_fields or has_nuclei_fields_alt
    
    def parse(self, content: bytes, filename: str) -> ParseResult:
        """Parse nuclei JSON/JSONL content"""
        items: List[ParsedItem] = []
        stats = {"findings": 0, "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        
        try:
            text = content.decode('utf-8', errors='ignore').strip()
            results = []
            
            # Detect format
            if text.startswith('['):
                # JSON array
                results = json.loads(text)
            else:
                # JSONL - one JSON object per line
                for line in text.split('\n'):
                    line = line.strip()
                    if line and line.startswith('{'):
                        try:
                            results.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
            
            # Process each result
            for result in results:
                item = self._parse_nuclei_result(result, filename)
                if item:
                    items.append(item)
                    stats["findings"] += 1
                    
                    # Count by severity
                    severity = (item.severity or "INFO").upper()
                    if severity == "CRITICAL":
                        stats["critical"] += 1
                    elif severity == "HIGH":
                        stats["high"] += 1
                    elif severity == "MEDIUM":
                        stats["medium"] += 1
                    elif severity == "LOW":
                        stats["low"] += 1
                    else:
                        stats["info"] += 1
            
            return ParseResult(
                success=True,
                scan_type=ScanType.NUCLEI,
                filename=filename,
                items=items,
                stats=stats
            )
            
        except json.JSONDecodeError as e:
            return ParseResult(
                success=False,
                scan_type=ScanType.NUCLEI,
                filename=filename,
                error=f"Invalid JSON format: {str(e)}"
            )
        except Exception as e:
            return ParseResult(
                success=False,
                scan_type=ScanType.NUCLEI,
                filename=filename,
                error=f"Parse error: {str(e)}"
            )
    
    def _parse_nuclei_result(self, result: Dict, filename: str) -> ParsedItem:
        """Parse a single nuclei result object"""
        # Handle both old and new nuclei output formats
        template_id = result.get('template-id') or result.get('templateID') or result.get('template', '')
        host = result.get('host', '')
        matched_at = result.get('matched-at') or result.get('matchedAt') or host
        
        # Get info block
        info = result.get('info', {})
        name = info.get('name', template_id)
        severity = info.get('severity', 'info').upper()
        description = info.get('description', '')
        tags = info.get('tags', [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(',')]
        
        # Get additional details
        matcher_name = result.get('matcher-name') or result.get('matcherName')
        extracted_results = result.get('extracted-results') or result.get('extractedResults', [])
        curl_command = result.get('curl-command') or result.get('curlCommand')
        
        # Build display name
        display_name = f"{name}"
        if matched_at and matched_at != host:
            display_name = f"{name} - {matched_at}"
        
        # Build dedup key: template + target
        dedup_key = f"nuclei:{template_id}:{host}"
        
        # Map severity
        severity_map = {
            'CRITICAL': 'CRITICAL',
            'HIGH': 'HIGH', 
            'MEDIUM': 'MEDIUM',
            'LOW': 'LOW',
            'INFO': 'INFO',
            'UNKNOWN': 'INFO'
        }
        mapped_severity = severity_map.get(severity, 'INFO')
        
        return ParsedItem(
            id=self._generate_id("nuclei", template_id, host, matched_at),
            item_type=ItemType.FINDING,
            name=display_name,
            source=ScanType.NUCLEI,
            source_file=filename,
            dedup_key=dedup_key,
            severity=mapped_severity,
            details={
                "template_id": template_id,
                "host": host,
                "matched_at": matched_at,
                "description": description,
                "tags": tags,
                "matcher_name": matcher_name,
                "extracted_results": extracted_results[:5] if extracted_results else None,
                "curl_command": curl_command,
                "severity": mapped_severity
            }
        )
