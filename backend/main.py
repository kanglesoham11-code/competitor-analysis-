from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import asyncio
from typing import Optional
from agents import run_intelligence_pipeline
from storage import task_store

app = FastAPI(title="Competitor Intelligence Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class IntelRequest(BaseModel):
    your_company: str
    competitor: str
    competitor_url: Optional[str] = ""
    groq_api_key: str

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

@app.post("/api/analyze")
async def analyze(body: IntelRequest):
    if not body.competitor.strip():
        raise HTTPException(status_code=400, detail="Competitor name is required")
    if not body.groq_api_key.strip():
        raise HTTPException(status_code=400, detail="Groq API key is required")

    task_id = str(uuid.uuid4())
    task_store[task_id] = {
        "status":  "running",
        "agents": {
            "scraper":    {"status": "pending", "message": "Waiting to start..."},
            "analyst":    {"status": "pending", "message": "Waiting to start..."},
            "strategist": {"status": "pending", "message": "Waiting to start..."},
            "battlecard": {"status": "pending", "message": "Waiting to start..."},
        },
        "report":  None,
        "sources": {},
        "error":   None,
    }

    asyncio.create_task(run_intelligence_pipeline(
        task_id,
        body.your_company,
        body.competitor,
        body.competitor_url or "",
        body.groq_api_key,
    ))
    return {"task_id": task_id}

@app.get("/api/status/{task_id}")
def get_status(task_id: str):
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task