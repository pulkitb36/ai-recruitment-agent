import { useState, useRef } from "react";

export default function AudioRecorder({ onAudioReady, disabled }) {
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/wav" });
      onAudioReady(blob);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled}
      style={{
        padding: "16px 36px",
        fontSize: "15px",
        borderRadius: "999px",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? "#D3D1C7" : recording ? "#E24B4A" : "#1D9E75",
        color: "white",
        fontWeight: 500,
        transition: "all 0.2s",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: recording ? "0 0 0 6px rgba(226,75,74,0.15)" : "none",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "white",
          display: recording ? "inline-block" : "none",
        }}
      />
      {recording ? "Stop & submit answer" : "Start speaking"}
    </button>
  );
}