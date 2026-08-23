import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


def create_subject(user_id, name, description):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO subjects (user_id, name, description)
        VALUES (%s, %s, %s)
        RETURNING id, user_id, name, description, created_at;
        """,
        (user_id, name, description)
    )

    subject = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return subject


def get_subjects(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, user_id, name, description, created_at
        FROM subjects
        WHERE user_id = %s
        ORDER BY created_at DESC;
        """,
        (user_id,)
    )

    subjects = cur.fetchall()

    cur.close()
    conn.close()

    return subjects


def delete_subject(subject_id, user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        DELETE FROM subjects
        WHERE id = %s AND user_id = %s
        RETURNING id;
        """,
        (subject_id, user_id)
    )

    deleted = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return deleted

def update_subject(subject_id, user_id, name, description):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE subjects
        SET name = %s,
            description = %s
        WHERE id = %s AND user_id = %s
        RETURNING id, user_id, name, description, created_at;
        """,
        (name, description, subject_id, user_id)
    )

    subject = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return subject