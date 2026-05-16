"""
Source Code API - Import source code via Git clone or ZIP upload
Stores source code in /source/ within the assessment workspace.

Architecture:
- ALL operations on the workspace run via `docker exec` into the Exegol container
  because the backend container has no access to ~/.exegol/workspaces/ (not mounted).
- Only ZIP upload uses a host tmpfile, then copies it into the container with docker cp.
- The backend talks to Docker via the docker-proxy (DOCKER_HOST), not the workspace volume.
"""
import asyncio
import os
import re
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Assessment
from models.platform_settings import PlatformSettings
from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/assessments", tags=["source_code"])

MAX_ZIP_SIZE = 200 * 1024 * 1024  # 200MB
ALLOWED_GIT_SCHEMES = ("https://", "http://", "git://")
FORBIDDEN_URL_CHARS = re.compile(r'[;&|`$<>()\\\'"{}]')


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CloneRequest(BaseModel):
    url: str
    branch: Optional[str] = None
    shallow: bool = False


class BranchDetectRequest(BaseModel):
    url: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _validate_git_url(url: str) -> str:
    url = url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Git URL is required")
    if not any(url.startswith(s) for s in ALLOWED_GIT_SCHEMES):
        raise HTTPException(status_code=400, detail="Only HTTPS/HTTP/git URLs are supported.")
    if FORBIDDEN_URL_CHARS.search(url):
        raise HTTPException(status_code=400, detail="Git URL contains forbidden characters")
    return url


def _sanitize_dir_name(name: str) -> str:
    safe = re.sub(r'[^a-zA-Z0-9._\-]', '_', name)
    safe = safe.lstrip('.-')
    return (safe or "source")[:128]


def _get_assessment(assessment_id: int, db: Session) -> tuple:
    """Returns (assessment, container_name). No async needed — no docker inspect."""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if not assessment.workspace_path:
        raise HTTPException(status_code=400, detail="Assessment has no workspace. Create one first.")

    container_name = assessment.container_name
    if not container_name:
        setting = db.query(PlatformSettings).filter(PlatformSettings.key == "container_name").first()
        container_name = setting.value if setting else settings.DEFAULT_CONTAINER_NAME

    return assessment, container_name


