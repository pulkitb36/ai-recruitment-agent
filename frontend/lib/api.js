import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_BASE });

// ── Resume ─────────────────────────────────────────────────────
export async function uploadResume(file, jdText, userId = null) {
  const form = new FormData();
  form.append("file", file);
  form.append("jd", jdText);
  if (userId) form.append("user_id", userId);
  const res = await api.post("/api/upload-resume", form);
  if (res.data.error) throw new Error(res.data.error);
  if (!res.data.candidate_id) throw new Error("Upload succeeded but no candidate_id was returned");
  return res.data;
}

// ── Interview ──────────────────────────────────────────────────
export async function startInterview(candidateId) {
  const res = await api.post(`/api/start-interview/${candidateId}`);
  return res.data;
}

// ── Report ─────────────────────────────────────────────────────
export async function getReport(sessionId) {
  const res = await api.get(`/api/report/${sessionId}`);
  return res.data;
}

// ── Candidates ─────────────────────────────────────────────────
export async function getCandidates(token) {
  const res = await api.get("/api/candidates", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function deleteCandidate(candidateId, token) {
  const res = await api.delete(`/api/candidates/${candidateId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function getCandidateReport(candidateId, token) {
  const res = await api.get(`/api/candidates/${candidateId}/report`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// ── Job Roles ──────────────────────────────────────────────────
export async function getRoles() {
  const res = await api.get("/api/roles");
  return res.data;
}

export async function createRole(title, description, token) {
  const res = await api.post(
    "/api/roles",
    { title, description },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export async function deleteRole(roleId, token) {
  const res = await api.delete(`/api/roles/${roleId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// ── Auth ───────────────────────────────────────────────────────
export async function loginUser(email, password) {
  const res = await api.post("/api/auth/login", { email, password });
  if (res.data.error) throw new Error(res.data.error);
  return res.data;
}

export async function signupUser(name, email, password) {
  const res = await api.post("/api/auth/signup", { name, email, password });
  if (res.data.error) throw new Error(res.data.error);
  return res.data;
}

// ── Session ────────────────────────────────────────────────────
export function getSession() {
  if (typeof window === "undefined") {
    return { token: null, email: null, role: null, name: null, sub: null };
  }
  return {
    token: localStorage.getItem("token"),
    email: localStorage.getItem("email"),
    role:  localStorage.getItem("role"),
    name:  localStorage.getItem("name"),
    sub:   localStorage.getItem("sub"),
  };
}

export function saveSession(token, email, role, name = "", sub = "") {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  localStorage.setItem("email", email);
  localStorage.setItem("role", role);
  localStorage.setItem("name", name);
  localStorage.setItem("sub", sub);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  localStorage.removeItem("role");
  localStorage.removeItem("name");
  localStorage.removeItem("sub");
}

// ── WebSocket ──────────────────────────────────────────────────
export function createInterviewSocket(sessionId, onAudio, onTranscript) {
  const WS_BASE = API_BASE.replace("http", "ws");
  const ws = new WebSocket(`${WS_BASE}/ws/interview/${sessionId}`);
  ws.binaryType = "blob";

  ws.onmessage = (event) => {
    if (event.data instanceof Blob) {
      onAudio(event.data);
    } else {
      try {
        const data = JSON.parse(event.data);
        onTranscript(data);
      } catch (e) {
        console.error("WS parse error:", e);
      }
    }
  };

  ws.onerror  = (err) => console.error("WebSocket error:", err);
  ws.onclose  = () => console.log("WebSocket closed");

  return ws;
}

export default api;