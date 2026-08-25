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


def create_comment(post_id, user_id, comment):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO comments
        (post_id, user_id, comment)
        VALUES (%s, %s, %s)
        RETURNING id, post_id, user_id, comment, created_at;
        """,
        (post_id, user_id, comment)
    )

    new_comment = cur.fetchone()

    # Find the owner of the post
    cur.execute(
        """
        SELECT user_id
        FROM community_posts
        WHERE id = %s;
        """,
        (post_id,)
    )

    post_owner = cur.fetchone()

    if post_owner:
        owner_id = post_owner[0]

        # Don't notify users when they comment on their own post
        if owner_id != user_id:

            cur.execute(
                """
                INSERT INTO notifications
                (user_id, sender_id, type, message, post_id)
                VALUES (%s, %s, %s, %s, %s);
                """,
                (
                    owner_id,
                    user_id,
                    "comment",
                    "Someone commented on your post.",
                    post_id
                )
            )

    conn.commit()

    cur.close()
    conn.close()

    return new_comment


def get_comments(post_id):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT c.id,
               c.post_id,
               c.user_id,
               u.username,
               c.comment,
               c.created_at
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = %s
        ORDER BY c.created_at ASC;
        """,
        (post_id,)
    )

    comments = cur.fetchall()

    cur.close()
    conn.close()

    return comments


def delete_comment(comment_id, user_id):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        DELETE FROM comments
        WHERE id = %s AND user_id = %s
        RETURNING id;
        """,
        (comment_id, user_id)
    )

    deleted = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return deleted