async def _docker_exec(container: str, cmd: list, timeout: int = 60) -> tuple:
    """
    Run a command inside the Exegol container via docker exec.
    Non-blocking — asyncio subprocess, won't freeze FastAPI.
    Returns (returncode, stdout, stderr).
    """
    proc = await asyncio.create_subprocess_exec(
        "docker", "exec", container, *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        raise
    return proc.returncode, stdout.decode(errors="replace"), stderr.decode(errors="replace")


async def _docker_cp_to_container(container: str, host_src: str, container_dst: str) -> None:
    """Copy a file from host into the container via docker cp."""
    proc = await asyncio.create_subprocess_exec(
        "docker", "cp", host_src, f"{container}:{container_dst}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
    if proc.returncode != 0:
        raise RuntimeError(f"docker cp failed: {stderr.decode(errors='replace').strip()}")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/{assessment_id}/source/branches")
async def detect_branches(
    assessment_id: int,
    body: BranchDetectRequest,
    db: Session = Depends(get_db)
):
    """Detect branches via git ls-remote inside the Exegol container."""
    url = _validate_git_url(body.url)
    logger.info("Detecting branches", assessment_id=assessment_id, url=url)

    _, container = _get_assessment(assessment_id, db)

    try:
        rc, stdout, stderr = await _docker_exec(
            container, ["git", "ls-remote", "--heads", url], timeout=30
        )
        if rc != 0:
            raise HTTPException(status_code=400, detail=f"Failed to reach repository: {stderr.strip() or 'Unknown error'}")

        branches = [
            line.split("\t")[1].replace("refs/heads/", "")
            for line in stdout.strip().splitlines()
            if "\t" in line and line.split("\t")[1].startswith("refs/heads/")
        ]
        logger.info("Detected branches", url=url, count=len(branches))
        return {"branches": branches, "url": url}

    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Branch detection timed out (30s)")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Branch detection failed", url=url, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{assessment_id}/source/clone", status_code=status.HTTP_201_CREATED)
async def clone_repository(
    assessment_id: int,
    body: CloneRequest,
    db: Session = Depends(get_db)
):
    """
    Clone a Git repository into /workspace/{assessment}/source/{repo}.
    Runs entirely inside the Exegol container via docker exec.
    """
    url = _validate_git_url(body.url)
    branch = body.branch.strip() if body.branch else None
    shallow = body.shallow
    logger.info("Cloning repository", assessment_id=assessment_id, url=url, branch=branch, shallow=shallow)

    assessment, container = _get_assessment(assessment_id, db)

    # Derive repo name
    repo_name = url.rstrip("/").split("/")[-1]
    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]
    repo_name = _sanitize_dir_name(repo_name)

    container_source_dir = f"{assessment.workspace_path}/source"
    container_target = f"{container_source_dir}/{repo_name}"

    # Check if target already exists
    rc, _, _ = await _docker_exec(container, ["test", "-d", container_target], timeout=10)
    if rc == 0:
        raise HTTPException(status_code=409, detail=f"'{repo_name}' already exists in /source. Delete it first.")

    # Ensure /source dir exists
    await _docker_exec(container, ["mkdir", "-p", container_source_dir], timeout=10)

    # Build git clone command
    cmd = ["git", "clone"]
    if shallow:
        cmd += ["--depth", "1"]
    if branch:
        cmd += ["--branch", branch, "--single-branch"]
    cmd += [url, container_target]

    try:
        rc, stdout, stderr = await _docker_exec(container, cmd, timeout=600)
        if rc != 0:
            # Clean up partial clone
            await _docker_exec(container, ["rm", "-rf", container_target], timeout=30)
            error = stderr.strip() or stdout.strip() or "Unknown error"
            raise HTTPException(status_code=400, detail=f"Git clone failed: {error}")

        # Resolve actual branch from HEAD (in case no branch was specified)
        actual_branch = branch
        if not actual_branch:
            rc_h, head_out, _ = await _docker_exec(
                container, ["cat", f"{container_target}/.git/HEAD"], timeout=5
            )
            if rc_h == 0 and "refs/heads/" in head_out:
                actual_branch = head_out.strip().replace("ref: refs/heads/", "")

        # Remove .git — keep ONLY source files in the workspace
        await _docker_exec(container, ["rm", "-rf", f"{container_target}/.git"], timeout=60)

        # Write a small metadata file so list can show branch/url info
        meta = f"url={url}\nbranch={actual_branch or ''}\ntype=git\n"
        await _docker_exec(
            container,
            ["bash", "-c", f"printf '{meta}' > {container_target}/.source_meta"],
            timeout=5
        )

        logger.info("Repository cloned", assessment_id=assessment_id, repo=repo_name, branch=actual_branch)
        return {
            "success": True,
            "name": repo_name,
            "type": "git",
            "branch": actual_branch or "default",
            "url": url,
            "path": f"source/{repo_name}",
        }

    except asyncio.TimeoutError:
        await _docker_exec(container, ["rm", "-rf", container_target], timeout=30)
        raise HTTPException(status_code=408, detail="Git clone timed out (10 minutes)")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Clone failed", assessment_id=assessment_id, url=url, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{assessment_id}/source/upload-zip", status_code=status.HTTP_201_CREATED)
