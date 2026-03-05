import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Job:
    id: str
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
            "progress": self.progress,
        }


class JobManager:
    def __init__(self):
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()

    def create_job(self) -> Job:
        job_id = str(uuid.uuid4())
        job = Job(id=job_id)
        with self._lock:
            self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                return Job(
                    id=job.id,
                    status=job.status,
                    created_at=job.created_at,
                    started_at=job.started_at,
                    completed_at=job.completed_at,
                    result=job.result,
                    error=job.error,
                    progress=job.progress,
                )
            return None

    def update_status(self, job_id: str, status: JobStatus, progress: str = ""):
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.status = status
                job.progress = progress
                if status == JobStatus.RUNNING and job.started_at is None:
                    job.started_at = datetime.utcnow()

    def complete_job(self, job_id: str, result: Dict[str, Any]):
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.utcnow()
                job.result = result
                job.progress = "Completed"

    def fail_job(self, job_id: str, error: str):
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.status = JobStatus.FAILED
                job.completed_at = datetime.utcnow()
                job.error = error
                job.progress = "Failed"


job_manager = JobManager()
