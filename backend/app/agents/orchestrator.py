import json
import logging
import re
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

NO_MATCH_MESSAGE = "I couldn't find a matching product in the catalog for that request."

# Deterministic, regex-only price-ceiling extraction from the user's own
# words. This is intentionally narrow — it only recognizes the explicit
# patterns below, and returns None (no ceiling) for anything else. The
# result is the ONLY source of truth for a search's max_price; an
# LLM-supplied value is never trusted for this.
_PRICE_WITH_KEYWORD = re.compile(
    r"(?:under|below|within|less than|up to)\s*₹?\s*([\d,]+)\s*(k)?\b",
    re.IGNORECASE,
)
_PRICE_WITH_SYMBOL = re.compile(r"₹\s*([\d,]+)\s*(k)?\b", re.IGNORECASE)
_PRICE_BARE_K = re.compile(r"\b(\d+)\s*k\b", re.IGNORECASE)


def extract_user_price_ceiling(message: str) -> Optional[int]:
    """
    Extract a price ceiling the user explicitly typed (e.g. "under ₹70,000",
    "70k", "₹5000"). Returns None when no such pattern is present — callers
    must never substitute an LLM-guessed number in that case.
    """
    for pattern in (_PRICE_WITH_KEYWORD, _PRICE_WITH_SYMBOL, _PRICE_BARE_K):
        match = pattern.search(message)
        if not match:
            continue
        digits = match.group(1).replace(",", "")
        if not digits.isdigit():
            continue
        value = int(digits)
        has_k_suffix = pattern is _PRICE_BARE_K or (match.lastindex and match.lastindex >= 2 and match.group(2))
        if has_k_suffix:
            value *= 1000
        return value
    return None


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

    @staticmethod
    def _extract_ids_from_tool_result(tool_name: str, tool_result: dict) -> set[str]:
        """
        Pull the product IDs that a tool call actually, verifiably returned.
        This is the ground truth for product-ID grounding — an ID counts as
        "retrieved" only if it appears here, not merely because it exists
        somewhere in the database.
        """
        ids: set[str] = set()
        if not isinstance(tool_result, dict):
            return ids

        if tool_name == "search_products":
            for p in tool_result.get("products") or []:
                if isinstance(p, dict) and p.get("id"):
                    ids.add(p["id"])
        elif tool_name == "get_product":
            if "error" not in tool_result and tool_result.get("id"):
                ids.add(tool_result["id"])
        elif tool_name == "compare_products":
            for c in tool_result.get("comparisons") or []:
                if isinstance(c, dict) and c.get("product_id"):
                    ids.add(c["product_id"])
        return ids

    @staticmethod
    def _validate_recommendation(
        raw_rec_id: Optional[str],
        raw_product_ids: list[str],
        seen_product_ids: set[str],
    ) -> tuple[Optional[str], list[str]]:
        """
        Hard grounding guarantee: an ID only survives if it actually
        appeared in a tool result during this turn (seen_product_ids) — not
        merely because it happens to exist somewhere in the catalog. If the
        LLM's chosen recommendation isn't grounded but a grounded candidate
        remains, promote that candidate instead of returning nothing.
        """
        validated_product_ids = [pid for pid in raw_product_ids if pid in seen_product_ids]

        if raw_rec_id and raw_rec_id in seen_product_ids:
            rec_id = raw_rec_id
        elif validated_product_ids:
            rec_id = validated_product_ids[0]
            logger.info(f"GROUNDING: recommended_product_id not grounded; promoted '{rec_id}'")
        else:
            rec_id = None

        if raw_rec_id and raw_rec_id not in seen_product_ids:
            logger.warning(f"GROUNDING: discarded ungrounded recommended_product_id '{raw_rec_id}'")
        dropped = [pid for pid in raw_product_ids if pid not in seen_product_ids]
        if dropped:
            logger.warning(f"GROUNDING: discarded ungrounded product_ids {dropped}")

        return rec_id, validated_product_ids

    async def run(self, message: str, db: Session, session_id: Optional[str] = None) -> AgentChatResponse:
        session_id, history = self._get_or_create_session(session_id)

        logger.info(f"USER_INTENT: {message}")
        history.append({"role": "user", "content": message})

        # Computed once from the user's own words — the only source of truth
        # for a search price ceiling for the rest of this turn.
        user_price_ceiling = extract_user_price_ceiling(message)
        logger.info(f"USER_PRICE_CEILING: {user_price_ceiling}")

        tools_used = []
        seen_product_ids: set[str] = set()

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
                tool_args = dict(parsed_data.get("args", {}) or {})

                if tool_name == "search_products":
                    # Deterministic guardrail: never trust an LLM-invented
                    # price ceiling. Only a ceiling the user actually typed
                    # may constrain the search — including forcing it back
                    # to None if the LLM added one the user never stated.
                    tool_args["max_price"] = user_price_ceiling

                logger.info(f"TOOL_CALL: {tool_name} with {tool_args}")

                if tool_name in TOOL_REGISTRY:
                    try:
                        tool_result = TOOL_REGISTRY[tool_name](db, **tool_args)
                        tools_used.append(tool_name)
                        seen_product_ids |= self._extract_ids_from_tool_result(tool_name, tool_result)
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

                raw_product_ids = parsed_data.get("product_ids", [])
                raw_rec_id = parsed_data.get("recommended_product_id")

                rec_id, validated_product_ids = self._validate_recommendation(
                    raw_rec_id, raw_product_ids, seen_product_ids
                )

                # Fetch full product objects for the frontend — restricted to
                # grounded IDs only.
                products_to_fetch = set(validated_product_ids)
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

                grounded = rec_id is not None or len(validated_product_ids) > 0
                response_message = parsed_data.get("message", "Here is what I found.") if grounded else NO_MATCH_MESSAGE

                return AgentChatResponse(
                    message=response_message,
                    intent=intent,
                    recommended_product_id=rec_id,
                    product_ids=validated_product_ids,
                    match_reasons=parsed_data.get("match_reasons", []) if grounded else [],
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
