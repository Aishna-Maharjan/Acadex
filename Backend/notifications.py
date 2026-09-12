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


def create_notification(
    user_id,
    sender_id,
    notification_type,
    message,
    post_id=None
):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO notifications
        (user_id, sender_id, type, message, post_id)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, user_id, sender_id, type,
                  message, post_id, is_read, created_at;
        """,
        (
            user_id,
            sender_id,
            notification_type,
            message,
            post_id
        )
    )

    notification = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return notification


def get_notifications(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT n.id,
               n.user_id,
               n.sender_id,
               n.type,
               n.message,
               n.post_id,
               n.is_read,
               n.created_at,
               u.username AS sender_username,
               u.name AS sender_name,
               cp.title AS post_title
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        LEFT JOIN community_posts cp ON n.post_id = cp.id
        WHERE n.user_id = %s
        ORDER BY n.created_at DESC;
        """,
        (user_id,)
    )

    notifications = cur.fetchall()

    cur.close()
    conn.close()

    return notifications


def mark_notification_read(notification_id, user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = %s AND user_id = %s
        RETURNING id;
        """,
        (notification_id, user_id)
    )

    notification = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return notification

def mark_all_notifications_read(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = %s AND is_read = FALSE
        RETURNING id;
        """,
        (user_id,)
    )

    updated = cur.fetchall()

    conn.commit()
    cur.close()
    conn.close()

    return updated


def get_unread_count(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = %s AND is_read = FALSE;
        """,
        (user_id,)
    )

    count = cur.fetchone()[0]

    cur.close()
    conn.close()

    return count


def delete_notification(notification_id, user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        DELETE FROM notifications
        WHERE id = %s AND user_id = %s
        RETURNING id;
        """,
        (notification_id, user_id)
    )

    deleted = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return deleted
