from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.institutions import router as institutions_router
from app.api.v1.cases import router as cases_router
from app.api.v1.overlaps import router as overlaps_router
from app.api.v1.coordination import router as coordination_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.reports import router as reports_router
from app.api.v1.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(institutions_router, prefix="/institutions", tags=["Institutions"])
api_router.include_router(cases_router, prefix="/cases", tags=["Complaint Cases"])
api_router.include_router(overlaps_router, prefix="/overlaps", tags=["Overlap Intelligence"])
api_router.include_router(coordination_router, prefix="/coordination", tags=["Coordination Workspace"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts & Notifications"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reports & Analytics"])
api_router.include_router(admin_router, prefix="/admin", tags=["Administration"])
