"""
Context Documents API - Endpoints for managing user-provided context documents
"""
import asyncio
import io
import os
import re
import shlex
import tempfile
import zipfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from database import get_db
from models import Assessment
from models.platform_settings import PlatformSettings
from config import settings
from utils.logger import get_logger
from utils.tree_generator import generate_workspace_tree, get_context_files_list
from services.container_service import ContainerService

logger = get_logger(__name__)

router = APIRouter(prefix="/assessments", tags=["context_documents"])

# Allowed file extensions for regular context uploads
ALLOWED_EXTENSIONS = {
    '.pdf', '.txt', '.md', '.doc', '.docx', '.xlsx',
    '.json', '.yaml', '.yml', '.xml', '.ini', '.conf',
    '.png', '.jpg', '.jpeg', '.svg',
    '.zip', '.tar', '.gz',
    '.csv', '.log', '.html', '.htm',
    '.pem', '.crt'
}

# Fallback constants (overridden by DB platform_settings at request time)
_DEFAULT_FILE_MB  = 200
_DEFAULT_ZIP_MB   = 200
_DEFAULT_TOTAL_MB = 500


def _get_upload_limits(db: Session) -> tuple:
    """Read upload limits (in bytes) from PlatformSettings, fall back to settings/defaults."""
    def _mb(key: str, default_mb: int) -> int:
        row = db.query(PlatformSettings).filter(PlatformSettings.key == key).first()
        try:
            return int(row.value) * 1024 * 1024 if row else default_mb * 1024 * 1024
        except (ValueError, TypeError):
            return default_mb * 1024 * 1024

    return (
        _mb("max_context_file_size", _DEFAULT_FILE_MB),
        _mb("max_source_zip_size",   _DEFAULT_ZIP_MB),
        _DEFAULT_TOTAL_MB * 1024 * 1024,
    )


def _sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal attacks"""
    # Remove any directory components
    filename = os.path.basename(filename)
    
    # Remove potentially dangerous characters
    safe_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._- ')
    filename = ''.join(c if c in safe_chars else '_' for c in filename)
    
    # Ensure it has an extension
    if '.' not in filename:
        filename += '.txt'
    
    return filename


async def _get_context_path(assessment_id: int, db: Session) -> tuple[str, str]:
    """
    Get container name and context path for an assessment
    
    Returns:
        Tuple of (container_name, context_path)
    """
    # Load assessment
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    if not assessment.workspace_path:
        raise HTTPException(
            status_code=400,
            detail="Assessment has no workspace. Create one first."
        )
    
    # Get container name (from assessment or platform settings)
    container_name = assessment.container_name
    
    if not container_name:
        container_setting = db.query(PlatformSettings).filter(
            PlatformSettings.key == "container_name"
        ).first()
        container_name = container_setting.value if container_setting else settings.DEFAULT_CONTAINER_NAME
    
    context_path = f"{assessment.workspace_path}/context"
    
    return container_name, context_path


def _zip_contains_git(content: bytes) -> bool:
    """Peek inside a ZIP to check if it contains a .git/ directory (= source repo)."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            return any(
                name == ".git/" or name.startswith(".git/") or "/.git/" in name
                for name in zf.namelist()
            )
    except zipfile.BadZipFile:
        return False


def _sanitize_source_name(name: str) -> str:
    safe = re.sub(r'[^a-zA-Z0-9._\-]', '_', name)
    safe = safe.lstrip('.-')
    return (safe or "source")[:128]


