import os
from typing import Optional

import psycopg2
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pwdlib import PasswordHash
from pydantic import BaseModel

from admin import admin_delete_post, get_all_users, get_dashboard_stats
from auth import (
    CaptchaError,
    GoogleAuthError,
    PASSWORD_REQUIREMENTS,
    WeakPasswordError,
    create_access_token,
    get_current_user,
    login_user,
    require_admin,
    require_self_or_admin,
    validate_password_strength,
    verify_google_token,
    verify_recaptcha,
)
from comments import create_comment, delete_comment, get_comments
from community import create_post, delete_post, get_posts, search_posts, update_post
from like import get_post_likes, like_post, unlike_post
from notifications import (
    delete_notification,
    get_notifications,
    get_unread_count,
    mark_all_notifications_read,
    mark_notification_read,
)
from rating import (
    PostNotFoundError,
    RatingTableMissingError,
    UserNotFoundError,
    get_post_rating,
    get_user_rating,
    rate_post,
)
from resources import (
    create_resource,
    delete_resource,
    get_resources,
    search_resources,
    toggle_favorite,
    update_resource,
)
from subjects import create_subject, delete_subject, get_subjects, update_subject
from users import (
    EmailTakenError,
    IncorrectPasswordError,
    UserNotFoundError as ProfileUserNotFoundError,
    UsernameTakenError,
    change_password,
    create_user,
    get_or_create_google_user,
    get_user_profile,
    update_user_profile,
)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

password_hasher = PasswordHash.recommended()


class SignupRequest(BaseModel):
    name: str
    username: str
    email: str
    password: str
    captcha_token: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str
    recaptcha_token: str | None = None


class GoogleAuthRequest(BaseModel):
    credential: str


class SubjectRequest(BaseModel):
    user_id: int
    name: str
    description: Optional[str] = ""


class ResourceRequest(BaseModel):
    subject_id: int
    title: str
    description: Optional[str] = ""
    resource_type: str = ""
    resource_url: Optional[str] = ""


class CommunityPostRequest(BaseModel):
    user_id: int
    title: str
    description: Optional[str] = ""
    resource_type: Optional[str] = ""
    resource_url: Optional[str] = ""


class CommunityPostUpdateRequest(BaseModel):
    user_id: int
    title: str
    description: str
    resource_type: str
    resource_url: str


class LikeRequest(BaseModel):
    user_id: int


class CommentRequest(BaseModel):
    user_id: int
    comment: str


class RatingRequest(BaseModel):
    user_id: int
    rating: int


class ProfileUpdateRequest(BaseModel):
    name: str
    username: str
    email: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


@app.get("/auth/password-requirements")
def password_requirements():
    return {"requirements": PASSWORD_REQUIREMENTS}


