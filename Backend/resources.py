import psycopg2
import os
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


def create_resource(subject_id, title, description, resource_type, resource_url):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO resources
        (subject_id, title, description, resource_type, resource_url)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, subject_id, title, description,
                  resource_type, resource_url, is_favorite, created_at;
        """,
        (
            subject_id,
            title,
            description,
            resource_type,
            resource_url
        )
    )

    resource = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return resource


def get_resources(subject_id):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, subject_id, title, description,
               resource_type, resource_url, is_favorite, created_at
        FROM resources
        WHERE subject_id = %s
        ORDER BY created_at DESC;
        """,
        (subject_id,)
    )

    resources = cur.fetchall()

    cur.close()
    conn.close()

    return resources


def update_resource(
    resource_id,
    subject_id,
    title,
    description,
    resource_type,
    resource_url
):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE resources
        SET title = %s,
            description = %s,
            resource_type = %s,
            resource_url = %s
        WHERE id = %s AND subject_id = %s
        RETURNING id, subject_id, title, description,
                  resource_type, resource_url, is_favorite, created_at;
        """,
        (
            title,
            description,
            resource_type,
            resource_url,
            resource_id,
            subject_id
        )
    )

    resource = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return resource


def delete_resource(resource_id, subject_id):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        DELETE FROM resources
        WHERE id = %s AND subject_id = %s
        RETURNING id;
        """,
        (resource_id, subject_id)
    )

    deleted = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return deleted

def toggle_favorite(resource_id, subject_id):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE resources
        SET is_favorite = NOT is_favorite
        WHERE id = %s AND subject_id = %s
        RETURNING id, subject_id, title, is_favorite;
        """,
        (resource_id, subject_id)
    )

    resource = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return resource

def search_resources(subject_id, keyword):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, subject_id, title, description,
               resource_type, resource_url,
               is_favorite, created_at
        FROM resources
        WHERE subject_id = %s
        AND (
            title ILIKE %s
            OR description ILIKE %s
            OR resource_type ILIKE %s
        )
        ORDER BY created_at DESC;
        """,
        (
            subject_id,
            f"%{keyword}%",
            f"%{keyword}%",
            f"%{keyword}%"
        )
    )

    resources = cur.fetchall()

    cur.close()
    conn.close()

    return resources