// Central place for talking to the backend.
// - Adds the JWT (if we have one) to every request automatically.
// - On a 401 (expired/invalid/missing token), clears the session and
//   bounces the user back to the login page instead of failing silently.

export const API_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("token");
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
}

/**
 * Drop-in replacement for fetch() that:
 *  - prefixes the path with API_URL if a relative path is given
 *  - attaches "Authorization: Bearer <token>" when we have one
 *  - sets JSON headers automatically when a plain object body is passed
 *  - redirects to /login on 401 responses
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const token = getToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearSession();
    if (window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  return response;
}
