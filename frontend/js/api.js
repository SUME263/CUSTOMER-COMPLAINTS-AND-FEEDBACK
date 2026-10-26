// api client for communicating with the express backend
// update the base url when the backend is deployed
const API_BASE = "http://localhost:4000/api";

// retrieve the saved authentication token
function getToken() {
  return localStorage.getItem("ccf_token");
}

// save the user's session details
function setSession(token, user) {
  localStorage.setItem("ccf_token", token);
  localStorage.setItem("ccf_user", JSON.stringify(user));
}

// remove saved session details during logout
function clearSession() {
  localStorage.removeItem("ccf_token");
  localStorage.removeItem("ccf_user");
}

// retrieve the saved user details
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("ccf_user"));
  } catch {
    return null;
  }
}

// redirect to login if the session is missing or the role is incorrect
function requireSession(role) {
  const user = getUser();
  if (!user || !getToken() || (role && user.role !== role)) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// send requests to the backend and handle responses
async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE + path, { ...options, headers });
  } catch (err) {
    throw new Error(
      "Could not reach the server. Is the backend running on localhost:4000?",
    );
  }

  const data = await res.json().catch(() => ({}));

  // clear the session and redirect when authentication fails
  if (res.status === 401) {
    clearSession();
    window.location.href = "login.html";
    return null;
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// api methods for authentication, complaints, users and settings
const api = {
  login: (email, password) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  raiseComplaint: (payload) =>
    apiFetch("/complaints", { method: "POST", body: JSON.stringify(payload) }),
  trackComplaint: (ref) =>
    apiFetch(`/complaints/track/${encodeURIComponent(ref)}`),
  listComplaints: (filters = {}) => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v && v !== "all"),
    ).toString();
    return apiFetch(`/complaints${qs ? `?${qs}` : ""}`);
  },

  getComplaint: (id) => apiFetch(`/complaints/${id}`),
  updateComplaint: (id, payload) =>
    apiFetch(`/complaints/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  reportSummary: () => apiFetch("/reports/summary"),
  listUsers: () => apiFetch("/users"),
  createUser: (payload) =>
    apiFetch("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateUser: (id, payload) =>
    apiFetch(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getSettings: () => apiFetch("/settings"),
  updateSettings: (payload) =>
    apiFetch("/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getNotificationSettings: () => apiFetch("/notification-settings"),

  updateNotificationSettings: (payload) =>
    apiFetch("/notification-settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getNotifications: () => apiFetch("/notifications"),

  getUnreadNotificationCount: () => apiFetch("/notifications/unread-count"),

  markNotificationAsRead: (id) =>
    apiFetch(`/notifications/${id}/read`, {
      method: "PATCH",
    }),
};