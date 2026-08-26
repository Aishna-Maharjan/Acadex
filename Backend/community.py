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


def create_post(
    user_id,
    title,
    description,
    resource_type,
    resource_url
):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO community_posts
        (user_id, title, description, resource_type, resource_url)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, user_id, title, description,
                  resource_type, resource_url, created_at;
        """,
        (
            user_id,
            title,
            description,
            resource_type,
            resource_url
        )
    )

    post = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return post


def get_posts():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT cp.id,
               cp.user_id,
               u.username,
               cp.title,
               cp.description,
               cp.resource_type,
               cp.resource_url,
               cp.created_at
        FROM community_posts cp
        JOIN users u ON cp.user_id = u.id
        ORDER BY cp.created_at DESC;
        """
    )

    posts = cur.fetchall()

    cur.close()
    conn.close()

    return posts


def delete_post(post_id, user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        DELETE FROM community_posts
        WHERE id = %s AND user_id = %s
        RETURNING id;
        """,
        (post_id, user_id)
    )

    deleted = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return deleted

def update_post(
    post_id,
    user_id,
    title,
    description,
    resource_type,
    resource_url
):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE community_posts
        SET title = %s,
            description = %s,
            resource_type = %s,
            resource_url = %s
        WHERE id = %s AND user_id = %s
        RETURNING id, user_id, title, description,
                  resource_type, resource_url, created_at;
        """,
        (
            title,
            description,
            resource_type,
            resource_url,
            post_id,
            user_id
        )
    )

    post = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return post

def search_posts(keyword):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT cp.id,
               cp.user_id,
               u.username,
               cp.title,
               cp.description,
               cp.resource_type,
               cp.resource_url,
               cp.created_at
        FROM community_posts cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.title ILIKE %s
           OR cp.description ILIKE %s
           OR cp.resource_type ILIKE %s
        ORDER BY cp.created_at DESC;
        """,
        (
            f"%{keyword}%",
            f"%{keyword}%",
            f"%{keyword}%"
        )
    )

    posts = cur.fetchall()

    cur.close()
    conn.close()

    return posts