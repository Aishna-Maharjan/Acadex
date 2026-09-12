import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";
import { apiFetch, API_URL, clearSession } from "../utils/api";
import { getAvatarColor } from "../utils/notifications";

const REASON_LABELS = {
  spam: "Spam",
  harassment: "Harassment or bullying",
  inappropriate: "Inappropriate content",
  misinformation: "False information",
  copyright: "Copyright violation",
  other: "Something else",
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export default function Admin() {
  const navigate = useNavigate();
  const currentUserId = Number(localStorage.getItem("userId"));
  const currentUserName = localStorage.getItem("userName") || "Admin";

  const [tab, setTab] = useState("overview");

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState("pending");

  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (tab === "users" && !usersLoaded) fetchUsers();
    if (tab === "posts" && !postsLoaded) fetchPosts();
    if (tab === "reports") fetchReports(reportFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, reportFilter]);

  async function fetchStats() {
    setStatsLoading(true);
    try {
      const response = await apiFetch(`${API_URL}/admin/dashboard`);
      if (!response.ok) throw new Error("Failed to load dashboard stats");
      const data = await response.json();
      setStats(data.dashboard);
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError(err.message);
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const response = await apiFetch(`${API_URL}/admin/users`);
      if (!response.ok) throw new Error("Failed to load users");
      const data = await response.json();
      setUsers(data.users || []);
      setUsersLoaded(true);
    } catch (err) {
      console.error("Admin users error:", err);
      setError(err.message);
    } finally {
      setUsersLoading(false);
    }
  }

  async function fetchPosts() {
    setPostsLoading(true);
    try {
      const response = await apiFetch(`${API_URL}/admin/posts`);
      if (!response.ok) throw new Error("Failed to load posts");
      const data = await response.json();
      setPosts(data.posts || []);
      setPostsLoaded(true);
    } catch (err) {
      console.error("Admin posts error:", err);
      setError(err.message);
    } finally {
      setPostsLoading(false);
    }
  }

  async function fetchReports(status) {
    setReportsLoading(true);
    try {
      const query = status && status !== "all" ? `?status=${status}` : "";
      const response = await apiFetch(`${API_URL}/admin/reports${query}`);
      if (!response.ok) throw new Error("Failed to load reports");
      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error("Admin reports error:", err);
      setError(err.message);
    } finally {
      setReportsLoading(false);
    }
  }

  async function handleRoleChange(userId, nextRole) {
    const confirmed = window.confirm(
      nextRole === "admin"
        ? "Give this user admin access?"
        : "Remove admin access from this user?",
    );
    if (!confirmed) return;

    try {
      const response = await apiFetch(`${API_URL}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Failed to update role");

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)),
      );
    } catch (err) {
      console.error("Role update error:", err);
      alert(err.message);
    }
  }

  async function handleDeleteUser(userId, username) {
    const confirmed = window.confirm(
      `Delete @${username}'s account? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const response = await apiFetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Failed to delete user");

      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Delete user error:", err);
      alert(err.message);
    }
  }

  async function handleDeletePost(postId, refreshReports) {
    const confirmed = window.confirm(
      "Remove this post from Community? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      const response = await apiFetch(`${API_URL}/admin/community/${postId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Failed to delete post");

      setPosts((prev) => prev.filter((p) => p.id !== postId));

      if (refreshReports) {
        fetchReports(reportFilter);
      }

      fetchStats();
    } catch (err) {
      console.error("Delete post error:", err);
      alert(err.message);
    }
  }

  async function handleReportStatus(reportId, status) {
    try {
      const response = await apiFetch(`${API_URL}/admin/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Failed to update report");

      if (reportFilter === "all") {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status } : r)),
        );
      } else {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      }

      fetchStats();
    } catch (err) {
      console.error("Report status error:", err);
      alert(err.message);
    }
  }

  async function handleDismissReport(reportId) {
    const confirmed = window.confirm("Remove this report from the queue?");
    if (!confirmed) return;

    try {
      const response = await apiFetch(`${API_URL}/admin/reports/${reportId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Failed to remove report");

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      fetchStats();
    } catch (err) {
      console.error("Delete report error:", err);
      alert(err.message);
    }
  }

  function handleLogout() {
    const confirmed = window.confirm("Log out of Acadex Admin?");
    if (!confirmed) return;
    clearSession();
    window.location.href = "/";
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">A</span>
          <div>
            <strong>Acadex</strong>
            <span>Admin</span>
          </div>
        </div>

        <nav className="admin-nav">
          <button
            type="button"
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={tab === "users" ? "active" : ""}
            onClick={() => setTab("users")}
          >
            Users
          </button>
          <button
            type="button"
            className={tab === "posts" ? "active" : ""}
            onClick={() => setTab("posts")}
          >
            Posts
          </button>
          <button
            type="button"
            className={tab === "reports" ? "active" : ""}
            onClick={() => setTab("reports")}
          >
            Reports
            {stats?.pending_reports > 0 && (
              <span className="admin-nav-badge">{stats.pending_reports}</span>
            )}
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-exit-button"
            onClick={() => navigate("/home")}
          >
            ← Back to site
          </button>
          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>
              {tab === "overview" && "Overview"}
              {tab === "users" && "Users"}
              {tab === "posts" && "Community posts"}
              {tab === "reports" && "Reports"}
            </h1>
            <p>Signed in as @{currentUserName}</p>
          </div>
        </header>

        {error && (
          <div className="admin-error-banner">
            {error}
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {tab === "overview" && (
          <OverviewTab stats={stats} loading={statsLoading} onRetry={fetchStats} />
        )}

        {tab === "users" && (
          <UsersTab
            users={users}
            loading={usersLoading}
            currentUserId={currentUserId}
            onRoleChange={handleRoleChange}
            onDelete={handleDeleteUser}
          />
        )}

        {tab === "posts" && (
          <PostsTab
            posts={posts}
            loading={postsLoading}
            onView={(id) => navigate(`/community/resource/${id}`)}
            onDelete={(id) => handleDeletePost(id, false)}
          />
        )}

        {tab === "reports" && (
          <ReportsTab
            reports={reports}
            loading={reportsLoading}
            filter={reportFilter}
            onFilterChange={setReportFilter}
            onView={(postId) => navigate(`/community/resource/${postId}`)}
            onResolve={(id) => handleReportStatus(id, "resolved")}
            onDismiss={(id) => handleReportStatus(id, "dismissed")}
            onDeleteReportEntry={handleDismissReport}
            onRemovePost={(postId) => handleDeletePost(postId, true)}
          />
        )}
      </main>
    </div>
  );
}

function OverviewTab({ stats, loading, onRetry }) {
  if (loading) {
    return <div className="admin-loading">Loading dashboard...</div>;
  }

  if (!stats) {
    return (
      <div className="admin-empty">
        <p>Couldn't load dashboard stats.</p>
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  const cards = [
    { label: "Total users", value: stats.total_users },
    { label: "Subjects created", value: stats.total_subjects },
    { label: "Resources added", value: stats.total_resources },
    { label: "Community posts", value: stats.total_posts },
    { label: "Pending reports", value: stats.pending_reports, warn: stats.pending_reports > 0 },
  ];

  return (
    <div className="admin-stats-grid">
      {cards.map((card) => (
        <div
          key={card.label}
          className={card.warn ? "admin-stat-card warn" : "admin-stat-card"}
        >
          <span className="admin-stat-value">{card.value}</span>
          <span className="admin-stat-label">{card.label}</span>
        </div>
      ))}
    </div>
  );
}

function UsersTab({ users, loading, currentUserId, onRoleChange, onDelete }) {
  if (loading) {
    return <div className="admin-loading">Loading users...</div>;
  }

  if (users.length === 0) {
    return <div className="admin-empty">No users found.</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="admin-user-cell">
                  <span
                    className="admin-avatar"
                    style={{ background: getAvatarColor(u.username || u.id) }}
                  >
                    {(u.name || u.username || "U").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <strong>{u.name}</strong>
                    <span>@{u.username}</span>
                  </div>
                </div>
              </td>
              <td>{u.email}</td>
              <td>
                <span
                  className={
                    u.role === "admin"
                      ? "admin-role-badge admin"
                      : "admin-role-badge"
                  }
                >
                  {u.role}
                </span>
              </td>
              <td>{formatDate(u.created_at)}</td>
              <td>
                <div className="admin-row-actions">
                  {u.id === currentUserId ? (
                    <span className="admin-you-tag">You</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="admin-link-button"
                        onClick={() =>
                          onRoleChange(u.id, u.role === "admin" ? "user" : "admin")
                        }
                      >
                        {u.role === "admin" ? "Demote" : "Make admin"}
                      </button>
                      <button
                        type="button"
                        className="admin-link-button danger"
                        onClick={() => onDelete(u.id, u.username)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostsTab({ posts, loading, onView, onDelete }) {
  if (loading) {
    return <div className="admin-loading">Loading posts...</div>;
  }

  if (posts.length === 0) {
    return <div className="admin-empty">No community posts yet.</div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Type</th>
            <th>Likes</th>
            <th>Comments</th>
            <th>Reports</th>
            <th>Posted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}>
              <td className="admin-post-title">{p.title}</td>
              <td>@{p.username}</td>
              <td>{p.resource_type || "—"}</td>
              <td>{p.like_count}</td>
              <td>{p.comment_count}</td>
              <td>
                {p.pending_reports > 0 ? (
                  <span className="admin-report-count">{p.pending_reports}</span>
                ) : (
                  "—"
                )}
              </td>
              <td>{formatDate(p.created_at)}</td>
              <td>
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="admin-link-button"
                    onClick={() => onView(p.id)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="admin-link-button danger"
                    onClick={() => onDelete(p.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsTab({
  reports,
  loading,
  filter,
  onFilterChange,
  onView,
  onResolve,
  onDismiss,
  onDeleteReportEntry,
  onRemovePost,
}) {
  return (
    <div className="admin-reports">
      <div className="admin-filter-row">
        {["pending", "resolved", "dismissed", "all"].map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? "admin-filter-chip active" : "admin-filter-chip"}
            onClick={() => onFilterChange(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-loading">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="admin-empty">No {filter !== "all" ? filter : ""} reports.</div>
      ) : (
        <div className="admin-report-list">
          {reports.map((r) => (
            <div key={r.id} className="admin-report-card">
              <div className="admin-report-card-top">
                <span className="admin-reason-tag">
                  {REASON_LABELS[r.reason] || r.reason}
                </span>
                <span className={`admin-status-tag status-${r.status}`}>
                  {r.status}
                </span>
              </div>

              <p className="admin-report-post-title">
                {r.post_title ? `"${r.post_title}"` : "(post no longer exists)"}
                {r.post_owner_username && (
                  <span> — by @{r.post_owner_username}</span>
                )}
              </p>

              {r.details && <p className="admin-report-details">{r.details}</p>}

              <p className="admin-report-meta">
                Reported by @{r.reporter_username} on {formatDate(r.created_at)}
              </p>

              <div className="admin-row-actions">
                {r.post_id && (
                  <button
                    type="button"
                    className="admin-link-button"
                    onClick={() => onView(r.post_id)}
                  >
                    View post
                  </button>
                )}

                {r.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className="admin-link-button"
                      onClick={() => onResolve(r.id)}
                    >
                      Mark resolved
                    </button>
                    <button
                      type="button"
                      className="admin-link-button"
                      onClick={() => onDismiss(r.id)}
                    >
                      Dismiss
                    </button>
                    {r.post_id && (
                      <button
                        type="button"
                        className="admin-link-button danger"
                        onClick={() => onRemovePost(r.post_id)}
                      >
                        Remove post
                      </button>
                    )}
                  </>
                )}

                {r.status !== "pending" && (
                  <button
                    type="button"
                    className="admin-link-button danger"
                    onClick={() => onDeleteReportEntry(r.id)}
                  >
                    Remove from list
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
