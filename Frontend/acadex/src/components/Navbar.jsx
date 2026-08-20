import { Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
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
        <Link to="/profile" className="profile-link">
          Profile
        </Link>

        <button className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
}