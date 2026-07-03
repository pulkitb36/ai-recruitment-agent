import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AudioRecorder from "../../components/AudioRecorder";
import TranscriptBox from "../../components/TranscriptBox";
import { createInterviewSocket } from "../../lib/api";

export default function InterviewRoom() {
  const router = useRouter();
  const { id: sessionId } = router.query;
  const [transcript, setTranscript] = useState([]);
  const [questionNum, setQuestionNum] = useState(0);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const wsRef = useRef(null);
  const audioRef = useRef(typeof Audio !== "undefined" ? new Audio() : null);

  useEffect(() => {
    if (!sessionId) return;
    wsRef.current = createInterviewSocket(
      sessionId,
      (audioBlob) => {
        if (!audioBlob || audioBlob.size === 0) return;
        const url = URL.createObjectURL(audioBlob);
        audioRef.current.src = url;
        setAiSpeaking(true);
        audioRef.current.play();
        audioRef.current.onended = () => setAiSpeaking(false);
      },
      (data) => {
        if (data.type === "transcript") {
          setTranscript((prev) => [...prev, data]);
          setQuestionNum((n) => n + 1);
        }
        if (data.type === "interview_complete") {
          router.push(`/report/${sessionId}`);
        }
      }
    );
    return () => wsRef.current?.close();
  }, [sessionId]);

  const handleAudioReady = (audioBlob) => {
    wsRef.current?.send(audioBlob);
  };

  const progress = Math.min((questionNum / 10) * 100, 100);

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
      <div
        style={{
          borderBottom: "1px solid #E5E3DC",
          background: "#FFFFFF",
          padding: "18px 32px",
        }}
      >
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "16px", color: "#26215C" }}>
            AI interview
          </span>
          <span style={{ fontSize: "13px", color: "#888780" }}>
            Question {questionNum} of 10
          </span>
        </div>
        <div
          style={{
            maxWidth: "720px",
            margin: "12px auto 0",
            height: "4px",
            background: "#EEEDFE",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#534AB7",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>
        <div
          style={{
            background: aiSpeaking ? "#EEEDFE" : "#fff",
            border: `1px solid ${aiSpeaking ? "#CECBF6" : "#E5E3DC"}`,
            borderRadius: "16px",
            padding: "32px",
            marginBottom: "24px",
            textAlign: "center",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: aiSpeaking ? "#534AB7" : "#F1EFE8",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            {aiSpeaking ? "🔊" : "🎤"}
          </div>
          <p
            style={{
              fontSize: "14px",
              color: aiSpeaking ? "#3C3489" : "#888780",
              margin: 0,
              fontWeight: 500,
            }}
          >
            {aiSpeaking
              ? "AI interviewer is speaking..."
              : "Your turn — record your answer"}
          </p>
        </div>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <AudioRecorder onAudioReady={handleAudioReady} disabled={aiSpeaking} />
        </div>

        {transcript.length > 0 && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #E5E3DC",
              borderRadius: "16px",
              padding: "20px 24px",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "#888780",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Transcript
            </p>
            <TranscriptBox entries={transcript} />
          </div>
        )}
      </div>
    </div>
  );
}