import { NavLink, Link } from "react-router-dom";
import "./Navbar.css";

import logo from "../assets/logo.png"
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const userName = localStorage.getItem("userName") || "Student";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="logo-area">
          <Link to="/home" className="logo">
            <img src={logo} alt="Acadex" />
          </Link>
        </div>

        {/* Navigation */}
        <div className="nav-links">
          <NavLink
            to="/home"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Home
          </NavLink>

          <NavLink
            to="/personal"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Personal
          </NavLink>

          <NavLink
            to="/community"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Community
          </NavLink>
        </div>

        {/* Right side */}
        <div className="nav-actions">
          <NotificationBell />

          <Link to="/profile" className="profile-avatar" aria-label="Profile">
            {initial}
          </Link>
        </div>
      </div>
    </nav>
  );
}
