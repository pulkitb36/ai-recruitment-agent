import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getSession } from "../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function InterviewRoom() {
  const router = useRouter();
  const { id: sessionId } = router.query;

  const [status, setStatus]                   = useState("connecting");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [transcript, setTranscript]           = useState([]);
  const [questionNum, setQuestionNum]         = useState(0);
  const [error, setError]                     = useState("");
  const [wsReady, setWsReady]                 = useState(false);
  const [showTextInput, setShowTextInput]     = useState(false);
  const [typedAnswer, setTypedAnswer]         = useState("");

  const wsRef           = useRef(null);
  const recognitionRef  = useRef(null);
  const currentQRef     = useRef("");
  const elevenlabsTimer = useRef(null);

  useEffect(() => {
    currentQRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    if (!sessionId) return;
    initWebSocket(sessionId);
    return () => {
      wsRef.current?.close();
      try { recognitionRef.current?.stop(); } catch (e) {}
      window.speechSynthesis?.cancel();
      if (elevenlabsTimer.current) clearTimeout(elevenlabsTimer.current);
    };
  }, [sessionId]);

  const initWebSocket = (sid) => {
    const WS_BASE = API_BASE.replace("http", "ws");
    const ws      = new WebSocket(`${WS_BASE}/ws/interview/${sid}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsReady(true);
      setStatus("ready");
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob && event.data.size > 0) {
        if (elevenlabsTimer.current) {
          clearTimeout(elevenlabsTimer.current);
          elevenlabsTimer.current = null;
        }
        window.speechSynthesis?.cancel();
        const url = URL.createObjectURL(event.data);
        await playAudio(url);
        return;
      }

      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "question") {
            setCurrentQuestion(data.text);
            setQuestionNum(data.question_number || 0);
            setStatus("speaking");
            setShowTextInput(false);
            elevenlabsTimer.current = setTimeout(() => {
              speakWithBrowser(data.text);
            }, 2000);
          }
          if (data.type === "interview_complete") {
            setStatus("done");
            window.speechSynthesis?.cancel();
            setTimeout(() => router.push(`/report?id=${sid}`), 2000);
          }
          if (data.type === "error") {
            setError(data.message);
            setStatus("ready");
          }
        } catch (e) {}
      }
    };

    ws.onerror = () => setError("Connection error. Please refresh.");
    ws.onclose = () => setWsReady(false);
  };

  const playAudio = (url) => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.onended = () => { setStatus("listening"); startListening(); resolve(); };
      audio.onerror = () => { speakWithBrowser(currentQRef.current); resolve(); };
      audio.play().catch(() => { speakWithBrowser(currentQRef.current); resolve(); });
    });
  };

  const speakWithBrowser = (text) => {
    if (!("speechSynthesis" in window)) { setStatus("listening"); startListening(); return; }
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate  = 0.92;
      utter.lang  = "en-US";
      const voices = window.speechSynthesis.getVoices();
      const pick   = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha") || (v.lang === "en-US" && !v.name.toLowerCase().includes("male")));
      if (pick) utter.voice = pick;
      utter.onend   = () => { setStatus("listening"); startListening(); };
      utter.onerror = () => { setStatus("listening"); startListening(); };
      window.speechSynthesis.speak(utter);
    }, 100);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Use Google Chrome for speech recognition."); return; }
    try { recognitionRef.current?.stop(); } catch (e) {}
    const r = new SR();
    recognitionRef.current = r;
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onstart  = () => { setStatus("listening"); setError(""); };
    r.onresult = (event) => {
      const answer = event.results[0][0].transcript;
      const q      = currentQRef.current || "Interview question";
      setTranscript(prev => [...prev, { question: q, answer }]);
      setStatus("thinking");
      sendAnswer(answer);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") { setError("Microphone access denied. Allow mic and refresh."); setStatus("ready"); }
      else { setError(`Mic error: ${e.error}`); setTimeout(() => startListening(), 1000); }
    };
    try { r.start(); } catch (e) { setError("Could not start mic. Please refresh."); }
  };

  const sendAnswer = (answer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "answer", text: answer }));
    } else {
      setError("Connection lost. Please refresh.");
    }
  };

  const handleStartInterview = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setStatus("thinking");
      setError("");
      wsRef.current.send(JSON.stringify({ type: "start" }));
    } else {
      setError("Not connected yet. Please wait.");
    }
  };

  const handleSkip = () => {
    try { recognitionRef.current?.stop(); } catch (e) {}
    setShowTextInput(false);
    setStatus("thinking");
    sendAnswer("I would like to skip this question.");
  };

  const handleSubmitTyped = () => {
    if (!typedAnswer.trim()) return;
    try { recognitionRef.current?.stop(); } catch (e) {}
    const answer = typedAnswer.trim();
    const q      = currentQRef.current || "Interview question";
    setTypedAnswer("");
    setShowTextInput(false);
    setTranscript(prev => [...prev, { question: q, answer }]);
    setStatus("thinking");
    sendAnswer(answer);
  };

  const sc = {
    connecting: { icon: "⏳", text: "Connecting...",                  color: "#888780", bg: "#FAFAF8" },
    ready:      { icon: "🎙", text: "Ready — click Start Interview",  color: "#534AB7", bg: "#EEEDFE" },
    listening:  { icon: "🔴", text: "Listening — speak your answer",  color: "#E24B4A", bg: "#FFF0F0" },
    thinking:   { icon: "💭", text: "AI is thinking...",              color: "#854F0B", bg: "#FAEEDA" },
    speaking:   { icon: "🔊", text: "AI interviewer is speaking...",  color: "#0C447C", bg: "#E6F1FB" },
    done:       { icon: "✅", text: "Interview complete!",            color: "#085041", bg: "#E1F5EE" },
  }[status] || { icon: "🎙", text: "", color: "#534AB7", bg: "#FAFAF8" };

  const progress = Math.min((questionNum / 10) * 100, 100);

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "sans-serif" }}>
      <div style={{ borderBottom: "1px solid #E5E3DC", background: "#fff", padding: "18px 32px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#534AB7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "14px" }}>AI</div>
            <span style={{ fontWeight: 600, fontSize: "16px", color: "#26215C" }}>AI Interview</span>
          </div>
          <span style={{ fontSize: "13px", color: "#888780" }}>Question {questionNum} of 10</span>
        </div>
        <div style={{ maxWidth: "720px", margin: "10px auto 0", height: "4px", background: "#EEEDFE", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#534AB7", transition: "width 0.5s ease" }} />
        </div>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ background: sc.bg, border: "1px solid #E5E3DC", borderRadius: "20px", padding: "36px", textAlign: "center", marginBottom: "24px", transition: "background 0.4s ease" }}>
          <div style={{ fontSize: "52px", marginBottom: "14px" }}>{sc.icon}</div>
          <p style={{ fontSize: "15px", fontWeight: 600, color: sc.color, margin: "0 0 4px" }}>{sc.text}</p>

          {currentQuestion && (
            <div style={{ marginTop: "20px", background: "#fff", borderRadius: "12px", padding: "18px 20px", textAlign: "left", border: "1px solid #E5E3DC" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#534AB7", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Current question</p>
              <p style={{ fontSize: "15px", color: "#1a1a1a", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{currentQuestion}</p>
            </div>
          )}

          {status === "listening" && (
            <div style={{ marginTop: "24px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#E24B4A", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", animation: "pulse 1.5s ease-in-out infinite" }}>🎙</div>
              <style>{`@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(226,75,74,0.5); } 70% { box-shadow: 0 0 0 20px rgba(226,75,74,0); } 100% { box-shadow: 0 0 0 0 rgba(226,75,74,0); } }`}</style>
              <p style={{ fontSize: "13px", color: "#E24B4A", marginTop: "12px", fontWeight: 500 }}>Speak now...</p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px" }}>
                <button onClick={() => { try { recognitionRef.current?.stop(); } catch(e){} setShowTextInput(true); }}
                  style={{ padding: "9px 18px", background: "#EEEDFE", color: "#3C3489", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                  ✏️ Type answer
                </button>
                <button onClick={handleSkip}
                  style={{ padding: "9px 18px", background: "#F1EFE8", color: "#5F5E5A", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                  ⏭ Skip
                </button>
              </div>
            </div>
          )}
        </div>

        {showTextInput && (
          <div style={{ marginBottom: "20px" }}>
            <textarea placeholder="Type your answer here..." value={typedAnswer} onChange={(e) => setTypedAnswer(e.target.value)} rows={4}
              style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #D3D1C7", fontSize: "14px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", background: "#FAFAF8" }} />
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={handleSubmitTyped}
                style={{ flex: 1, padding: "11px", background: "#534AB7", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}>
                Submit answer
              </button>
              <button onClick={() => { setShowTextInput(false); setTypedAnswer(""); startListening(); }}
                style={{ padding: "11px 18px", background: "#F1EFE8", color: "#5F5E5A", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                Use mic
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "#FCEBEB", color: "#791F1F", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#791F1F", fontSize: "16px" }}>✕</button>
          </div>
        )}

        {(status === "ready" || status === "connecting") && (
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <button onClick={handleStartInterview} disabled={!wsReady}
              style={{ padding: "16px 48px", background: wsReady ? "#534AB7" : "#AFA9EC", color: "white", border: "none", borderRadius: "999px", cursor: wsReady ? "pointer" : "not-allowed", fontSize: "16px", fontWeight: 600, boxShadow: wsReady ? "0 4px 16px rgba(83,74,183,0.35)" : "none" }}>
              {wsReady ? "Start Interview" : "Connecting..."}
            </button>
            {!wsReady && (
              <div style={{ marginTop: "12px" }}>
                <button onClick={() => { wsRef.current?.close(); initWebSocket(sessionId); }}
                  style={{ background: "none", border: "1px solid #D3D1C7", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", color: "#5F5E5A", cursor: "pointer" }}>
                  Retry connection
                </button>
              </div>
            )}
            <p style={{ fontSize: "12px", color: "#888780", marginTop: "12px" }}>
              Allow microphone access when prompted · Use Google Chrome
            </p>
          </div>
        )}

        {transcript.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #E5E3DC", borderRadius: "16px", padding: "20px 24px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#888780", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>Conversation so far</p>
            <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
              {transcript.map((entry, i) => (
                <div key={i} style={{ paddingBottom: "14px", borderBottom: i < transcript.length - 1 ? "1px solid #F1EFE8" : "none" }}>
                  <p style={{ fontSize: "12px", color: "#534AB7", fontWeight: 500, marginBottom: "6px" }}>Q{i + 1}: {entry.question}</p>
                  <p style={{ fontSize: "13px", color: "#444441", background: "#FAFAF8", borderRadius: "8px", padding: "10px 12px", margin: 0, lineHeight: 1.5 }}>{entry.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}