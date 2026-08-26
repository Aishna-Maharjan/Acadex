from fastapi import FastAPI,HTTPException
from pydantic import BaseModel
import psycopg2
import os
from dotenv import load_dotenv
from pwdlib import PasswordHash
from fastapi.middleware.cors import CORSMiddleware

from auth import login_user
from subjects import create_subject, get_subjects, delete_subject, update_subject
from resources import (create_resource,get_resources,update_resource,delete_resource,toggle_favorite,search_resources)
from community import create_post, get_posts, delete_post, search_posts, update_post
from like import like_post, unlike_post, get_post_likes
from notifications import (create_notification,get_notifications,mark_notification_read)
from comments import create_comment, get_comments, delete_comment
from admin import get_all_users,admin_delete_post,get_dashboard_stats

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

class LoginRequest(BaseModel):
    username: str
    password: str

class SubjectRequest(BaseModel):
    user_id: int
    name: str
    description: str = ""

class SubjectUpdateRequest(BaseModel):
    user_id: int
    name: str
    description: str = ""

class ResourceRequest(BaseModel):
    subject_id: int
    title: str
    description: str = ""
    resource_type: str = ""
    resource_url: str = ""

class ResourceUpdateRequest(BaseModel):
    subject_id: int
    title: str
    description: str = ""
    resource_type: str = ""
    resource_url: str = ""

class CommunityPostRequest(BaseModel):
    user_id: int
    title: str
    description: str = ""
    resource_type: str = ""
    resource_url: str = ""

class LikeRequest(BaseModel):
    user_id: int

class CommentRequest(BaseModel):
    user_id: int
    comment: str

class CommunityPostUpdateRequest(BaseModel):
    user_id: int
    title: str
    description: str
    resource_type: str
    resource_url: str

