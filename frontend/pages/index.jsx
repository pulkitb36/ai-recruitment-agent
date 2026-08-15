import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { uploadResume, startInterview, getSession, clearSession, getRoles } from "../lib/api";

export default function Home() {
  const router = useRouter();
  const [jd, setJd]                         = useState("");
  const [file, setFile]                     = useState(null);
  const [result, setResult]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [session, setSession]               = useState(null);
  const [mounted, setMounted]               = useState(false);
  const [roles, setRoles]                   = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  useEffect(() => {
    setMounted(true);
    const s = getSession();
    if (!s.token) {
      router.push("/login");
      return;
    }
    setSession(s);
    getRoles().then(setRoles).catch(() => {});
  }, []);

  const handleUpload = async () => {
    if (!file || !selectedRoleId) {
      setError("Please select a role and upload a resume.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Get user id from session
      const s      = getSession();
      console.log("Session:", s);
      const userId = s.sub || null;
      const data   = await uploadResume(file, jd, userId);
      setResult(data);
    } catch (err) {
      setError(err.message || "Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async (candidateId) => {
  try {
    const data = await startInterview(candidateId);
    router.push(`/interview?id=${data.session_id}`);
  } catch (err) {
    setError("Failed to start interview. Try again.");
  }
};

  const scorePct   = result?.score?.score ?? 0;
  const scoreColor = scorePct >= 80 ? "#0F6E56" : scorePct >= 60 ? "#854F0B" : "#A32D2D";
  const scoreBg    = scorePct >= 80 ? "#E1F5EE" : scorePct >= 60 ? "#FAEEDA" : "#FCEBEB";

  // Get display name — use session name if available
  const displayName = result?.parsed?.name && result.parsed.name !== "Unknown"
    ? result.parsed.name
    : (session?.name || "Candidate");

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>

      {/* Top bar */}
      <div style={{ borderBottom: "1px solid #E5E3DC", background: "#FFFFFF", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#534AB7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "15px" }}>
            AI
          </div>
          <span style={{ fontWeight: 600, fontSize: "16px", color: "#26215C" }}>Recruitment Agent</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "#888780" }}>
            {mounted && session ? (session.name || session.email) : ""}
          </span>
          <button onClick={() => { clearSession(); router.push("/login"); }}
            style={{ padding: "8px 16px", background: "transparent", border: "1px solid #D3D1C7", borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: "#5F5E5A" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 600, color: "#1a1a1a", marginBottom: "6px" }}>
          Screen a candidate
        </h1>
        <p style={{ fontSize: "14px", color: "#888780", marginBottom: "32px" }}>
          Select a role and upload a resume to get an instant match score.
        </p>

        {/* Upload card */}
        <div style={{ background: "#fff", border: "1px solid #E5E3DC", borderRadius: "16px", padding: "28px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>

          {/* Role selector */}
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#444441", marginBottom: "8px" }}>
            Role applying for
          </label>
          {roles.length === 0 ? (
            <div style={{ padding: "14px", borderRadius: "10px", border: "1px solid #D3D1C7", fontSize: "14px", color: "#888780", marginBottom: "20px", background: "#FAFAF8" }}>
              No roles available yet — ask your admin to add roles.
            </div>
          ) : (
            <select
              value={selectedRoleId}
              onChange={(e) => {
                const role = roles.find(r => r.id === e.target.value);
                setSelectedRoleId(e.target.value);
                setJd(role ? role.description : "");
              }}
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #D3D1C7", fontSize: "14px", marginBottom: "20px", background: "#FAFAF8", boxSizing: "border-box", fontFamily: "inherit", cursor: "pointer" }}
            >
              <option value="">Select a role...</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          )}

          {/* Resume upload */}
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#444441", marginBottom: "8px" }}>
            Resume
          </label>
          <div style={{ border: "1.5px dashed #D3D1C7", borderRadius: "10px", padding: "20px", textAlign: "center", marginBottom: "24px", background: "#FAFAF8" }}>
            <input type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files[0])} style={{ fontSize: "13px" }} />
            {file && (
              <p style={{ fontSize: "12px", color: "#5DCAA5", marginTop: "8px" }}>{file.name} selected</p>
            )}
          </div>

          {error && (
            <div style={{ background: "#FCEBEB", color: "#791F1F", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <button onClick={handleUpload} disabled={loading}
            style={{ padding: "12px 28px", background: loading ? "#AFA9EC" : "#534AB7", color: "white", border: "none", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 500, width: "100%" }}>
            {loading ? "Analyzing resume..." : "Screen candidate"}
          </button>
        </div>

        {/* Result card */}
        {result && (
          <div style={{ marginTop: "24px", background: "#fff", border: "1px solid #E5E3DC", borderRadius: "16px", padding: "28px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>
                  {displayName}
                </h2>
                <p style={{ fontSize: "13px", color: "#888780", margin: "4px 0 0" }}>
                  {result.parsed?.email}
                </p>
              </div>
              <div style={{ background: scoreBg, color: scoreColor, borderRadius: "10px", padding: "8px 16px", textAlign: "center", minWidth: "70px" }}>
                <div style={{ fontSize: "20px", fontWeight: 600 }}>{scorePct}%</div>
                <div style={{ fontSize: "10px" }}>match</div>
              </div>
            </div>

            {result.parsed?.skills?.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: 500, color: "#888780", marginBottom: "8px" }}>Skills</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {result.parsed.skills.map((s, i) => (
                    <span key={i} style={{ background: "#EEEDFE", color: "#3C3489", fontSize: "12px", padding: "4px 10px", borderRadius: "20px" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.score?.reasons_selected?.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <p style={{ fontSize: "12px", fontWeight: 500, color: "#888780", marginBottom: "6px" }}>Why they fit</p>
                {result.score.reasons_selected.map((r, i) => (
                  <p key={i} style={{ fontSize: "13px", color: "#27500A", margin: "2px 0" }}>+ {r}</p>
                ))}
              </div>
            )}

            {result.score?.reasons_rejected?.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <p style={{ fontSize: "12px", fontWeight: 500, color: "#888780", marginBottom: "6px" }}>Gaps</p>
                {result.score.reasons_rejected.map((r, i) => (
                  <p key={i} style={{ fontSize: "13px", color: "#791F1F", margin: "2px 0" }}>- {r}</p>
                ))}
              </div>
            )}

            <button onClick={() => handleStartInterview(result.candidate_id)}
              style={{ marginTop: "20px", padding: "12px 24px", background: "#1D9E75", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: 500, width: "100%" }}>
              Start AI interview →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}