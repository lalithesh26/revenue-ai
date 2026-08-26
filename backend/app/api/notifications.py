from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse, NotificationCreateRequest
from app.services.auth import get_current_user_optional

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=NotificationListResponse)
def get_notifications(
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Retrieves all system notifications with unread counts."""
    query = db.query(Notification)
    if current_user:
        query = query.filter((Notification.user_id == current_user.id) | (Notification.user_id == None))
    
    all_notifications = query.order_by(desc(Notification.created_at)).limit(50).all()
    unread_count = sum(1 for n in all_notifications if not n.is_read)
    
    return {
        "notifications": all_notifications,
        "unread_count": unread_count,
        "total_count": len(all_notifications)
    }

@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db)
):
    """Marks a single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Marks all notifications as read."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user:
        query = query.filter((Notification.user_id == current_user.id) | (Notification.user_id == None))
    
    updated_count = query.update({Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read", "updated_count": updated_count}

@router.post("/create", response_model=NotificationResponse)
def create_notification(
    req: NotificationCreateRequest,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Creates a new real system notification."""
    notif = Notification(
        user_id=current_user.id if current_user else None,
        title=req.title,
        message=req.message,
        type=req.type,
        action_url=req.action_url
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
