from fastapi import FastAPI
from pydantic import BaseModel
import psycopg2
import os
from dotenv import load_dotenv
from pwdlib import PasswordHash
from fastapi.middleware.cors import CORSMiddleware

from auth import login_user

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
        return {
            "error": "Invalid username or password"
        }

    return {
        "message": "Login successful!",
        "user": logged_user
    }