@app.post("/signup")
def signup(user: SignupRequest):
    try:
        verify_recaptcha(user.captcha_token)
    except CaptchaError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        validate_password_strength(user.password)
    except WeakPasswordError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    hashed_password = password_hasher.hash(user.password)

    try:
        user_payload = create_user(user.name, user.username, user.email, hashed_password)
    except (UsernameTakenError, EmailTakenError) as exc:
        # Deliberately generic 409 message: confirming *which* field collided
        # is still some account-enumeration signal, so we don't parrot the
        # user's email/username back in the error.
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    access_token = create_access_token(user_payload)

    return {
        "message": "Account created successfully!",
        "user": user_payload,
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.post("/auth/google")
def google_auth(payload: GoogleAuthRequest):
    """Sign in (or silently register) via a Google Identity Services ID token."""
    try:
        google_payload = verify_google_token(payload.credential)
    except GoogleAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    name = google_payload.get("name") or google_payload["email"].split("@")[0]
    email = google_payload["email"]

    user_payload = get_or_create_google_user(name, email)
    access_token = create_access_token(user_payload)

    return {
        "message": "Login successful!",
        "user": user_payload,
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.post("/login")
def login(user: LoginRequest):
    try:
        verify_recaptcha(user.recaptcha_token)
    except CaptchaError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    logged_user = login_user(user.username, user.password)

    if logged_user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    access_token = create_access_token(logged_user)

    return {
        "message": "Login successful!",
        "user": logged_user,
        "access_token": access_token,
        "token_type": "bearer",
    }

@app.get("/me")
def read_current_user(current_user: dict = Depends(get_current_user)):
    """Lets the frontend validate a stored token and recover the user's identity."""
    try:
        return get_user_profile(current_user["id"])
    except ProfileUserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/subjects")
def add_subject(subject: SubjectRequest, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(subject.user_id, current_user)
    new_subject = create_subject(
        subject.user_id,
        subject.name,
        subject.description,
    )

    return {
        "message": "Subject added successfully!",
        "subject": {
            "id": new_subject[0],
            "user_id": new_subject[1],
            "name": new_subject[2],
            "description": new_subject[3],
            "created_at": new_subject[4],
        },
    }


@app.get("/subjects/{user_id}")
def fetch_subjects(user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    subjects = get_subjects(user_id)

    return {
        "subjects": [
            {
                "id": subject[0],
                "user_id": subject[1],
                "name": subject[2],
                "description": subject[3],
                "created_at": subject[4],
            }
            for subject in subjects
        ]
    }


@app.put("/subjects/{subject_id}")
def edit_subject(subject_id: int, subject: SubjectRequest, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(subject.user_id, current_user)
    updated_subject = update_subject(
        subject_id,
        subject.user_id,
        subject.name,
        subject.description,
    )

    if updated_subject is None:
        raise HTTPException(
            status_code=404,
            detail="Subject not found",
        )

    return {
        "message": "Subject updated successfully!",
        "subject": {
            "id": updated_subject[0],
            "user_id": updated_subject[1],
            "name": updated_subject[2],
            "description": updated_subject[3],
            "created_at": updated_subject[4],
        },
    }


@app.delete("/subjects/{subject_id}")
def remove_subject(subject_id: int, user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    deleted = delete_subject(subject_id, user_id)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Subject not found",
        )

    return {"message": "Subject deleted successfully!"}


@app.post("/resources")
def add_resource(resource: ResourceRequest, current_user: dict = Depends(get_current_user)):
    new_resource = create_resource(
        resource.subject_id,
        resource.title,
        resource.description,
        resource.resource_type,
        resource.resource_url,
    )

    return {
        "message": "Resource added successfully!",
        "resource": {
            "id": new_resource[0],
            "subject_id": new_resource[1],
            "title": new_resource[2],
            "description": new_resource[3],
            "resource_type": new_resource[4],
            "resource_url": new_resource[5],
            "is_favorite": new_resource[6],
            "created_at": new_resource[7],
        },
    }


@app.get("/resources/{subject_id}")
def fetch_resources(subject_id: int, current_user: dict = Depends(get_current_user)):
    resources = get_resources(subject_id)

    return {
        "resources": [
            {
                "id": resource[0],
                "subject_id": resource[1],
                "title": resource[2],
                "description": resource[3],
                "resource_type": resource[4],
                "resource_url": resource[5],
                "is_favorite": resource[6],
                "created_at": resource[7],
            }
            for resource in resources
        ]
    }


@app.get("/resources/{subject_id}/search")
def search_resource(subject_id: int, keyword: str, current_user: dict = Depends(get_current_user)):
    resources = search_resources(subject_id, keyword)

    return {
        "resources": [
            {
                "id": resource[0],
                "subject_id": resource[1],
                "title": resource[2],
                "description": resource[3],
                "resource_type": resource[4],
                "resource_url": resource[5],
                "is_favorite": resource[6],
                "created_at": resource[7],
            }
            for resource in resources
        ]
    }


@app.put("/resources/{resource_id}")
def edit_resource(resource_id: int, resource: ResourceRequest, current_user: dict = Depends(get_current_user)):
    updated_resource = update_resource(
        resource_id,
        resource.subject_id,
        resource.title,
        resource.description,
        resource.resource_type,
        resource.resource_url,
    )

    if updated_resource is None:
        raise HTTPException(
            status_code=404,
            detail="Resource not found",
        )

    return {
        "message": "Resource updated successfully!",
        "resource": {
            "id": updated_resource[0],
            "subject_id": updated_resource[1],
            "title": updated_resource[2],
            "description": updated_resource[3],
            "resource_type": updated_resource[4],
            "resource_url": updated_resource[5],
            "is_favorite": updated_resource[6],
            "created_at": updated_resource[7],
        },
    }


@app.put("/resources/{resource_id}/favorite")
def favorite_resource(resource_id: int, subject_id: int, current_user: dict = Depends(get_current_user)):
    resource = toggle_favorite(resource_id, subject_id)

    if resource is None:
        raise HTTPException(
            status_code=404,
            detail="Resource not found",
        )

    return {
        "message": "Favorite status updated!",
        "resource": {
            "id": resource[0],
            "subject_id": resource[1],
            "title": resource[2],
            "is_favorite": resource[3],
        },
    }


@app.delete("/resources/{resource_id}")
def remove_resource(resource_id: int, subject_id: int, current_user: dict = Depends(get_current_user)):
    deleted = delete_resource(resource_id, subject_id)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Resource not found",
        )

    return {"message": "Resource deleted successfully!"}


@app.post("/community")
def add_post(post: CommunityPostRequest, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(post.user_id, current_user)
    new_post = create_post(
        post.user_id,
        post.title,
        post.description,
        post.resource_type,
        post.resource_url,
    )

    return {
        "message": "Post shared successfully!",
        "post": {
            "id": new_post[0],
            "user_id": new_post[1],
            "title": new_post[2],
            "description": new_post[3],
            "resource_type": new_post[4],
            "resource_url": new_post[5],
            "created_at": new_post[6],
        },
    }


@app.get("/community")
def fetch_posts():
    posts = get_posts()

    return {
        "posts": [
            {
                "id": post[0],
                "user_id": post[1],
                "username": post[2],
                "title": post[3],
                "description": post[4],
                "resource_type": post[5],
                "resource_url": post[6],
                "created_at": post[7],
            }
            for post in posts
        ]
    }


@app.get("/community/search")
def search_community_posts(keyword: str):
    posts = search_posts(keyword)

    return {
        "posts": [
            {
                "id": post[0],
                "user_id": post[1],
                "username": post[2],
                "title": post[3],
                "description": post[4],
                "resource_type": post[5],
                "resource_url": post[6],
                "created_at": post[7],
            }
            for post in posts
        ]
    }


@app.put("/community/{post_id}")
def edit_post(post_id: int, post: CommunityPostUpdateRequest, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(post.user_id, current_user)
    updated_post = update_post(
        post_id,
        post.user_id,
        post.title,
        post.description,
        post.resource_type,
        post.resource_url,
    )

    if updated_post is None:
        raise HTTPException(
            status_code=404,
            detail="Post not found or unauthorized",
        )

    return {
        "message": "Post updated successfully!",
        "post": {
            "id": updated_post[0],
            "user_id": updated_post[1],
            "title": updated_post[2],
            "description": updated_post[3],
            "resource_type": updated_post[4],
            "resource_url": updated_post[5],
            "created_at": updated_post[6],
        },
    }


@app.delete("/community/{post_id}")
def remove_post(post_id: int, user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    deleted = delete_post(post_id, user_id)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    return {"message": "Post deleted successfully!"}


@app.post("/community/{post_id}/like")
def add_like(post_id: int, like: LikeRequest, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(like.user_id, current_user)
    # like_post() already creates the "like" notification internally
    # (see like.py) — do not create a second one here, or the post
    # owner will receive a duplicate notification for the same like.
    result = like_post(post_id, like.user_id)

    if result is None:
        return {"message": "Post already liked!"}

    return {"message": "Post liked successfully!"}


@app.delete("/community/{post_id}/like")
def remove_like(post_id: int, user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    result = unlike_post(post_id, user_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Like not found",
        )

    return {"message": "Post unliked successfully!"}


@app.get("/community/{post_id}/likes")
def count_likes(post_id: int):
    return {
        "post_id": post_id,
        "likes": get_post_likes(post_id),
    }


@app.post("/community/{post_id}/comments")
def add_comment(post_id: int, comment: CommentRequest, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(comment.user_id, current_user)
    new_comment = create_comment(
        post_id,
        comment.user_id,
        comment.comment,
    )

    return {
        "message": "Comment added successfully!",
        "comment": {
            "id": new_comment[0],
            "post_id": new_comment[1],
            "user_id": new_comment[2],
            "comment": new_comment[3],
            "created_at": new_comment[4],
        },
    }


@app.get("/community/{post_id}/comments")
def fetch_comments(post_id: int):
    comments = get_comments(post_id)

    return {
        "comments": [
            {
                "id": comment[0],
                "post_id": comment[1],
                "user_id": comment[2],
                "username": comment[3],
                "comment": comment[4],
                "created_at": comment[5],
            }
            for comment in comments
        ]
    }


@app.delete("/community/comments/{comment_id}")
def remove_comment(comment_id: int, user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    deleted = delete_comment(comment_id, user_id)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Comment not found",
        )

    return {"message": "Comment deleted successfully!"}


@app.get("/notifications/{user_id}")
def fetch_notifications(user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    notifications = get_notifications(user_id)

    return {
        "notifications": [
            {
                "id": notification[0],
                "user_id": notification[1],
                "sender_id": notification[2],
                "type": notification[3],
                "message": notification[4],
                "post_id": notification[5],
                "is_read": notification[6],
                "created_at": notification[7],
                "sender_username": notification[8],
                "sender_name": notification[9],
                "post_title": notification[10],
            }
            for notification in notifications
        ]
    }


@app.get("/notifications/{user_id}/unread-count")
def fetch_unread_count(user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    return {"unread_count": get_unread_count(user_id)}


@app.put("/notifications/{notification_id}/read")
def read_notification(notification_id: int, user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    notification = mark_notification_read(notification_id, user_id)

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    return {"message": "Notification marked as read!"}


@app.put("/notifications/{user_id}/read-all")
def read_all_notifications(user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    mark_all_notifications_read(user_id)

    return {"message": "All notifications marked as read!"}


@app.delete("/notifications/{notification_id}")
def remove_notification(notification_id: int, user_id: int, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    deleted = delete_notification(notification_id, user_id)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    return {"message": "Notification deleted!"}


@app.post("/community/{post_id}/rating")
def add_rating(post_id: int, rating: RatingRequest, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(rating.user_id, current_user)
    if not 1 <= rating.rating <= 5:
        raise HTTPException(
            status_code=400,
            detail="Rating must be between 1 and 5",
        )

    try:
        result = rate_post(post_id, rating.user_id, rating.rating)
    except RatingTableMissingError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except PostNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    try:
        average, count = get_post_rating(post_id)
    except RatingTableMissingError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "message": "Rating submitted successfully!",
        "average_rating": average,
        "rating_count": count,
        "your_rating": rating.rating,
    }


@app.get("/community/{post_id}/rating")
def fetch_post_rating(post_id: int):
    try:
        average, count = get_post_rating(post_id)
    except RatingTableMissingError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "post_id": post_id,
        "average_rating": average,
        "rating_count": count,
    }


@app.get("/community/{post_id}/rating/{user_id}")
def fetch_user_rating(post_id: int, user_id: int):
    try:
        your_rating = get_user_rating(post_id, user_id)
    except RatingTableMissingError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "post_id": post_id,
        "user_id": user_id,
        "your_rating": your_rating,
    }


@app.get("/users/{user_id}")
def fetch_user_profile(user_id: int, current_user: dict = Depends(get_current_user)):
    try:
        return get_user_profile(user_id)
    except ProfileUserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/users/{user_id}")
def edit_user_profile(user_id: int, profile: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    try:
        user = update_user_profile(
            user_id,
            profile.name,
            profile.username,
            profile.email,
        )
    except ProfileUserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (UsernameTakenError, EmailTakenError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {"message": "Profile updated successfully!", "user": user}


@app.put("/users/{user_id}/password")
def edit_user_password(user_id: int, payload: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    require_self_or_admin(user_id, current_user)
    try:
        validate_password_strength(payload.new_password)
    except WeakPasswordError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        change_password(user_id, payload.current_password, payload.new_password)
    except ProfileUserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except IncorrectPasswordError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    return {"message": "Password updated successfully!"}


@app.get("/admin/users")
def fetch_all_users(current_user: dict = Depends(get_current_user)):
    require_admin(current_user)
    users = get_all_users()

    return {
        "users": [
            {
                "id": user[0],
                "name": user[1],
                "username": user[2],
                "email": user[3],
                "created_at": user[4],
            }
            for user in users
        ]
    }


@app.delete("/admin/community/{post_id}")
def admin_remove_post(post_id: int, current_user: dict = Depends(get_current_user)):
    require_admin(current_user)
    deleted = admin_delete_post(post_id)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Post not found",
        )

    return {"message": "Post deleted successfully by admin!"}


@app.get("/admin/dashboard")
def admin_dashboard(current_user: dict = Depends(get_current_user)):
    require_admin(current_user)
    return {
        "dashboard": get_dashboard_stats()
    }