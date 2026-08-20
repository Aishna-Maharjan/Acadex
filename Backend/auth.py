import os
import psycopg2
from dotenv import load_dotenv
from pwdlib import PasswordHash

load_dotenv()

password_hasher = PasswordHash.recommended()


def login_user(username: str, password: str):

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
        SELECT id, name, username, email,password_hash, role
        FROM users
        WHERE username = %s;
        """,
        (username,)
    )

    user = cur.fetchone()

    cur.close()
    conn.close()

    if user is None:
        return None

    password_is_correct = password_hasher.verify(
        password,
        user[4]
    )

    if not password_is_correct:
        return None

    return {
        "id": user[0],
        "name": user[1],
        "username": user[2],
        "email": user[3],
        "role": user[5]
    }