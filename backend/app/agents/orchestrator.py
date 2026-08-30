import json
import logging
import uuid
from typing import Optional
from sqlalchemy.orm import Session

from app.agents.schemas import AgentChatResponse, IntentPayload
from app.agents.prompts import SYSTEM_PROMPT
from app.agents.ollama_client import LLMProvider
from app.agents.tools import TOOL_REGISTRY, get_product

logger = logging.getLogger(__name__)

# Bounded in-memory session store: session_id -> list of messages
MAX_SESSIONS = 1000
MAX_HISTORY_PER_SESSION = 20
_sessions: dict[str, list[dict]] = {}

class AgentOrchestrator:
    def __init__(self, provider: LLMProvider, model: str = "qwen2.5:7b", max_tool_calls: int = 6):
        self.provider = provider
        self.model = model
        self.max_tool_calls = max_tool_calls

    def _get_or_create_session(self, session_id: Optional[str]) -> tuple[str, list[dict]]:
        if not session_id or session_id not in _sessions:
            session_id = str(uuid.uuid4())
            # Evict if unbounded
            if len(_sessions) >= MAX_SESSIONS:
                # Naive eviction: remove arbitrary session
                _sessions.pop(next(iter(_sessions)))
            _sessions[session_id] = [{"role": "system", "content": SYSTEM_PROMPT}]
            logger.info(f"SESSION_STARTED: {session_id}")
        return session_id, _sessions[session_id]

    def _save_session(self, session_id: str, history: list[dict]):
        # Keep bounded length, preserve system prompt at index 0
        if len(history) > MAX_HISTORY_PER_SESSION:
            history = [history[0]] + history[-(MAX_HISTORY_PER_SESSION - 1):]
        _sessions[session_id] = history

    def _extract_json_block(self, text: str) -> Optional[dict]:
        """Attempt to extract and parse a JSON block from the LLM output."""
        try:
            # First try direct parsing (in case the model output pure JSON)
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass

        # Try to find JSON structure within the text
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
            try:
                return json.loads(text[start_idx:end_idx+1])
            except json.JSONDecodeError:
                pass
        
        return None

    async def run(self, message: str, db: Session, session_id: Optional[str] = None) -> AgentChatResponse:
        session_id, history = self._get_or_create_session(session_id)
        
        logger.info(f"USER_INTENT: {message}")
        history.append({"role": "user", "content": message})
        
        tools_used = []
        
        for iteration in range(self.max_tool_calls):
            try:
                response_text = await self.provider.chat(history, self.model)
            except Exception as e:
                logger.error(f"AGENT_ERROR: LLM provider failed - {e}")
                return self._graceful_error("The local AI service is unavailable or timed out.")

            parsed_data = self._extract_json_block(response_text)
            
            # Robust parsing: 1 retry for malformed JSON
            if not parsed_data:
                logger.warning("AGENT_WARNING: Malformed JSON. Requesting repair.")
                repair_prompt = "Your previous output was not valid JSON. Please return ONLY a valid JSON object."
                history.append({"role": "assistant", "content": response_text})
                history.append({"role": "user", "content": repair_prompt})
                try:
                    response_text = await self.provider.chat(history, self.model)
                    parsed_data = self._extract_json_block(response_text)
                except Exception:
                    parsed_data = None
                    
            if not parsed_data:
                logger.error("AGENT_ERROR: Failed to parse JSON after retry.")
                return self._graceful_error("I encountered an error understanding the catalog data.")

            history.append({"role": "assistant", "content": json.dumps(parsed_data)})

            if "tool" in parsed_data:
                tool_name = parsed_data["tool"]
                tool_args = parsed_data.get("args", {})
                logger.info(f"TOOL_CALL: {tool_name} with {tool_args}")
                
                if tool_name in TOOL_REGISTRY:
                    try:
                        tool_result = TOOL_REGISTRY[tool_name](db, **tool_args)
                        tools_used.append(tool_name)
                    except Exception as e:
                        tool_result = {"error": str(e)}
                else:
                    tool_result = {"error": f"Unknown tool: {tool_name}"}
                
                logger.info(f"TOOL_RESULT: {tool_name} returned data")
                history.append({
                    "role": "user", 
                    "content": f"Tool '{tool_name}' result:\n{json.dumps(tool_result)}"
                })
                continue # Loop again to let LLM process result
                
            elif parsed_data.get("type") == "response":
                logger.info("RECOMMENDATION: Final response generated")
                self._save_session(session_id, history)
                
                # Fetch full product objects for the frontend
                product_ids = parsed_data.get("product_ids", [])
                rec_id = parsed_data.get("recommended_product_id")
                
                products_to_fetch = set(product_ids)
                if rec_id:
                    products_to_fetch.add(rec_id)
                
                fetched_products = []
                for pid in products_to_fetch:
                    p_data = get_product(db, pid)
                    if "error" not in p_data:
                        fetched_products.append(p_data)
                
                intent_data = parsed_data.get("intent", {})
                intent = IntentPayload(
                    category=intent_data.get("category"),
                    max_price=intent_data.get("max_price"),
                    requirements=intent_data.get("requirements", [])
                )
                
                return AgentChatResponse(
                    message=parsed_data.get("message", "Here is what I found."),
                    intent=intent,
                    recommended_product_id=rec_id,
                    product_ids=product_ids,
                    match_reasons=parsed_data.get("match_reasons", []),
                    tools_used=tools_used,
                    products=fetched_products
                )
            else:
                logger.error(f"AGENT_ERROR: Unexpected JSON structure: {parsed_data}")
                return self._graceful_error("I encountered an unexpected format while processing.")
                
        # Iteration limit reached
        logger.warning("AGENT_WARNING: Tool loop limit reached.")
        self._save_session(session_id, history)
        return self._graceful_error("I couldn't complete the comparison safely. Please try a narrower request.")

    def _graceful_error(self, message: str) -> AgentChatResponse:
        return AgentChatResponse(
            message=message,
            intent=IntentPayload(),
            recommended_product_id=None,
            product_ids=[],
            match_reasons=[],
            tools_used=[],
            products=[]
        )
