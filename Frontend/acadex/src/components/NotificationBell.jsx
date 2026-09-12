import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationBell.css";

import notificationIcon from "../assets/notification.png";
import like from "../assets/like.png";
import cmt from "../assets/cmt.png";
import {
  getAvatarColor,
  getNotificationText,
  timeAgo,
} from "../utils/notifications";
import { apiFetch, API_URL } from "../utils/api";

const POLL_INTERVAL_MS = 20000;
const PREVIEW_LIMIT = 6;

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

export default function NotificationBell() {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const userId = Number(localStorage.getItem("userId"));

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;

    fetchNotifications();

    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const response = await apiFetch(`${API_URL}/notifications/${userId}`);

      if (!response.ok) return;

      const data = await response.json();
      const fetched = data.notifications || [];

      setNotifications(fetched);
      setUnreadCount(fetched.filter((item) => !item.is_read).length);
    } catch (error) {
      console.error("Notification fetch error:", error);
    }
  }

  async function toggleOpen() {
    const next = !isOpen;
    setIsOpen(next);

    if (next) {
      await fetchNotifications();
    }
  }

  async function handleNotificationClick(notification) {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));

      try {
        await apiFetch(
          `${API_URL}/notifications/${notification.id}/read?user_id=${userId}`,
          { method: "PUT" },
        );
      } catch (error) {
        console.error("Mark notification read error:", error);
      }
    }

    setIsOpen(false);

    if (notification.post_id) {
      navigate(`/community/resource/${notification.post_id}`);
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);

    try {
      await apiFetch(`${API_URL}/notifications/${userId}/read-all`, {
        method: "PUT",
      });
    } catch (error) {
      console.error("Mark all read error:", error);
    }
  }

  const previewNotifications = notifications.slice(0, PREVIEW_LIMIT);

  return (
    <div className="notification-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="notification-btn"
        aria-label="Notifications"
        onClick={toggleOpen}
      >
        <img src={notificationIcon} alt="Notifications" />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>

            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {previewNotifications.length === 0 ? (
              <p className="notification-empty">No notifications yet.</p>
            ) : (
              previewNotifications.map((notification) => {
                const initial = (
                  notification.sender_username ||
                  notification.sender_name ||
                  "?"
                )
                  .charAt(0)
                  .toUpperCase();

                const badgeIcon = getBadgeIcon(notification.type);

                return (
                  <button
                    type="button"
                    key={notification.id}
                    className={
                      notification.is_read
                        ? "notification-item"
                        : "notification-item unread"
                    }
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <span className="notification-item-avatar-wrap">
                      <span
                        className="notification-item-avatar"
                        style={{
                          background: getAvatarColor(
                            notification.sender_username || notification.sender_id,
                          ),
                        }}
                      >
                        {initial}
                      </span>

                      <span className="notification-item-badge">
                        {badgeIcon ? <img src={badgeIcon} alt="" /> : "★"}
                      </span>
                    </span>

                    <span className="notification-item-body">
                      <span className="notification-item-text">
                        {getNotificationText(notification)}
                      </span>

                      <span className="notification-item-time">
                        {timeAgo(notification.created_at)}
                      </span>
                    </span>

                    {!notification.is_read && (
                      <span className="notification-dot" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            className="notification-view-all"
            onClick={() => {
              setIsOpen(false);
              navigate("/notifications");
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