async def upload_source_zip(
    assessment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a ZIP file and extract it into /workspace/{assessment}/source/{name}.
    Uses docker cp to transfer the file, then unzip inside the container.
    """
    logger.info("Uploading source ZIP", assessment_id=assessment_id, filename=file.filename)

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    content = await file.read()
    file_size = len(content)
    if file_size > MAX_ZIP_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"ZIP too large ({file_size/1024/1024:.1f}MB, max {MAX_ZIP_SIZE/1024/1024:.0f}MB)"
        )

    assessment, container = _get_assessment(assessment_id, db)

    dir_name = _sanitize_dir_name(os.path.splitext(os.path.basename(file.filename))[0])
    container_source_dir = f"{assessment.workspace_path}/source"
    container_target = f"{container_source_dir}/{dir_name}"
    container_zip = f"{container_source_dir}/{dir_name}.zip"

    # Check if target already exists
    rc, _, _ = await _docker_exec(container, ["test", "-d", container_target], timeout=10)
    if rc == 0:
        raise HTTPException(status_code=409, detail=f"'{dir_name}' already exists in /source. Delete it first.")

    # Write ZIP to a temp file on the host, then docker cp into container
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # Ensure /source dir exists
        await _docker_exec(container, ["mkdir", "-p", container_source_dir], timeout=10)

        # Copy ZIP into container
        await _docker_cp_to_container(container, tmp_path, container_zip)

        # Extract inside container — check for unzip first, fallback to python
        rc_uz, _, _ = await _docker_exec(container, ["which", "unzip"], timeout=5)
        if rc_uz == 0:
            rc, stdout, stderr = await _docker_exec(
                container,
                ["unzip", "-q", container_zip, "-d", container_target],
                timeout=120
            )
        else:
            rc, stdout, stderr = await _docker_exec(
                container,
                ["python3", "-c",
                 f"import zipfile,os; z=zipfile.ZipFile('{container_zip}'); os.makedirs('{container_target}',exist_ok=True); z.extractall('{container_target}'); z.close()"],
                timeout=120
            )

        # Remove the ZIP file from container
        await _docker_exec(container, ["rm", "-f", container_zip], timeout=10)

        if rc != 0:
            await _docker_exec(container, ["rm", "-rf", container_target], timeout=30)
            raise HTTPException(status_code=500, detail=f"Extraction failed: {stderr.strip() or 'Unknown error'}")

        logger.info("ZIP extracted", assessment_id=assessment_id, dir_name=dir_name, size=file_size)
        return {
            "success": True,
            "name": dir_name,
            "type": "zip",
            "path": f"source/{dir_name}",
            "size": file_size,
            "size_human": f"{file_size/1024/1024:.1f}MB"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("ZIP upload failed", assessment_id=assessment_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.get("/{assessment_id}/source/list")
async def list_source_code(assessment_id: int, db: Session = Depends(get_db)):
    """
    List source code directories in /workspace/{assessment}/source/.
    Uses docker exec to ls inside the container (backend has no workspace volume).
    """
    logger.info("Listing source code", assessment_id=assessment_id)

    assessment, container = _get_assessment(assessment_id, db)
    container_source_dir = f"{assessment.workspace_path}/source"

    try:
        # Check if /source exists
        rc, _, _ = await _docker_exec(container, ["test", "-d", container_source_dir], timeout=10)
        if rc != 0:
            return []

        # List subdirectories only
        rc, stdout, stderr = await _docker_exec(
            container,
            ["find", container_source_dir, "-maxdepth", "1", "-mindepth", "1", "-type", "d"],
            timeout=15
        )
        if rc != 0:
            return []

        entries = []
        dirs = [line.strip() for line in stdout.strip().splitlines() if line.strip()]

        for dir_path in dirs:
            dir_name = os.path.basename(dir_path)

            # Detect type: check .source_meta first (new clones), then fallback to .git (legacy)
            branch = None
            origin_url = None
            entry_type = "zip"

            rc_meta, meta_out, _ = await _docker_exec(
                container, ["cat", f"{dir_path}/.source_meta"], timeout=5
            )
            if rc_meta == 0 and meta_out.strip():
                # Parse .source_meta
                for line in meta_out.strip().splitlines():
                    if line.startswith("url="):
                        origin_url = line[4:].strip()
                    elif line.startswith("branch=") and line[7:].strip():
                        branch = line[7:].strip()
                    elif line.startswith("type="):
                        entry_type = line[5:].strip()
            else:
                # Fallback: repo cloned before .source_meta was introduced
                rc_git, _, _ = await _docker_exec(
                    container, ["test", "-d", f"{dir_path}/.git"], timeout=5
                )
                if rc_git == 0:
                    entry_type = "git"
                    rc_b, head, _ = await _docker_exec(
                        container, ["cat", f"{dir_path}/.git/HEAD"], timeout=5
                    )
                    if rc_b == 0 and "refs/heads/" in head:
                        branch = head.strip().replace("ref: refs/heads/", "")

            # Compute human-readable size
            rc_du, du_out, _ = await _docker_exec(
                container, ["du", "-sh", dir_path], timeout=15
            )
            size_human = du_out.split("\t")[0].strip() if rc_du == 0 and du_out else "?"

            entries.append({
                "name": dir_name,
                "type": entry_type,
                "branch": branch,
                "url": origin_url,
                "size_human": size_human,
                "path": f"source/{dir_name}",
            })

        entries.sort(key=lambda x: x["name"])
        logger.info("Listed source code", assessment_id=assessment_id, count=len(entries))
        return entries

    except Exception as e:
        logger.error("List failed", assessment_id=assessment_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{assessment_id}/source/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source_code(assessment_id: int, name: str, db: Session = Depends(get_db)):
    """Delete a source code directory via docker exec rm -rf."""
    logger.info("Deleting source code", assessment_id=assessment_id, name=name)

    safe_name = _sanitize_dir_name(name)
    if safe_name != name or "/" in name or ".." in name:
        raise HTTPException(status_code=400, detail="Invalid directory name")

    assessment, container = _get_assessment(assessment_id, db)
    container_target = f"{assessment.workspace_path}/source/{safe_name}"

    try:
        rc, _, _ = await _docker_exec(container, ["test", "-d", container_target], timeout=10)
        if rc != 0:
            raise HTTPException(status_code=404, detail=f"'{safe_name}' not found in /source")

        rc, _, stderr = await _docker_exec(container, ["rm", "-rf", container_target], timeout=60)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Delete failed: {stderr.strip()}")

        logger.info("Deleted", assessment_id=assessment_id, name=safe_name)
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Delete failed", assessment_id=assessment_id, name=name, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
