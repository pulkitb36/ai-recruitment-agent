import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getReport } from "../../lib/api";

const REC_STYLES = {
  "Strong Hire": { bg: "#E1F5EE", text: "#085041", border: "#5DCAA5" },
  "Hire":        { bg: "#E6F1FB", text: "#0C447C", border: "#85B7EB" },
  "Consider":    { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" },
  "Reject":      { bg: "#FCEBEB", text: "#791F1F", border: "#F09595" },
};

export default function ReportPage() {
  const router    = useRouter();
  const sessionId = router.query.id;
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getReport(sessionId);
      if (data.error) {
        if (retries < 5) {
          setTimeout(() => { setRetries(r => r + 1); fetchReport(); }, 2000);
        } else {
          setError(data.error);
          setLoading(false);
        }
      } else {
        setReport(data);
        setLoading(false);
      }
    } catch (e) {
      setError("Failed to load report.");
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "sans-serif", gap: "16px" }}>
      <div style={{ fontSize: "32px" }}>⏳</div>
      <p style={{ color: "#534AB7", fontWeight: 500 }}>Generating your report...</p>
      <p style={{ color: "#888780", fontSize: "13px" }}>{retries > 0 ? `Checking... (attempt ${retries + 1})` : "This may take a few seconds"}</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "sans-serif", gap: "16px" }}>
      <div style={{ fontSize: "32px" }}>❌</div>
      <p style={{ color: "#791F1F", fontWeight: 500 }}>{error}</p>
      <button onClick={() => { setRetries(0); fetchReport(); }} style={{ padding: "10px 24px", background: "#534AB7", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>Try again</button>
      <button onClick={() => router.push("/")} style={{ padding: "10px 24px", background: "transparent", color: "#888780", border: "1px solid #D3D1C7", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>Back to home</button>
    </div>
  );

  const safe = (val, fallback = 0) => val !== null && val !== undefined ? val : fallback;

  const chartData = [
    { name: "Technical",      score: safe(report.technical_score) },
    { name: "Communication",  score: safe(report.communication_score) },
    { name: "Problem Solving",score: safe(report.problem_solving) },
    { name: "Confidence",     score: safe(report.confidence_score) },
    { name: "Role Fit",       score: safe(report.role_fit_score) },
  ];

  const rec        = REC_STYLES[report.recommendation] || REC_STYLES["Consider"];
  const scoreColor = (s) => s >= 80 ? "#085041" : s >= 60 ? "#854F0B" : "#791F1F";

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "sans-serif" }}>
      <div style={{ borderBottom: "1px solid #E5E3DC", background: "#fff", padding: "18px 32px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#534AB7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "14px" }}>AI</div>
            <span style={{ fontWeight: 600, fontSize: "16px", color: "#26215C" }}>Interview Report</span>
          </div>
          <button onClick={() => router.push("/")} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #D3D1C7", borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: "#5F5E5A" }}>
            New interview
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px" }}>

        <div style={{ background: "#fff", border: "1px solid #E5E3DC", borderRadius: "16px", padding: "28px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 4px" }}>Overall score</p>
            <p style={{ fontSize: "40px", fontWeight: 700, margin: 0, color: "#1a1a1a" }}>
              {safe(report.overall_score)}<span style={{ fontSize: "16px", color: "#888780", fontWeight: 400 }}>/100</span>
            </p>
          </div>
          <div style={{ background: rec.bg, color: rec.text, border: `1.5px solid ${rec.border}`, borderRadius: "12px", padding: "14px 24px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", margin: "0 0 4px", opacity: 0.8 }}>Recommendation</p>
            <p style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{report.recommendation || "Consider"}</p>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E5E3DC", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#444441", marginBottom: "16px" }}>Score breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888780" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#888780" }} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E3DC", borderRadius: "8px", fontSize: "13px" }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 80 ? "#5DCAA5" : entry.score >= 60 ? "#7F77DD" : "#F09595"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {chartData.map((item) => (
            <div key={item.name} style={{ background: "#fff", border: "1px solid #E5E3DC", borderRadius: "12px", padding: "16px" }}>
              <p style={{ fontSize: "11px", color: "#888780", margin: "0 0 6px" }}>{item.name}</p>
              <p style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: scoreColor(item.score) }}>
                {item.score}<span style={{ fontSize: "12px", color: "#888780", fontWeight: 400 }}>/100</span>
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div style={{ background: "#E1F5EE", borderRadius: "16px", padding: "20px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#085041", marginBottom: "10px" }}>Strengths</h3>
            {(report.strengths || []).map((s, i) => (
              <p key={i} style={{ fontSize: "13px", color: "#085041", margin: "0 0 6px", lineHeight: 1.5 }}>✓ {s}</p>
            ))}
          </div>
          <div style={{ background: "#FCEBEB", borderRadius: "16px", padding: "20px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#791F1F", marginBottom: "10px" }}>Weaknesses</h3>
            {(report.weaknesses || []).map((w, i) => (
              <p key={i} style={{ fontSize: "13px", color: "#791F1F", margin: "0 0 6px", lineHeight: 1.5 }}>✗ {w}</p>
            ))}
          </div>
        </div>

        {(report.improvements || []).length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #E5E3DC", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#444441", marginBottom: "10px" }}>Areas for improvement</h3>
            {(report.improvements || []).map((item, i) => (
              <p key={i} style={{ fontSize: "13px", color: "#5F5E5A", margin: "0 0 6px", lineHeight: 1.5 }}>→ {item}</p>
            ))}
          </div>
        )}

        {report.explanation && (
          <div style={{ background: "#fff", border: "1px solid #E5E3DC", borderRadius: "16px", padding: "20px 24px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#444441", marginBottom: "8px" }}>Why this recommendation</h3>
            <p style={{ fontSize: "13px", color: "#5F5E5A", margin: 0, lineHeight: 1.6 }}>{report.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}