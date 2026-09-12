import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()


class RatingTableMissingError(Exception):
    """Raised when post_ratings (or notifications) hasn't been created yet."""


class PostNotFoundError(Exception):
    """Raised when the post_id being rated doesn't exist."""


class UserNotFoundError(Exception):
    """Raised when the user_id submitting the rating doesn't exist."""


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


def rate_post(post_id, user_id, rating):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO post_ratings (post_id, user_id, rating)
            VALUES (%s, %s, %s)
            ON CONFLICT (post_id, user_id)
            DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()
            RETURNING id, post_id, user_id, rating, (xmax = 0) AS is_new;
            """,
            (post_id, user_id, rating)
        )
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        cur.close()
        conn.close()
        raise RatingTableMissingError(
            "The post_ratings table doesn't exist yet. Run DB/schema.sql "
            "against your database, then try again."
        )
    except psycopg2.errors.ForeignKeyViolation as exc:
        conn.rollback()

        # Figure out which id was invalid so the caller gets an accurate
        # error instead of a generic "Post not found".
        cur.execute("SELECT 1 FROM community_posts WHERE id = %s;", (post_id,))
        post_exists = cur.fetchone() is not None

        cur.close()
        conn.close()

        if not post_exists:
            raise PostNotFoundError(f"Post {post_id} does not exist.") from exc

        raise UserNotFoundError(f"User {user_id} does not exist.") from exc

    result = cur.fetchone()

    if result:
        is_new_rating = result[4]

        if is_new_rating:
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

                # Don't notify users when they rate their own post
                if owner_id != user_id:
                    try:
                        cur.execute("SAVEPOINT notif;")
                        cur.execute(
                            """
                            INSERT INTO notifications
                            (user_id, sender_id, type, message, post_id)
                            VALUES (%s, %s, %s, %s, %s);
                            """,
                            (
                                owner_id,
                                user_id,
                                "rating",
                                "Someone rated your post.",
                                post_id
                            )
                        )
                        cur.execute("RELEASE SAVEPOINT notif;")
                    except psycopg2.errors.UndefinedTable:
                        # Notifications are a nice-to-have here; don't let a
                        # missing notifications table stop the rating from
                        # being saved.
                        cur.execute("ROLLBACK TO SAVEPOINT notif;")

    conn.commit()
    cur.close()
    conn.close()

    return result


def get_post_rating(post_id):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT COALESCE(AVG(rating), 0), COUNT(*)
            FROM post_ratings
            WHERE post_id = %s;
            """,
            (post_id,)
        )
        average, count = cur.fetchone()
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        cur.close()
        conn.close()
        raise RatingTableMissingError(
            "The post_ratings table doesn't exist yet. Run DB/schema.sql "
            "against your database, then try again."
        )

    cur.close()
    conn.close()

    return round(float(average), 2), count


def get_user_rating(post_id, user_id):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT rating
            FROM post_ratings
            WHERE post_id = %s AND user_id = %s;
            """,
            (post_id, user_id)
        )
        result = cur.fetchone()
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        cur.close()
        conn.close()
        raise RatingTableMissingError(
            "The post_ratings table doesn't exist yet. Run DB/schema.sql "
            "against your database, then try again."
        )

    cur.close()
    conn.close()

    return result[0] if result else 0
