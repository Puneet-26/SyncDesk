from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.v1 import api_router
from app.services.sla_service import start_scheduler, shutdown_scheduler
import app.models  # ensure all models are registered on Base

import logging

logger = logging.getLogger("aicte_app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist in SQLite/DB (Supabase PostgreSQL / SQLite)
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed initial demo accounts & institutions if database is empty and auto-seed enabled
    if settings.AUTO_SEED:
        try:
            from app.seed import seed_database
            seed_database(reset=False)
        except Exception as e:
            logger.warning(f"Auto-seeding skipped or encountered non-fatal note: {e}")

    start_scheduler()
    yield
    # Shutdown: clean up background scheduler
    shutdown_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware (supports configured origins + all Vercel deployment URLs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "api_docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "HEALTHY"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