async def _docker_exec_ctx(container: str, cmd: list, timeout: int = 120) -> tuple:
    proc = await asyncio.create_subprocess_exec(
        "docker", "exec", container, *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        raise
    return proc.returncode, out.decode(errors="replace"), err.decode(errors="replace")


@router.post("/{assessment_id}/context/upload", status_code=status.HTTP_201_CREATED)
async def upload_context_document(
    assessment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a context document.
    - Regular files → /context/ (unchanged behaviour)
    - ZIP containing .git/ → extract to /source/, strip .git (source code repo)
    """
    logger.info("Uploading context document", assessment_id=assessment_id, filename=file.filename)

    try:
        file_ext = os.path.splitext(file.filename or "")[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        content = await file.read()
        file_size = len(content)

        # ── Smart ZIP routing ───────────────────────────────────────────────
        if file_ext == ".zip" and _zip_contains_git(content):
            logger.info("ZIP contains .git — routing to /source/", assessment_id=assessment_id, filename=file.filename)
            return await _extract_source_zip(assessment_id, file.filename, content, db)

        # ── Regular context upload ──────────────────────────────────────────
        max_file_size, _, _ = _get_upload_limits(db)
        if file_size > max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size ({file_size/1024/1024:.2f}MB) exceeds limit ({max_file_size//1024//1024}MB)"
            )

        safe_filename = _sanitize_filename(file.filename)
        container_name, context_path = await _get_context_path(assessment_id, db)

        temp_file_path = f"/tmp/{safe_filename}"
        with open(temp_file_path, "wb") as f:
            f.write(content)

        try:
            container_service = ContainerService()
            container_service.current_container = container_name
            await container_service.execute_container_command(f"mkdir -p {context_path}")

            process = await asyncio.create_subprocess_exec(
                "docker", "cp", temp_file_path, f"{container_name}:{context_path}/{safe_filename}",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to copy file to container: {stderr.decode('utf-8', errors='replace')}"
                )

            logger.info("Context document uploaded", assessment_id=assessment_id, filename=safe_filename, size=file_size)
            return {
                "success": True,
                "routed_to": "context",
                "filename": safe_filename,
                "size": file_size,
                "size_human": f"{file_size/1024:.2f}KB" if file_size < 1024*1024 else f"{file_size/1024/1024:.2f}MB",
                "path": f"{context_path}/{safe_filename}"
            }
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to upload context document", assessment_id=assessment_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


async def _extract_source_zip(assessment_id: int, filename: str, content: bytes, db: Session) -> dict:
    """Extract a ZIP that contains a .git repo into /source/, stripping the .git metadata."""
    _, max_zip_size, _ = _get_upload_limits(db)
    if len(content) > max_zip_size:
        raise HTTPException(
            status_code=400,
            detail=f"ZIP too large ({len(content)/1024/1024:.1f}MB, max {max_zip_size//1024//1024}MB)"
        )

    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    container_name = assessment.container_name
    if not container_name:
        setting = db.query(PlatformSettings).filter(PlatformSettings.key == "container_name").first()
        container_name = setting.value if setting else settings.DEFAULT_CONTAINER_NAME

    dir_name = _sanitize_source_name(os.path.splitext(os.path.basename(filename or "source"))[0])
    container_source_dir = f"{assessment.workspace_path}/source"
    container_target = f"{container_source_dir}/{dir_name}"
    container_zip = f"{container_source_dir}/{dir_name}.zip"

    rc, _, _ = await _docker_exec_ctx(container_name, ["test", "-d", container_target], timeout=10)
    if rc == 0:
        raise HTTPException(status_code=409, detail=f"'{dir_name}' already exists in /source. Delete it first.")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        await _docker_exec_ctx(container_name, ["mkdir", "-p", container_source_dir], timeout=10)

        proc = await asyncio.create_subprocess_exec(
            "docker", "cp", tmp_path, f"{container_name}:{container_zip}",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        _, err = await asyncio.wait_for(proc.communicate(), timeout=120)
        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail=f"docker cp failed: {err.decode(errors='replace').strip()}")

        # Extract
        rc_uz, _, _ = await _docker_exec_ctx(container_name, ["which", "unzip"], timeout=5)
        if rc_uz == 0:
            rc, _, stderr = await _docker_exec_ctx(
                container_name, ["unzip", "-q", container_zip, "-d", container_target], timeout=120
            )
        else:
            rc, _, stderr = await _docker_exec_ctx(
                container_name,
                ["python3", "-c",
                 f"import zipfile,os; z=zipfile.ZipFile({shlex.quote(container_zip)}); os.makedirs({shlex.quote(container_target)},exist_ok=True); z.extractall({shlex.quote(container_target)}); z.close()"],
                timeout=120
            )

        await _docker_exec_ctx(container_name, ["rm", "-f", container_zip], timeout=10)

        if rc != 0:
            await _docker_exec_ctx(container_name, ["rm", "-rf", container_target], timeout=30)
            raise HTTPException(status_code=500, detail=f"Extraction failed: {stderr.strip()}")

        # Strip .git
        await _docker_exec_ctx(container_name, ["rm", "-rf", f"{container_target}/.git"], timeout=60)

        # Write metadata
        await _docker_exec_ctx(
            container_name,
            ["bash", "-c", f"printf 'type=zip\\n' > {shlex.quote(container_target + '/.source_meta')}"],
            timeout=5
        )

        logger.info("Source ZIP extracted from context upload", assessment_id=assessment_id, dir_name=dir_name)
        return {
            "success": True,
            "routed_to": "source",
            "name": dir_name,
            "type": "zip",
            "path": f"source/{dir_name}",
            "size": len(content),
            "size_human": f"{len(content)/1024/1024:.1f}MB"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)




@router.get("/{assessment_id}/context/files")
async def list_context_documents(
    assessment_id: int,
    db: Session = Depends(get_db)
):
    """
    List all context documents for an assessment
    
    Returns:
        List of files with metadata
    """
    logger.info("Listing context documents", assessment_id=assessment_id)
    
    try:
        # Get assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        if not assessment.workspace_path:
            return []
        
        # Get container name
        container_name, _ = await _get_context_path(assessment_id, db)
        
        # Get file list using tree generator utility
        files = await get_context_files_list(container_name, assessment.workspace_path)
        
        logger.info("Listed context documents", assessment_id=assessment_id, count=len(files))
        
        return files
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to list context documents", assessment_id=assessment_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{assessment_id}/context/{filename}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_context_document(
    assessment_id: int,
    filename: str,
    db: Session = Depends(get_db)
):
    """
    Delete a context document
    
    Args:
        assessment_id: ID of the assessment
        filename: Name of the file to delete
    """
    logger.info("Deleting context document", assessment_id=assessment_id, filename=filename)
    
    try:
        # Sanitize filename to prevent path traversal
        safe_filename = _sanitize_filename(filename)
        
        # Get context path
        container_name, context_path = await _get_context_path(assessment_id, db)
        
        # Delete file in container
        container_service = ContainerService()
        container_service.current_container = container_name
        
        result = await container_service.execute_container_command(
            f"rm -f {context_path}/{safe_filename}"
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete file: {result.get('stderr', 'Unknown error')}"
            )
        
        logger.info("Context document deleted", assessment_id=assessment_id, filename=safe_filename)
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete context document", assessment_id=assessment_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assessment_id}/context/tree")
async def get_workspace_tree(
    assessment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get workspace tree structure
    
    Returns:
        ASCII tree structure of the workspace
    """
    logger.info("Generating workspace tree", assessment_id=assessment_id)
    
    try:
        # Get assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        if not assessment.workspace_path:
            return {"tree": "Workspace not created yet"}
        
        # Get container name
        container_name, _ = await _get_context_path(assessment_id, db)
        
        # Generate tree
        tree_text = await generate_workspace_tree(
            container_name=container_name,
            workspace_path=assessment.workspace_path,
            max_depth=2
        )
        
        logger.info("Generated workspace tree", assessment_id=assessment_id)
        
        return {
            "tree": tree_text,
            "workspace_path": assessment.workspace_path
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to generate workspace tree", assessment_id=assessment_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assessment_id}/markdown/files")
async def list_markdown_files(
    assessment_id: int,
    db: Session = Depends(get_db)
):
    """
    List all markdown (.md) files in the assessment workspace
    
    Returns:
        List of markdown files with metadata (filename, path, size, modified)
    """
    logger.info("Listing markdown files", assessment_id=assessment_id)
    
    try:
        # Get assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        if not assessment.workspace_path:
            return []
        
        # Get container name
        container_name = assessment.container_name
        
        if not container_name:
            container_setting = db.query(PlatformSettings).filter(
                PlatformSettings.key == "container_name"
            ).first()
            container_name = container_setting.value if container_setting else settings.DEFAULT_CONTAINER_NAME
        
        # Search for .md files in all workspace folders
        workspace_folders = ['recon', 'exploits', 'loot', 'notes', 'scripts', 'context']
        markdown_files = []
        
        container_service = ContainerService()
        container_service.current_container = container_name
        
        for folder in workspace_folders:
            folder_path = f"{assessment.workspace_path}/{folder}"
            
            # CRITICAL FIX: Use -maxdepth to avoid recursing into subdirectories of other assessments
            # and verify the file actually belongs to THIS workspace
            find_cmd = f"find {folder_path} -maxdepth 2 -name '*.md' -type f 2>/dev/null || true"
            result = await container_service.execute_container_command(find_cmd)
            
            if result.get('success') and result.get('stdout'):
                files = result['stdout'].strip().split('\n')
                
                for file_path in files:
                    if not file_path or file_path.isspace():
                        continue
                    
                    # CRITICAL: Verify file is actually from THIS assessment workspace
                    if not file_path.startswith(assessment.workspace_path):
                        logger.warning(f"Skipping file outside workspace: {file_path}")
                        continue
                    
                    # Get file metadata
                    stat_cmd = f"stat -c '%s %Y' {file_path} 2>/dev/null || stat -f '%z %m' {file_path} 2>/dev/null"
                    stat_result = await container_service.execute_container_command(stat_cmd)
                    
                    size = 0
                    modified = None
                    
                    if stat_result.get('success') and stat_result.get('stdout'):
                        parts = stat_result['stdout'].strip().split()
                        if len(parts) >= 2:
                            size = int(parts[0])
                            modified = int(parts[1])
                    
                    # Compute relative path from workspace
                    relative_path = file_path.replace(assessment.workspace_path + '/', '')
                    filename = os.path.basename(file_path)
                    
                    markdown_files.append({
                        "filename": filename,
                        "path": relative_path,
                        "size": size,
                        "size_human": f"{size / 1024:.2f}KB" if size < 1024 * 1024 else f"{size / 1024 / 1024:.2f}MB",
                        "modified": modified,
                        "folder": folder
                    })
        
        logger.info("Listed markdown files", assessment_id=assessment_id, count=len(markdown_files))
        
        return markdown_files
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to list markdown files", assessment_id=assessment_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assessment_id}/markdown/content")
async def get_markdown_content(
    assessment_id: int,
    path: str,
    db: Session = Depends(get_db)
):
    """
    Get content of a specific markdown file
    
    Args:
        assessment_id: ID of the assessment
        path: Relative path to the markdown file from workspace root
        
    Returns:
        Dict with filename, content, and path
    """
    logger.info("Getting markdown content", assessment_id=assessment_id, path=path)
    
    try:
        # Validate path (prevent directory traversal)
        if '..' in path or path.startswith('/'):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        if not path.endswith('.md'):
            raise HTTPException(status_code=400, detail="Only markdown (.md) files are allowed")
        
        # Get assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        if not assessment.workspace_path:
            raise HTTPException(status_code=400, detail="Assessment has no workspace")
        
        # Get container name
        container_name = assessment.container_name
        
        if not container_name:
            container_setting = db.query(PlatformSettings).filter(
                PlatformSettings.key == "container_name"
            ).first()
            container_name = container_setting.value if container_setting else settings.DEFAULT_CONTAINER_NAME
        
        # Construct full path
        full_path = f"{assessment.workspace_path}/{path}"
        
        # Read file content
        container_service = ContainerService()
        container_service.current_container = container_name
        
        # Check if file exists
        check_cmd = f"test -f {full_path} && echo 'exists'"
        check_result = await container_service.execute_container_command(check_cmd)
        
        if not check_result.get('success') or 'exists' not in check_result.get('stdout', ''):
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        
        # Read file
        read_cmd = f"cat {full_path}"
        result = await container_service.execute_container_command(read_cmd)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=500,
                detail=f"Failed to read file: {result.get('stderr', 'Unknown error')}"
            )
        
        content = result.get('stdout', '')
        filename = os.path.basename(path)
        
        logger.info(
            "Retrieved markdown content",
            assessment_id=assessment_id,
            filename=filename,
            size=len(content)
        )
        
        return {
            "filename": filename,
            "path": path,
            "content": content
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get markdown content", assessment_id=assessment_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
