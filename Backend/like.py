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


def like_post(post_id, user_id):

    conn = get_connection()
    cur = conn.cursor()

    # Add the like
    cur.execute(
        """
        INSERT INTO post_likes (post_id, user_id)
        VALUES (%s, %s)
        ON CONFLICT (post_id, user_id) DO NOTHING
        RETURNING id;
        """,
        (post_id, user_id)
    )

    liked = cur.fetchone()

    # Only create notification if a new like was actually added
    if liked:

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

            # Don't notify users when they like their own post
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
                        "like",
                        "Someone liked your post.",
                        post_id
                    )
                )

    conn.commit()

    cur.close()
    conn.close()

    return liked


def unlike_post(post_id, user_id):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        DELETE FROM post_likes
        WHERE post_id = %s AND user_id = %s
        RETURNING id;
        """,
        (post_id, user_id)
    )

    unliked = cur.fetchone()

    conn.commit()

    cur.close()
    conn.close()

    return unliked


def get_post_likes(post_id):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT COUNT(*)
        FROM post_likes
        WHERE post_id = %s;
        """,
        (post_id,)
    )

    count = cur.fetchone()[0]

    cur.close()
    conn.close()

    return count