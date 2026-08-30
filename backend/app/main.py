from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.models import Merchant, Product, CommercePolicy  # noqa: F401 — ensures models are registered
from app.api import products, merchants, policies, agent
from app.api.endpoints import orders, payments, audit


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (if they don't exist)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AgentCart API",
    description="Backend API for the AgentCart AI Commerce Gateway",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(products.router)
app.include_router(merchants.router)
app.include_router(policies.router)
app.include_router(agent.router)

# The new endpoints were created without prefixes, so we add them here to match the /api namespace
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
