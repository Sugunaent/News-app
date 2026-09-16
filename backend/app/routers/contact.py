from fastapi import APIRouter, Depends, Query, status

from app.core.db_utils import extract_single_record
from app.core.exceptions import AuthorizationError, NotFoundError
from app.db.supabase import supabase_admin
from app.dependencies.auth import AuthContext, get_current_user, get_optional_user
from app.schemas.contact import (
    BusinessEnquiryCreate,
    BusinessEnquiryListResponse,
    FeedbackCreate,
    FeedbackListResponse,
    StatusUpdate,
)
from app.services.audit import record_audit

router = APIRouter(
    prefix="/api/v1",
    tags=["Contact"],
)


def _require_superadmin(context: AuthContext) -> None:
    if getattr(context.user, "role", None) != "SUPERADMIN":
        raise AuthorizationError("Superadmin access required")


@router.post("/contact/enquiries", status_code=status.HTTP_201_CREATED)
async def submit_business_enquiry(
    payload: BusinessEnquiryCreate,
    auth: AuthContext | None = Depends(get_optional_user),
):
    response = (
        supabase_admin.table("business_enquiries")
        .insert(
            {
                "name": payload.name.strip(),
                "company": payload.company.strip(),
                "purpose": payload.purpose.strip(),
                "phone": payload.phone.strip(),
                "email": payload.email.strip(),
                "status": "new",
            }
        )
        .select("id")
        .execute()
    )
    extract_single_record(response.data, "Failed to submit enquiry")
    return {"ok": True}


@router.post("/contact/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackCreate,
    auth: AuthContext | None = Depends(get_optional_user),
):
    user_id = str(auth.user.id) if auth else None
    user_email = auth.user.email if auth else None
    response = (
        supabase_admin.table("feedback")
        .insert(
            {
                "content": payload.content.strip(),
                "user_id": user_id,
                "user_email": user_email,
                "status": "new",
            }
        )
        .select("id")
        .execute()
    )
    extract_single_record(response.data, "Failed to submit feedback")
    return {"ok": True}


@router.get("/superadmin/feedback", response_model=FeedbackListResponse)
async def list_feedback(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)
    offset = (page - 1) * page_size
    count_res = (
        supabase_admin.table("feedback")
        .select("id", count="exact")
        .execute()
    )
    total = getattr(count_res, "count", None) or len(count_res.data or [])
    rows = (
        supabase_admin.table("feedback")
        .select("id, content, user_email, status, created_at")
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return {"items": rows.data or [], "total": total}


@router.patch("/superadmin/feedback/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_feedback_status(
    feedback_id: str,
    payload: StatusUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)
    response = (
        supabase_admin.table("feedback")
        .update({"status": payload.status})
        .eq("id", feedback_id)
        .select("id")
        .execute()
    )
    if not response.data:
        raise NotFoundError("Feedback not found")
    record_audit(
        actor_user_id=auth.user.id,
        action="FEEDBACK_STATUS_UPDATED",
        entity_type="FEEDBACK",
        entity_id=None,
        metadata={"feedback_id": feedback_id, "status": payload.status},
        client=auth.client,
    )
    return None


@router.get("/superadmin/business-enquiries", response_model=BusinessEnquiryListResponse)
async def list_business_enquiries(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)
    offset = (page - 1) * page_size
    count_res = (
        supabase_admin.table("business_enquiries")
        .select("id", count="exact")
        .execute()
    )
    total = getattr(count_res, "count", None) or len(count_res.data or [])
    rows = (
        supabase_admin.table("business_enquiries")
        .select("id, name, company, purpose, phone, email, status, created_at")
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return {"items": rows.data or [], "total": total}


@router.patch(
    "/superadmin/business-enquiries/{enquiry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def update_enquiry_status(
    enquiry_id: str,
    payload: StatusUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)
    response = (
        supabase_admin.table("business_enquiries")
        .update({"status": payload.status})
        .eq("id", enquiry_id)
        .select("id")
        .execute()
    )
    if not response.data:
        raise NotFoundError("Enquiry not found")
    record_audit(
        actor_user_id=auth.user.id,
        action="ENQUIRY_STATUS_UPDATED",
        entity_type="BUSINESS_ENQUIRY",
        entity_id=None,
        metadata={"enquiry_id": enquiry_id, "status": payload.status},
        client=auth.client,
    )
    return None
