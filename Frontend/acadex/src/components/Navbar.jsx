import { Link } from "react-router-dom";
import "./Navbar.css";

import notification from "../assets/notification.png";

export default function Navbar() {
  const userName = localStorage.getItem("userName") || "Student";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <nav className="navbar">
      <div className="logo-area">
        <Link to="/home" className="logo">
          Acadex
        </Link>
      </div>

      <div className="nav-links">
        <Link to="/home">Home</Link>
        <Link to="/personal">Personal Space</Link>
        <Link to="/community">Community</Link>
      </div>

      <div className="nav-actions">
        <button
          className="icon-btn notification-btn"
          aria-label="Notifications"
        >
          <img src={notification} alt="Notification" />
        </button>

        <Link to="/profile" className="profile-avatar" aria-label="Profile">
          {initial}
        </Link>
      </div>
    </nav>
  );
}
