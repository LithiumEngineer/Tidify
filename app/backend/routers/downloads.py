from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services.classifier import ClassifierService

router = APIRouter()

jobs: dict[str, ClassifierService] = {}


class ScanRequest(BaseModel):
    directory: Optional[str] = None


class ExecuteRequest(BaseModel):
    jobId: str
    approvedIds: List[str]


class UndoRequest(BaseModel):
    jobId: str


@router.post("/scan")
async def scan(req: ScanRequest):
    job_id = str(uuid.uuid4())
    directory = req.directory or "~/Downloads"
    service = ClassifierService(directory)
    jobs[job_id] = service
    await service.scan_and_classify()
    return {"jobId": job_id}


@router.get("/plan")
async def get_plan(jobId: str):
    service = jobs.get(jobId)
    if not service:
        return {"error": "Job not found"}
    return service.get_plan()


@router.post("/execute")
async def execute(req: ExecuteRequest):
    service = jobs.get(req.jobId)
    if not service:
        return {"error": "Job not found"}
    return service.execute(req.approvedIds)


@router.post("/undo")
async def undo(req: UndoRequest):
    service = jobs.get(req.jobId)
    if not service:
        return {"error": "Job not found"}
    return service.undo()
