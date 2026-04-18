from __future__ import annotations

import uuid
from fastapi import APIRouter
from pydantic import BaseModel

from services.dedup import DedupService

router = APIRouter()

jobs: dict[str, DedupService] = {}


class ScanRequest(BaseModel):
    directory: str
    sensitivity: int = 50


class CleanupRequest(BaseModel):
    jobId: str
    pathsToDelete: list[str]


@router.post("/scan")
async def scan(req: ScanRequest):
    job_id = str(uuid.uuid4())
    service = DedupService(req.directory, sensitivity=req.sensitivity)
    jobs[job_id] = service
    service.start()
    return {"jobId": job_id}


@router.get("/progress")
async def progress(jobId: str):
    service = jobs.get(jobId)
    if not service:
        return {"error": "Job not found"}
    return service.get_progress()


@router.get("/groups")
async def get_groups(jobId: str):
    service = jobs.get(jobId)
    if not service:
        return {"error": "Job not found"}

    groups = service.get_groups()
    total_duplicates = sum(len(g["photos"]) - 1 for g in groups)
    reclaimable = sum(
        sum(p["fileSize"] for i, p in enumerate(g["photos"]) if i != g["bestIndex"])
        for g in groups
    )

    return {
        "groups": groups,
        "totalDuplicates": total_duplicates,
        "reclaimableBytes": reclaimable,
    }


@router.post("/cleanup")
async def cleanup(req: CleanupRequest):
    service = jobs.get(req.jobId)
    if not service:
        return {"error": "Job not found"}

    result = service.execute_cleanup(req.pathsToDelete)
    return result
