import { Navigate } from "react-router-dom";

// Wrap the /admin route: requires both a logged-in session (token) AND
// the admin role. Non-admins are bounced to /home rather than /, since
// they ARE logged in — just not authorized for this page. The real
// authorization boundary is enforced by the backend (require_admin) on
// every admin request regardless of this client-side check.
export default function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return children;
}
