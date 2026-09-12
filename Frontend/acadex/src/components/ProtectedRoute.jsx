import { Navigate } from "react-router-dom";

// Wrap any <Route element={...}> that should require a logged-in user.
// This is a client-side convenience redirect only — the real
// authorization boundary is enforced by the backend on every request
// (missing/expired/invalid tokens get a 401 there regardless of this).
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}
