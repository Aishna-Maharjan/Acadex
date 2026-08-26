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

def get_all_users():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, username, email, created_at
        FROM users
        ORDER BY created_at DESC;
        """
    )
    users = cur.fetchall()
    cur.close()
    conn.close()
    return users

def admin_delete_post(post_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        DELETE FROM community_posts
        WHERE id = %s
        RETURNING id;
        """,
        (post_id,)
    )
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return deleted

def get_dashboard_stats():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM users;")
    total_users = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM subjects;")
    total_subjects = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM resources;")
    total_resources = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM community_posts;")
    total_posts = cur.fetchone()[0]

    cur.close()
    conn.close()
    return {
        "total_users": total_users,
        "total_subjects": total_subjects,
        "total_resources": total_resources,
        "total_posts": total_posts
    }