from fastapi import FastAPI,HTTPException
from pydantic import BaseModel
import psycopg2
import os
from dotenv import load_dotenv
from pwdlib import PasswordHash
from fastapi.middleware.cors import CORSMiddleware

from auth import login_user
from subjects import create_subject, get_subjects, delete_subject, update_subject
from resources import (
    create_resource,
    get_resources,
    update_resource,
    delete_resource,
    toggle_favorite
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