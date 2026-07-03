export default function TranscriptBox({ entries }) {
  return (
    <div
      style={{
        maxHeight: "340px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {entries.map((entry, i) => (
        <div
          key={i}
          style={{
            paddingBottom: "16px",
            borderBottom: i < entries.length - 1 ? "1px solid #F1EFE8" : "none",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#534AB7",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            Q{i + 1}: {entry.question}
          </div>
          <div
            style={{
              background: "#FAFAF8",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#444441",
              lineHeight: 1.5,
            }}
          >
            {entry.answer}
          </div>
          {entry.scores && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "8px",
                flexWrap: "wrap",
              }}
            >
              {["technical_score", "communication_score", "confidence_score"].map(
                (k) => (
                  <span
                    key={k}
                    style={{
                      fontSize: "11px",
                      background: "#E6F1FB",
                      color: "#0C447C",
                      borderRadius: "999px",
                      padding: "3px 10px",
                      fontWeight: 500,
                    }}
                  >
                    {k.replace("_score", "")}: {entry.scores[k]}/10
                  </span>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}