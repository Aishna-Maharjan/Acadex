import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Notifications.css";

import like from "../assets/like.png";
import cmt from "../assets/cmt.png";
import empty from "../assets/empty.png";
import {
  getAvatarColor,
  getNotificationText,
  timeAgo,
} from "../utils/notifications";
import { apiFetch, API_URL } from "../utils/api";


function getBadgeIcon(type) {
  switch (type) {
    case "like":
      return like;
    case "comment":
      return cmt;
    default:
      return null;
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const userId = Number(localStorage.getItem("userId"));

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(`${API_URL}/notifications/${userId}`);

      if (!response.ok) {
        throw new Error("Failed to load notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Notifications fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));

    try {
      await apiFetch(`${API_URL}/notifications/${userId}/read-all`, {
        method: "PUT",
      });
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  }

  async function handleItemClick(notification) {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );

      try {
        await apiFetch(
          `${API_URL}/notifications/${notification.id}/read?user_id=${userId}`,
          { method: "PUT" },
        );
      } catch (err) {
        console.error("Mark read error:", err);
      }
    }

    if (notification.post_id) {
      navigate(`/community/resource/${notification.post_id}`);
    }
  }

  async function handleDelete(event, notificationId) {
    event.stopPropagation();

    const previous = notifications;
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));

    try {
      const response = await apiFetch(
        `${API_URL}/notifications/${notificationId}?user_id=${userId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
    } catch (err) {
      console.error("Delete notification error:", err);
      setNotifications(previous);
    }
  }

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  return (
    <div className="notifications-page">
      <Navbar />

      <main className="notifications-main">
        <div className="notifications-header">
          <div>
            <h1>Notifications</h1>
            <p>Likes, comments, and ratings on the resources you've shared.</p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="mark-all-read-button"
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="notifications-tabs">
          <button
            type="button"
            className={filter === "all" ? "notif-tab active" : "notif-tab"}
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            type="button"
            className={filter === "unread" ? "notif-tab active" : "notif-tab"}
            onClick={() => setFilter("unread")}
          >
            Unread
            {unreadCount > 0 && (
              <span className="notif-tab-count">{unreadCount}</span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="notifications-loading">Loading notifications...</div>
        ) : error ? (
          <div className="notifications-error">
            <p>{error}</p>
            <button onClick={fetchNotifications}>Try Again</button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <img src={empty} alt="No notifications" />
            <h3>
              {filter === "unread" ? "You're all caught up" : "No notifications yet"}
            </h3>
            <p>
              {filter === "unread"
                ? "New likes, comments, and ratings will show up here."
                : "When someone interacts with your shared resources, you'll see it here."}
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map((notification) => {
              const initial = (
                notification.sender_username ||
                notification.sender_name ||
                "?"
              )
                .charAt(0)
                .toUpperCase();

              const badgeIcon = getBadgeIcon(notification.type);

              return (
                <div
                  key={notification.id}
                  className={
                    notification.is_read
                      ? "notification-row"
                      : "notification-row unread"
                  }
                  onClick={() => handleItemClick(notification)}
                >
                  <span className="notification-row-avatar-wrap">
                    <span
                      className="notification-row-avatar"
                      style={{
                        background: getAvatarColor(
                          notification.sender_username || notification.sender_id,
                        ),
                      }}
                    >
                      {initial}
                    </span>

                    <span className="notification-row-badge">
                      {badgeIcon ? <img src={badgeIcon} alt="" /> : "★"}
                    </span>
                  </span>

                  <div className="notification-row-body">
                    <p className="notification-row-text">
                      {getNotificationText(notification)}
                    </p>

                    <span className="notification-row-time">
                      {timeAgo(notification.created_at)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="notification-row-delete"
                    aria-label="Delete notification"
                    onClick={(event) => handleDelete(event, notification.id)}
                  >
                    ×
                  </button>

                  {!notification.is_read && (
                    <span className="notification-row-dot" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
