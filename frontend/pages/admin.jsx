import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  getCandidates, deleteCandidate, getCandidateReport,
  getRoles, createRole, deleteRole,
  getSession, clearSession
} from "../lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("candidates"); // "candidates" | "roles"

  // Candidates
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reports, setReports] = useState({});
  const [deleting, setDeleting] = useState(null);

  // Roles
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [addingRole, setAddingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

  useEffect(() => {
    const s = getSession();
    if (!s.token) { router.push("/login"); return; }
    if (s.role !== "admin") { router.push("/"); return; }
    setSession(s);

    getCandidates(s.token)
      .then(setCandidates)
      .finally(() => setLoadingCandidates(false));

    getRoles()
      .then(setRoles)
      .finally(() => setLoadingRoles(false));
  }, []);

  const handleDeleteCandidate = async (id) => {
    if (!confirm("Delete this candidate and all their data?")) return;
    setDeleting(id);
    await deleteCandidate(id, session.token);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  };

  const handleViewReport = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!reports[id]) {
      const report = await getCandidateReport(id, session.token);
      setReports((prev) => ({ ...prev, [id]: report }));
    }
  };

  const handleAddRole = async () => {
    if (!newTitle.trim() || !newDesc.trim()) {
      setRoleError("Both title and description are required.");
      return;
    }
    setRoleError("");
    setAddingRole(true);
    try {
      const role = await createRole(newTitle, newDesc, session.token);
      setRoles((prev) => [...prev, role]);
      setNewTitle("");
      setNewDesc("");
    } catch (e) {
      setRoleError(e.message);
    } finally {
      setAddingRole(false);
    }
  };

  const handleDeleteRole = async (id) => {
    if (!confirm("Delete this role?")) return;
    await deleteRole(id, session.token);
    setRoles((prev) => prev.filter((r) => r.id !== id));
  };

  const scoreColor = (s) => s >= 80 ? "#085041" : s >= 60 ? "#854F0B" : "#791F1F";
  const scoreBg = (s) => s >= 80 ? "#E1F5EE" : s >= 60 ? "#FAEEDA" : "#FCEBEB";

  const recStyle = {
    "Strong Hire": { bg: "#E1F5EE", color: "#085041" },
    "Hire":        { bg: "#E6F1FB", color: "#0C447C" },
    "Consider":    { bg: "#FAEEDA", color: "#854F0B" },
    "Reject":      { bg: "#FCEBEB", color: "#791F1F" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "sans-serif" }}>

      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid #E5E3DC", background: "#fff",
        padding: "18px 32px", display: "flex",
        alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "#534AB7", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "15px"
          }}>
            AI
          </div>
          <span style={{ fontWeight: 600, fontSize: "16px", color: "#26215C" }}>
            Admin Dashboard
          </span>
          <span style={{
            background: "#EEEDFE", color: "#3C3489", fontSize: "11px",
            padding: "3px 10px", borderRadius: "999px", fontWeight: 500
          }}>
            Admin
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "#888780" }}>{session?.email}</span>
          <button onClick={() => { clearSession(); router.push("/login"); }}
            style={{
              padding: "8px 16px", background: "transparent",
              border: "1px solid #D3D1C7", borderRadius: "8px",
              cursor: "pointer", fontSize: "13px", color: "#5F5E5A"
            }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        borderBottom: "1px solid #E5E3DC", background: "#fff",
        padding: "0 32px", display: "flex", gap: "0"
      }}>
        {["candidates", "roles"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: "14px 20px", border: "none", background: "transparent",
              cursor: "pointer", fontSize: "14px", fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "#534AB7" : "#888780",
              borderBottom: tab === t ? "2px solid #534AB7" : "2px solid transparent",
            }}>
            {t === "candidates" ? `Candidates (${candidates.length})` : `Job Roles (${roles.length})`}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Candidates Tab ── */}
        {tab === "candidates" && (
          <>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
              All candidates
            </h2>
            {loadingCandidates ? (
              <p style={{ color: "#888780" }}>Loading...</p>
            ) : candidates.length === 0 ? (
              <div style={{
                background: "#fff", border: "1px solid #E5E3DC",
                borderRadius: "16px", padding: "48px", textAlign: "center"
              }}>
                <p style={{ color: "#888780" }}>No candidates yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {candidates.map((c) => (
                  <div key={c.id}>
                    <div style={{
                      background: "#fff", border: "1px solid #E5E3DC",
                      borderRadius: "12px", padding: "18px 24px",
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <div>
                        <p style={{ fontSize: "15px", fontWeight: 500, margin: 0 }}>
                          {c.name}
                        </p>
                        <p style={{ fontSize: "12px", color: "#888780", margin: "3px 0 0" }}>
                          {c.email || "No email"} · {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {/* Match score badge */}
                        <span style={{
                          background: scoreBg(c.match_score),
                          color: scoreColor(c.match_score),
                          fontSize: "13px", fontWeight: 600,
                          padding: "4px 12px", borderRadius: "999px"
                        }}>
                          {c.match_score}% match
                        </span>

                        {/* View scores button */}
                        <button onClick={() => handleViewReport(c.id)}
                          style={{
                            padding: "7px 14px", background: "#EEEDFE",
                            color: "#3C3489", border: "none",
                            borderRadius: "8px", cursor: "pointer",
                            fontSize: "12px", fontWeight: 500
                          }}>
                          {expandedId === c.id ? "Hide scores" : "View scores"}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteCandidate(c.id)}
                          disabled={deleting === c.id}
                          style={{
                            padding: "7px 14px",
                            background: deleting === c.id ? "#F5C6C6" : "#FCEBEB",
                            color: "#791F1F", border: "none",
                            borderRadius: "8px", cursor: "pointer",
                            fontSize: "12px", fontWeight: 500
                          }}>
                          {deleting === c.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded scores panel */}
                    {expandedId === c.id && (
                      <div style={{
                        background: "#FAFAF8", border: "1px solid #E5E3DC",
                        borderTop: "none", borderRadius: "0 0 12px 12px",
                        padding: "20px 24px",
                      }}>
                        {!reports[c.id] ? (
                          <p style={{ fontSize: "13px", color: "#888780" }}>
                            Loading scores...
                          </p>
                        ) : reports[c.id].error ? (
                          <p style={{ fontSize: "13px", color: "#888780" }}>
                            No interview completed yet.
                          </p>
                        ) : (
                          <>
                            {/* Score grid */}
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: "10px", marginBottom: "16px"
                            }}>
                              {[
                                ["Overall", reports[c.id].overall_score],
                                ["Technical", reports[c.id].technical_score],
                                ["Communication", reports[c.id].communication_score],
                                ["Problem Solving", reports[c.id].problem_solving],
                                ["Confidence", reports[c.id].confidence_score],
                                ["Role Fit", reports[c.id].role_fit_score],
                              ].map(([label, score]) => (
                                <div key={label} style={{
                                  background: "#fff", border: "1px solid #E5E3DC",
                                  borderRadius: "10px", padding: "12px 16px",
                                }}>
                                  <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 4px" }}>
                                    {label}
                                  </p>
                                  <p style={{
                                    fontSize: "20px", fontWeight: 600, margin: 0,
                                    color: scoreColor(score)
                                  }}>
                                    {score}
                                    <span style={{ fontSize: "12px", color: "#888780" }}>/100</span>
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* Recommendation */}
                            <div style={{
                              display: "flex", alignItems: "center", gap: "12px",
                              flexWrap: "wrap"
                            }}>
                              <span style={{
                                background: recStyle[reports[c.id].recommendation]?.bg || "#F1EFE8",
                                color: recStyle[reports[c.id].recommendation]?.color || "#444",
                                fontSize: "13px", fontWeight: 600,
                                padding: "6px 14px", borderRadius: "999px"
                              }}>
                                {reports[c.id].recommendation}
                              </span>
                              <span style={{ fontSize: "13px", color: "#5F5E5A" }}>
                                {reports[c.id].explanation}
                              </span>
                            </div>

                            {/* Strengths / Weaknesses */}
                            <div style={{
                              display: "grid", gridTemplateColumns: "1fr 1fr",
                              gap: "12px", marginTop: "14px"
                            }}>
                              <div style={{
                                background: "#E1F5EE", borderRadius: "10px", padding: "14px"
                              }}>
                                <p style={{
                                  fontSize: "12px", fontWeight: 600,
                                  color: "#085041", marginBottom: "8px"
                                }}>
                                  Strengths
                                </p>
                                {reports[c.id].strengths?.map((s, i) => (
                                  <p key={i} style={{
                                    fontSize: "12px", color: "#085041",
                                    margin: "0 0 4px"
                                  }}>
                                    {s}
                                  </p>
                                ))}
                              </div>
                              <div style={{
                                background: "#FCEBEB", borderRadius: "10px", padding: "14px"
                              }}>
                                <p style={{
                                  fontSize: "12px", fontWeight: 600,
                                  color: "#791F1F", marginBottom: "8px"
                                }}>
                                  Weaknesses
                                </p>
                                {reports[c.id].weaknesses?.map((w, i) => (
                                  <p key={i} style={{
                                    fontSize: "12px", color: "#791F1F",
                                    margin: "0 0 4px"
                                  }}>
                                    {w}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Roles Tab ── */}
        {tab === "roles" && (
          <>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
              Job roles
            </h2>

            {/* Add role form */}
            <div style={{
              background: "#fff", border: "1px solid #E5E3DC",
              borderRadius: "16px", padding: "24px", marginBottom: "20px"
            }}>
              <p style={{ fontSize: "14px", fontWeight: 500, marginBottom: "14px" }}>
                Add new role
              </p>
              <input
                placeholder="Role title (e.g. Data Scientist)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "8px",
                  border: "1px solid #D3D1C7", fontSize: "14px",
                  marginBottom: "10px", boxSizing: "border-box",
                  fontFamily: "inherit"
                }}
              />
              <textarea
                placeholder="Paste the full job description here..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={5}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "8px",
                  border: "1px solid #D3D1C7", fontSize: "14px",
                  marginBottom: "10px", boxSizing: "border-box",
                  fontFamily: "inherit", resize: "vertical"
                }}
              />
              {roleError && (
                <p style={{
                  fontSize: "13px", color: "#791F1F",
                  background: "#FCEBEB", padding: "8px 12px",
                  borderRadius: "8px", marginBottom: "10px"
                }}>
                  {roleError}
                </p>
              )}
              <button onClick={handleAddRole} disabled={addingRole}
                style={{
                  padding: "10px 24px",
                  background: addingRole ? "#AFA9EC" : "#534AB7",
                  color: "white", border: "none", borderRadius: "8px",
                  cursor: addingRole ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: 500
                }}>
                {addingRole ? "Adding..." : "Add role"}
              </button>
            </div>

            {/* Roles list */}
            {loadingRoles ? (
              <p style={{ color: "#888780" }}>Loading roles...</p>
            ) : roles.length === 0 ? (
              <div style={{
                background: "#fff", border: "1px solid #E5E3DC",
                borderRadius: "16px", padding: "40px", textAlign: "center"
              }}>
                <p style={{ color: "#888780", fontSize: "14px" }}>
                  No roles yet — add one above.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {roles.map((r) => (
                  <div key={r.id} style={{
                    background: "#fff", border: "1px solid #E5E3DC",
                    borderRadius: "12px", padding: "18px 24px",
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}>
                    <div style={{ flex: 1, paddingRight: "16px" }}>
                      <p style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 4px" }}>
                        {r.title}
                      </p>
                      <p style={{
                        fontSize: "12px", color: "#888780",
                        margin: 0, lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {r.description}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteRole(r.id)}
                      style={{
                        padding: "7px 14px", background: "#FCEBEB",
                        color: "#791F1F", border: "none",
                        borderRadius: "8px", cursor: "pointer",
                        fontSize: "12px", fontWeight: 500,
                        whiteSpace: "nowrap"
                      }}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}