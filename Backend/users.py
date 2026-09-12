import os
import secrets

import psycopg2
from dotenv import load_dotenv
from pwdlib import PasswordHash

load_dotenv()

password_hasher = PasswordHash.recommended()


class UserNotFoundError(Exception):
    """Raised when the requested user_id doesn't exist."""


class UsernameTakenError(Exception):
    """Raised when trying to update to a username someone else already has."""


class EmailTakenError(Exception):
    """Raised when trying to update to an email someone else already has."""


class IncorrectPasswordError(Exception):
    """Raised when a password change is attempted with the wrong current password."""


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


def create_user(name, username, email, password_hash):
    """Insert a new user, translating unique-constraint violations into clean,
    non-leaky errors instead of a raw Postgres exception bubbling up.
    """
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO users (name, username, email, password_hash)
            VALUES (%s, %s, %s, %s)
            RETURNING id, name, username, email, role;
            """,
            (name, username, email, password_hash),
        )
    except psycopg2.errors.UniqueViolation as exc:
        conn.rollback()
        cur.close()
        conn.close()

        constraint = getattr(exc.diag, "constraint_name", "") or ""
        if "username" in constraint:
            raise UsernameTakenError("That username is already taken.") from exc
        if "email" in constraint:
            raise EmailTakenError("That email is already registered.") from exc
        raise UsernameTakenError("That username or email is already taken.") from exc

    new_user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {
        "id": new_user[0],
        "name": new_user[1],
        "username": new_user[2],
        "email": new_user[3],
        "role": new_user[4],
    }


def get_user_by_email(email):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, name, username, email, role FROM users WHERE email = %s;",
        (email,),
    )
    user = cur.fetchone()

    cur.close()
    conn.close()

    if user is None:
        return None

    return {
        "id": user[0],
        "name": user[1],
        "username": user[2],
        "email": user[3],
        "role": user[4],
    }


def get_or_create_google_user(name, email):
    """Find the account for a Google-verified email, or create one.

    New accounts get a random, unusable local password (the user can only
    ever get in via Google, or by using "forgot password" later) and a
    username derived from their email, de-duplicated if needed.
    """
    existing = get_user_by_email(email)
    if existing is not None:
        return existing

    base_username = email.split("@")[0].lower()
    base_username = "".join(ch for ch in base_username if ch.isalnum()) or "user"

    conn = get_connection()
    cur = conn.cursor()

    unusable_password_hash = password_hasher.hash(secrets.token_urlsafe(32))
    username = base_username
    suffix = 0

    while True:
        try:
            cur.execute(
                """
                INSERT INTO users (name, username, email, password_hash)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, username, email, role;
                """,
                (name, username, email, unusable_password_hash),
            )
            break
        except psycopg2.errors.UniqueViolation as exc:
            conn.rollback()
            constraint = getattr(exc.diag, "constraint_name", "") or ""
            if "email" in constraint:
                # Another request created this account concurrently.
                cur.close()
                conn.close()
                return get_user_by_email(email)
            suffix += 1
            username = f"{base_username}{suffix}"
            if suffix > 50:
                cur.close()
                conn.close()
                raise UsernameTakenError(
                    "Could not generate a unique username for this account."
                ) from exc

    new_user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {
        "id": new_user[0],
        "name": new_user[1],
        "username": new_user[2],
        "email": new_user[3],
        "role": new_user[4],
    }


def get_user_profile(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, username, email, role
        FROM users
        WHERE id = %s;
        """,
        (user_id,)
    )

    user = cur.fetchone()

    if user is None:
        cur.close()
        conn.close()
        raise UserNotFoundError(f"User {user_id} does not exist.")

    cur.execute(
        "SELECT COUNT(*) FROM subjects WHERE user_id = %s;",
        (user_id,)
    )
    subjects_count = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM resources r
        JOIN subjects s ON r.subject_id = s.id
        WHERE s.user_id = %s;
        """,
        (user_id,)
    )
    resources_count = cur.fetchone()[0]

    cur.execute(
        "SELECT COUNT(*) FROM community_posts WHERE user_id = %s;",
        (user_id,)
    )
    community_posts_count = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM post_likes pl
        JOIN community_posts cp ON pl.post_id = cp.id
        WHERE cp.user_id = %s;
        """,
        (user_id,)
    )
    likes_received = cur.fetchone()[0]

    cur.close()
    conn.close()

    return {
        "id": user[0],
        "name": user[1],
        "username": user[2],
        "email": user[3],
        "role": user[4],
        "stats": {
            "subjects": subjects_count,
            "resources": resources_count,
            "community_posts": community_posts_count,
            "likes_received": likes_received,
        },
    }


def update_user_profile(user_id, name, username, email):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            UPDATE users
            SET name = %s, username = %s, email = %s
            WHERE id = %s
            RETURNING id, name, username, email, role;
            """,
            (name, username, email, user_id)
        )
    except psycopg2.errors.UniqueViolation as exc:
        conn.rollback()
        cur.close()
        conn.close()

        constraint = getattr(exc.diag, "constraint_name", "") or ""
        if "username" in constraint:
            raise UsernameTakenError("That username is already taken.") from exc
        if "email" in constraint:
            raise EmailTakenError("That email is already in use.") from exc
        raise UsernameTakenError("That username or email is already taken.") from exc

    user = cur.fetchone()

    if user is None:
        conn.rollback()
        cur.close()
        conn.close()
        raise UserNotFoundError(f"User {user_id} does not exist.")

    conn.commit()
    cur.close()
    conn.close()

    return {
        "id": user[0],
        "name": user[1],
        "username": user[2],
        "email": user[3],
        "role": user[4],
    }


def change_password(user_id, current_password, new_password):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT password_hash FROM users WHERE id = %s;",
        (user_id,)
    )

    row = cur.fetchone()

    if row is None:
        cur.close()
        conn.close()
        raise UserNotFoundError(f"User {user_id} does not exist.")

    if not password_hasher.verify(current_password, row[0]):
        cur.close()
        conn.close()
        raise IncorrectPasswordError("Current password is incorrect.")

    new_hash = password_hasher.hash(new_password)

    cur.execute(
        "UPDATE users SET password_hash = %s WHERE id = %s;",
        (new_hash, user_id)
    )

    conn.commit()
    cur.close()
    conn.close()
