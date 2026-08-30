import os
import sys
import asyncio
sys.path.append(os.path.abspath('backend'))
from dotenv import load_dotenv
load_dotenv('backend/.env')

from app.database import SessionLocal
from app.api.agent import chat_with_agent
from app.agents.schemas import AgentChatRequest

async def run():
    db = SessionLocal()
    try:
        req = AgentChatRequest(message="Hi", session_id="test_session")
        res = await chat_with_agent(req, db)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run())
