import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getReport } from "../../lib/api";

const REC_STYLES = {
  "Strong Hire": { bg: "#E1F5EE", text: "#085041", border: "#5DCAA5" },
  "Hire": { bg: "#E6F1FB", text: "#0C447C", border: "#85B7EB" },
  "Consider": { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" },
  "Reject": { bg: "#FCEBEB", text: "#791F1F", border: "#F09595" },
};

export default function ReportPage() {
  const router = useRouter();
  const { id: sessionId } = router.query;
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (sessionId) getReport(sessionId).then(setReport);
  }, [sessionId]);

  if (!report) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF8",
          fontFamily: "inherit",
          color: "#888780",
        }}
      >
        Loading report...
      </div>
    );
  }

  const chartData = [
    { name: "Technical", score: report.technical_score },
    { name: "Communication", score: report.communication_score },
    { name: "Problem solving", score: report.problem_solving },
    { name: "Confidence", score: report.confidence_score },
    { name: "Role fit", score: report.role_fit_score },
  ];

  const rec = REC_STYLES[report.recommendation] || REC_STYLES["Consider"];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
      <div
        style={{
          borderBottom: "1px solid #E5E3DC",
          background: "#FFFFFF",
          padding: "18px 32px",
        }}
      >
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <span style={{ fontWeight: 600, fontSize: "16px", color: "#26215C" }}>
            Interview report
          </span>
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Overall score banner */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E3DC",
            borderRadius: "16px",
            padding: "28px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontSize: "13px", color: "#888780", margin: "0 0 4px" }}>
              Overall score
            </p>
            <p style={{ fontSize: "36px", fontWeight: 600, margin: 0, color: "#1a1a1a" }}>
              {report.overall_score}
              <span style={{ fontSize: "16px", color: "#888780" }}>/100</span>
            </p>
          </div>
          <div
            style={{
              background: rec.bg,
              color: rec.text,
              border: `1.5px solid ${rec.border}`,
              borderRadius: "12px",
              padding: "12px 22px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "11px", margin: "0 0 4px", opacity: 0.8 }}>
              Recommendation
            </p>
            <p style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
              {report.recommendation}
            </p>
          </div>
        </div>

        {/* Score breakdown chart */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E3DC",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#444441", marginBottom: "16px" }}>
            Score breakdown
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888780" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#888780" }} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #E5E3DC",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="#7F77DD" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Strengths / weaknesses */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background: "#E1F5EE",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <h3
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#085041",
                marginBottom: "10px",
              }}
            >
              Strengths
            </h3>
            {report.strengths?.map((s, i) => (
              <p
                key={i}
                style={{ fontSize: "13px", color: "#085041", margin: "0 0 6px", lineHeight: 1.5 }}
              >
                {s}
              </p>
            ))}
          </div>
          <div
            style={{
              background: "#FCEBEB",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <h3
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#791F1F",
                marginBottom: "10px",
              }}
            >
              Weaknesses
            </h3>
            {report.weaknesses?.map((w, i) => (
              <p
                key={i}
                style={{ fontSize: "13px", color: "#791F1F", margin: "0 0 6px", lineHeight: 1.5 }}
              >
                {w}
              </p>
            ))}
          </div>
        </div>

        {/* Improvements */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E3DC",
            borderRadius: "16px",
            padding: "20px 24px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#444441", marginBottom: "10px" }}>
            Areas for improvement
          </h3>
          {report.improvements?.map((item, i) => (
            <p
              key={i}
              style={{ fontSize: "13px", color: "#5F5E5A", margin: "0 0 6px", lineHeight: 1.5 }}
            >
              {item}
            </p>
          ))}
        </div>

        {/* Explanation */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E3DC",
            borderRadius: "16px",
            padding: "20px 24px",
          }}
        >
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#444441", marginBottom: "8px" }}>
            Why this recommendation
          </h3>
          <p style={{ fontSize: "13px", color: "#5F5E5A", margin: 0, lineHeight: 1.6 }}>
            {report.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}