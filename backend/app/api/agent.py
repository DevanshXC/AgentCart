from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.config import get_settings
from app.agents.schemas import AgentChatRequest, AgentChatResponse, AgentHealthResponse
from app.agents.ollama_client import OllamaProvider
from app.agents.orchestrator import AgentOrchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agent", tags=["agent"])

@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(request: AgentChatRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    provider = OllamaProvider(base_url=settings.ollama_base_url)
    
    # Fast-fail if Ollama is down before starting a session
    is_healthy = await provider.health()
    if not is_healthy:
        raise HTTPException(status_code=503, detail="The local AI service is unavailable. Start Ollama and try again.")

    orchestrator = AgentOrchestrator(provider=provider, model=settings.ollama_model)
    
    try:
        response = await orchestrator.run(message=request.message, db=db, session_id=request.session_id)
        return response
    except Exception as e:
        logger.error(f"Agent chat failed: {e}")
        # Return a graceful fallback if something catastrophic happens outside the orchestrator loop
        raise HTTPException(status_code=500, detail="Internal agent error")

@router.get("/health", response_model=AgentHealthResponse)
async def agent_health():
    settings = get_settings()
    provider = OllamaProvider(base_url=settings.ollama_base_url)
    
    is_healthy = await provider.health()
    if is_healthy:
        return AgentHealthResponse(status="ok", provider="ollama", model=settings.ollama_model)
    else:
        raise HTTPException(status_code=503, detail="Ollama unavailable")
