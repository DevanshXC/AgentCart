from pydantic import BaseModel, Field
from typing import Optional, Any
from app.schemas.product import ProductResponse

class AgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class IntentPayload(BaseModel):
    category: Optional[str] = None
    max_price: Optional[int] = None
    requirements: list[str] = Field(default_factory=list)

class AgentChatResponse(BaseModel):
    message: str
    intent: IntentPayload
    recommended_product_id: Optional[str] = None
    product_ids: list[str] = Field(default_factory=list)
    match_reasons: list[str] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    products: list[ProductResponse] = Field(default_factory=list)

class AgentHealthResponse(BaseModel):
    status: str
    provider: str
    model: str
