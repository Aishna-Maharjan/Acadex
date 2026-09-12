-- Acadex database schema additions
-- Run this against your existing database. Statements are written to be
-- safe to re-run (IF NOT EXISTS) and only add what's needed for the
-- notifications + community resource rating feature.

-- Notifications table (created here in case it does not already exist
-- in your database — notifications.py already assumes this shape).
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    post_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications(user_id, is_read);

-- Ratings for resources shared in the Community section.
-- One rating per user per post; re-rating updates the existing row.
CREATE TABLE IF NOT EXISTS post_ratings (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_ratings_post
    ON post_ratings(post_id);
