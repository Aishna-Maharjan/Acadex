import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()

VALID_STATUSES = ("pending", "resolved", "dismissed")
VALID_REASONS = (
    "spam",
    "harassment",
    "inappropriate",
    "misinformation",
    "copyright",
    "other",
)


class ReportTableMissingError(Exception):
    """Raised when the reports table hasn't been created yet."""


class PostNotFoundError(Exception):
    """Raised when the post being reported doesn't exist."""


class AlreadyReportedError(Exception):
    """Raised when the same user reports the same post more than once."""


class ReportNotFoundError(Exception):
    """Raised when the report_id doesn't exist."""


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def create_report(post_id, reporter_id, reason, details):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO reports (post_id, reporter_id, reason, details)
            VALUES (%s, %s, %s, %s)
            RETURNING id, post_id, reporter_id, reason, details, status, created_at;
            """,
            (post_id, reporter_id, reason, details),
        )
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        cur.close()
        conn.close()
        raise ReportTableMissingError(
            "The reports table doesn't exist yet. Run DB/schema.sql against "
            "your database, then try again."
        )
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        cur.close()
        conn.close()
        raise AlreadyReportedError(
            "You've already reported this post. Our team will review it."
        )
    except psycopg2.errors.ForeignKeyViolation as exc:
        conn.rollback()
        cur.close()
        conn.close()
        raise PostNotFoundError(f"Post {post_id} does not exist.") from exc

    report = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return report


def get_reports(status=None):
    """Admin listing: every report, joined with the post, its owner, and the reporter."""
    conn = get_connection()
    cur = conn.cursor()

    try:
        query = """
            SELECT r.id,
                   r.post_id,
                   r.reporter_id,
                   reporter.username AS reporter_username,
                   r.reason,
                   r.details,
                   r.status,
                   r.created_at,
                   cp.title AS post_title,
                   cp.user_id AS post_owner_id,
                   owner.username AS post_owner_username
            FROM reports r
            JOIN users reporter ON r.reporter_id = reporter.id
            LEFT JOIN community_posts cp ON r.post_id = cp.id
            LEFT JOIN users owner ON cp.user_id = owner.id
        """
        params = ()

        if status:
            query += " WHERE r.status = %s"
            params = (status,)

        query += " ORDER BY r.created_at DESC;"

        cur.execute(query, params)
        reports = cur.fetchall()
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        cur.close()
        conn.close()
        raise ReportTableMissingError(
            "The reports table doesn't exist yet. Run DB/schema.sql against "
            "your database, then try again."
        )

    cur.close()
    conn.close()

    return reports


def get_report_counts_by_post():
    """Returns {post_id: pending_report_count} for posts with at least one pending report."""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT post_id, COUNT(*)
            FROM reports
            WHERE status = 'pending'
            GROUP BY post_id;
            """
        )
        rows = cur.fetchall()
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        cur.close()
        conn.close()
        return {}

    cur.close()
    conn.close()

    return {row[0]: row[1] for row in rows}


def update_report_status(report_id, status):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            UPDATE reports
            SET status = %s
            WHERE id = %s
            RETURNING id, post_id, reporter_id, reason, details, status, created_at;
            """,
            (status, report_id),
        )
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        cur.close()
        conn.close()
        raise ReportTableMissingError(
            "The reports table doesn't exist yet. Run DB/schema.sql against "
            "your database, then try again."
        )

    report = cur.fetchone()

    if report is None:
        conn.rollback()
        cur.close()
        conn.close()
        raise ReportNotFoundError(f"Report {report_id} does not exist.")

    conn.commit()
    cur.close()
    conn.close()

    return report


def delete_report(report_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM reports WHERE id = %s RETURNING id;",
        (report_id,),
    )

    deleted = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return deleted


def resolve_reports_for_post(post_id):
    """Mark every pending report against a post as resolved (used when an
    admin removes the reported post itself — the reports shouldn't stay
    stuck in 'pending' forever with nothing left to review)."""
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            UPDATE reports
            SET status = 'resolved'
            WHERE post_id = %s AND status = 'pending';
            """,
            (post_id,),
        )
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        cur.close()
        conn.close()
        return

    conn.commit()
    cur.close()
    conn.close()