@app.post("/signup")
def signup(user: SignupRequest):

    hashed_password = password_hasher.hash(user.password)

    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )

        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO users (name, username, email, password_hash)
            VALUES (%s, %s, %s, %s)
            RETURNING id, name, username, email, role;
            """,
            (
                user.name,
                user.username,
                user.email,
                hashed_password
            )
        )

        new_user = cur.fetchone()

        conn.commit()

        cur.close()
        conn.close()

        return {
            "message": "Account created successfully!",
            "user": {
                "id": new_user[0],
                "name": new_user[1],
                "username": new_user[2],
                "email": new_user[3],
                "role": new_user[4]
            }
        }

    except Exception as e:
        return {"error": str(e)}

@app.post("/login")
def login(user: LoginRequest):

    logged_user = login_user(
        user.username,
        user.password
    )

    if logged_user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    return {
        "message": "Login successful!",
        "user": logged_user
    }

@app.post("/subjects")
def add_subject(subject: SubjectRequest):

    new_subject = create_subject(
        subject.user_id,
        subject.name,
        subject.description
    )

    return {
        "message": "Subject added successfully!",
        "subject": {
            "id": new_subject[0],
            "user_id": new_subject[1],
            "name": new_subject[2],
            "description": new_subject[3],
            "created_at": new_subject[4]
        }
    }


@app.get("/subjects/{user_id}")
def fetch_subjects(user_id: int):

    subjects = get_subjects(user_id)

    return {
        "subjects": [
            {
                "id": subject[0],
                "user_id": subject[1],
                "name": subject[2],
                "description": subject[3],
                "created_at": subject[4]
            }
            for subject in subjects
        ]
    }


@app.delete("/subjects/{subject_id}")
def remove_subject(subject_id: int, user_id: int):

    deleted = delete_subject(subject_id, user_id)

    if deleted is None:
        return {
            "error": "Subject not found"
        }

    return {
        "message": "Subject deleted successfully!"
    }

@app.put("/subjects/{subject_id}")
def edit_subject(subject_id: int, subject: SubjectUpdateRequest):

    updated_subject = update_subject(
        subject_id,
        subject.user_id,
        subject.name,
        subject.description
    )

    if updated_subject is None:
        return {
            "error": "Subject not found"
        }

    return {
        "message": "Subject updated successfully!",
        "subject": {
            "id": updated_subject[0],
            "user_id": updated_subject[1],
            "name": updated_subject[2],
            "description": updated_subject[3],
            "created_at": updated_subject[4]
        }
    }

@app.post("/resources")
def add_resource(resource: ResourceRequest):

    new_resource = create_resource(
        resource.subject_id,
        resource.title,
        resource.description,
        resource.resource_type,
        resource.resource_url
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
            "created_at": new_resource[7]
        }
    }

@app.get("/resources/{subject_id}")
def fetch_resources(subject_id: int):

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
                "created_at": resource[7]
            }
            for resource in resources
        ]
    }

@app.put("/resources/{resource_id}")
def edit_resource(resource_id: int, resource: ResourceUpdateRequest):

    updated_resource = update_resource(
        resource_id,
        resource.subject_id,
        resource.title,
        resource.description,
        resource.resource_type,
        resource.resource_url
    )

    if updated_resource is None:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
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
            "created_at": updated_resource[7]
        }
    }

@app.delete("/resources/{resource_id}")
def remove_resource(resource_id: int, subject_id: int):

    deleted = delete_resource(resource_id, subject_id)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    return {
        "message": "Resource deleted successfully!"
    }

@app.put("/resources/{resource_id}/favorite")
def favorite_resource(resource_id: int, subject_id: int):

    resource = toggle_favorite(
        resource_id,
        subject_id
    )

    if resource is None:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    return {
        "message": "Favorite status updated!",
        "resource": {
            "id": resource[0],
            "subject_id": resource[1],
            "title": resource[2],
            "is_favorite": resource[3]
        }
    }

@app.get("/resources/{subject_id}/search")
def search_resource(subject_id: int, keyword: str):

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
                "created_at": resource[7]
            }
            for resource in resources
        ]
    }

@app.post("/community")
def add_post(post: CommunityPostRequest):

    new_post = create_post(
        post.user_id,
        post.title,
        post.description,
        post.resource_type,
        post.resource_url
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
            "created_at": new_post[6]
        }
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
                "created_at": post[7]
            }
            for post in posts
        ]
    }


@app.delete("/community/{post_id}")
def remove_post(post_id: int, user_id: int):

    deleted = delete_post(post_id, user_id)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    return {
        "message": "Post deleted successfully!"
    }

@app.post("/community/{post_id}/like")
def add_like(post_id: int, like: LikeRequest):

    result = like_post(
        post_id,
        like.user_id
    )

    if result is None:
        return {
            "message": "Post already liked!"
        }

    conn = psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

    cur = conn.cursor()

    cur.execute(
        """
        SELECT user_id
        FROM community_posts
        WHERE id = %s;
        """,
        (post_id,)
    )

    post_owner = cur.fetchone()

    cur.close()
    conn.close()

    if post_owner is not None:

        owner_id = post_owner[0]
        if owner_id != like.user_id:

            create_notification(
                user_id=owner_id,
                sender_id=like.user_id,
                notification_type="like",
                message="Someone liked your post.",
                post_id=post_id
            )

    return {
        "message": "Post liked successfully!"
    }


@app.delete("/community/{post_id}/like")
def remove_like(post_id: int, user_id: int):

    result = unlike_post(
        post_id,
        user_id
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Like not found"
        )

    return {
        "message": "Post unliked successfully!"
    }


@app.get("/community/{post_id}/likes")
def count_likes(post_id: int):

    count = get_post_likes(post_id)

    return {
        "post_id": post_id,
        "likes": count
    }

@app.get("/notifications/{user_id}")
def fetch_notifications(user_id: int):

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
                "created_at": notification[7]
            }
            for notification in notifications
        ]
    }


@app.put("/notifications/{notification_id}/read")
def read_notification(
    notification_id: int,
    user_id: int
):

    notification = mark_notification_read(
        notification_id,
        user_id
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return {
        "message": "Notification marked as read!"
    }

@app.post("/community/{post_id}/comments")
def add_comment(post_id: int, comment: CommentRequest):

    new_comment = create_comment(
        post_id,
        comment.user_id,
        comment.comment
    )

    return {
        "message": "Comment added successfully!",
        "comment": {
            "id": new_comment[0],
            "post_id": new_comment[1],
            "user_id": new_comment[2],
            "comment": new_comment[3],
            "created_at": new_comment[4]
        }
    }


@app.get("/community/{post_id}/comments")
def fetch_comments(post_id: int):

    comments = get_comments(post_id)

    return {
        "comments": [
            {
                "id": item[0],
                "post_id": item[1],
                "user_id": item[2],
                "username": item[3],
                "comment": item[4],
                "created_at": item[5]
            }
            for item in comments
        ]
    }


@app.delete("/community/comments/{comment_id}")
def remove_comment(comment_id: int, user_id: int):

    deleted = delete_comment(
        comment_id,
        user_id
    )

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Comment not found"
        )

    return {
        "message": "Comment deleted successfully!"
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
                "created_at": post[7]
            }
            for post in posts
        ]
    }

@app.put("/community/{post_id}")
def edit_post(post_id: int, post: CommunityPostUpdateRequest):

    updated_post = update_post(
        post_id,
        post.user_id,
        post.title,
        post.description,
        post.resource_type,
        post.resource_url
    )

    if updated_post is None:
        raise HTTPException(
            status_code=404,
            detail="Post not found or you are not the owner"
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
            "created_at": updated_post[6]
        }
    }

@app.get("/admin/users")
def fetch_all_users():

    users = get_all_users()

    return {
        "users": [
            {
                "id": user[0],
                "name": user[1],
                "username": user[2],
                "email": user[3],
                "created_at": user[4]
            }
            for user in users
        ]
    }

@app.delete("/admin/community/{post_id}")
def admin_remove_post(post_id: int):

    deleted = admin_delete_post(post_id)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    return {
        "message": "Post deleted successfully by admin!"
    }

@app.get("/admin/dashboard")
def admin_dashboard():

    stats = get_dashboard_stats()

    return {
        "dashboard": stats
    }