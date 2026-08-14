const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "frv2_token";
const USER_KEY = "frv2_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function storeSession(accessToken, userId, username) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify({ userId, username }));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * ApiError carries the HTTP status so callers can distinguish, e.g.,
 * 401 (session expired) from 409 (username taken) from 502 (Groq failed).
 */
export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, { method = "GET", body, isForm = false, auth = true } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let payload = body;
  if (body && !isForm) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Network error — check your connection.");
  }

  if (res.status === 401 && auth) {
    clearSession();
    if (onUnauthorized) onUnauthorized();
  }

  if (!res.ok) {
    let detail = "Something went wrong.";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ---------- Auth ----------
export const auth = {
  signup: (username, password) =>
    request("/auth/signup", { method: "POST", body: { username, password }, auth: false }),
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password }, auth: false }),
};

// ---------- NutriScan ----------
export const nutriscan = {
  analyze: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/nutriscan/analyze", { method: "POST", body: form, isForm: true });
  },
  analyzeLabel: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/nutriscan/analyze-label", { method: "POST", body: form, isForm: true });
  },
  log: (entry) => request("/nutriscan/log", { method: "POST", body: entry }),
  history: (limit = 50) => request(`/nutriscan/history?limit=${limit}`),
  dailySummary: (date) => request(`/nutriscan/daily-summary${date ? `?date=${date}` : ""}`),
  deleteEntry: (id) => request(`/nutriscan/entry/${id}`, { method: "DELETE" }),
};

// ---------- First Responder ----------
export const firstResponder = {
  chat: (message, imageFile) => {
    const form = new FormData();
    form.append("message", message);
    if (imageFile) form.append("image", imageFile);
    return request("/first-responder/chat", { method: "POST", body: form, isForm: true });
  },
  history: (limit = 50) => request(`/first-responder/history?limit=${limit}`),
};

// ---------- Hospital Selector ----------
export const hospitalSelector = {
  nearest: (description, lat, lng, topN = 3) =>
    request("/hospital-selector/nearest", {
      method: "POST",
      body: { description, lat, lng, top_n: topN },
    }),
};
