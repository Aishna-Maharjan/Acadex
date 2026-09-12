import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Profile.css";
import { getAvatarColor } from "../utils/notifications";
import { apiFetch, API_URL, clearSession } from "../utils/api";


export default function Profile() {
  const navigate = useNavigate();
  const userId = Number(localStorage.getItem("userId"));

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState(
    userId ? "" : "You need to log in to view your profile."
  );

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", username: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  async function fetchProfile() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(`${API_URL}/users/${userId}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load profile");
      }

      setProfile(data);
      setFormData({
        name: data.name || "",
        username: data.username || "",
        email: data.email || "",
      });
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) {
      return;
    }

    // fetchProfile sets loading/error state itself (standard "kick off an
    // async fetch on mount" pattern) — safe to call directly here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function handleLogout() {
    const confirmed = window.confirm("Log out of Acadex?");
    if (!confirmed) return;

    clearSession();

    navigate("/", { replace: true });
  }

  function startEditing() {
    setFormData({
      name: profile?.name || "",
      username: profile?.username || "",
      email: profile?.email || "",
    });
    setProfileError("");
    setProfileSuccess("");
    setIsEditing(true);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const response = await apiFetch(`${API_URL}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update profile");
      }

      setProfile((prev) => ({ ...prev, ...data.user }));
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("username", data.user.username);

      setProfileSuccess("Profile updated!");
      setIsEditing(false);
    } catch (err) {
      console.error("Profile update error:", err);
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError("New passwords don't match.");
      return;
    }

    if (passwordData.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setSavingPassword(true);

    try {
      const response = await apiFetch(`${API_URL}/users/${userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update password");
      }

      setPasswordSuccess("Password updated!");
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setShowPasswordForm(false);
    } catch (err) {
      console.error("Password update error:", err);
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <Navbar />
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-page">
        <Navbar />

        <div className="profile-error">
          <h2>Unable to load profile</h2>
          <p>{error || "Something went wrong."}</p>

          {!userId ? (
            <button onClick={() => navigate("/")}>Go to Login</button>
          ) : (
            <button onClick={fetchProfile}>Try Again</button>
          )}
        </div>
      </div>
    );
  }

  const initial = (profile.name || profile.username || "S").charAt(0).toUpperCase();

  return (
    <div className="profile-page">
      <Navbar />

      <main className="profile-main">
        <section className="profile-header-card">
          <div
            className="profile-avatar-large"
            style={{ background: getAvatarColor(profile.username || profile.id) }}
          >
            {initial}
          </div>

          <div className="profile-header-info">
            <h1>{profile.name}</h1>
            <p className="profile-username">@{profile.username}</p>
            <p className="profile-email">{profile.email}</p>

            {profile.role && (
              <span className="profile-role-badge">{profile.role}</span>
            )}
          </div>

          <div className="profile-header-actions">
            {!isEditing && (
              <button
                type="button"
                className="profile-edit-button"
                onClick={startEditing}
              >
                Edit Profile
              </button>
            )}

            <button
              type="button"
              className="profile-logout-button"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </section>

        <section className="profile-stats-row">
          <div className="profile-stat-card">
            <span className="profile-stat-value">
              {profile.stats?.subjects ?? 0}
            </span>
            <span className="profile-stat-label">Subjects</span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-value">
              {profile.stats?.resources ?? 0}
            </span>
            <span className="profile-stat-label">Resources</span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-value">
              {profile.stats?.community_posts ?? 0}
            </span>
            <span className="profile-stat-label">Shared to Community</span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-value">
              {profile.stats?.likes_received ?? 0}
            </span>
            <span className="profile-stat-label">Likes Received</span>
          </div>
        </section>

        {isEditing && (
          <section className="profile-panel">
            <h2>Edit Profile</h2>

            <form onSubmit={handleSaveProfile} className="profile-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>

              {profileError && <p className="profile-form-error">{profileError}</p>}

              <div className="profile-form-actions">
                <button type="submit" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  className="profile-form-cancel"
                  onClick={() => {
                    setIsEditing(false);
                    setProfileError("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {!isEditing && profileSuccess && (
          <p className="profile-inline-success">{profileSuccess}</p>
        )}

        <section className="profile-panel">
          <div className="profile-panel-header">
            <h2>Password</h2>

            <button
              type="button"
              className="profile-link-button"
              onClick={() => {
                setShowPasswordForm((prev) => !prev);
                setPasswordError("");
                setPasswordSuccess("");
              }}
            >
              {showPasswordForm ? "Cancel" : "Change Password"}
            </button>
          </div>

          {!showPasswordForm && passwordSuccess && (
            <p className="profile-inline-success">{passwordSuccess}</p>
          )}

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      current_password: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      new_password: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      confirm_password: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              {passwordError && <p className="profile-form-error">{passwordError}</p>}

              <div className="profile-form-actions">
                <button type="submit" disabled={savingPassword}>
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
