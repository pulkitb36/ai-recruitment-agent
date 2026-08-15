import { useState } from "react";
import { useRouter } from "next/router";
import { signupUser, saveSession } from "../lib/api";

export default function Signup() {
  const router = useRouter();
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await signupUser(name, email, password);
      saveSession(data.token, data.email, data.role, data.name || "", data.sub || "");
      router.push("/");
    } catch (err) {
      setError(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#534AB7", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "18px", marginBottom: "12px" }}>
            AI
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>Create an account</h1>
          <p style={{ fontSize: "13px", color: "#888780", marginTop: "4px" }}>Start screening candidates with AI</p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E5E3DC", borderRadius: "16px", padding: "32px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

          {[
            { label: "Full name", value: name, set: setName, type: "text", placeholder: "Pulkit Batra" },
            { label: "Email", value: email, set: setEmail, type: "email", placeholder: "you@example.com" },
            { label: "Password", value: password, set: setPassword, type: "password", placeholder: "Min. 6 characters" },
            { label: "Confirm password", value: confirm, set: setConfirm, type: "password", placeholder: "Repeat your password" },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#444441", marginBottom: "6px" }}>
                {label}
              </label>
              <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => set(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #D3D1C7", fontSize: "14px", marginBottom: "16px", background: "#FAFAF8", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>
          ))}

          {error && (
            <div style={{ background: "#FCEBEB", color: "#791F1F", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <button onClick={handleSignup} disabled={loading}
            style={{ width: "100%", padding: "12px", background: loading ? "#AFA9EC" : "#534AB7", color: "white", border: "none", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 500 }}>
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p style={{ textAlign: "center", fontSize: "13px", color: "#888780", marginTop: "20px" }}>
            Already have an account?{" "}
            <span onClick={() => router.push("/login")} style={{ color: "#534AB7", cursor: "pointer", fontWeight: 500 }}>
              Sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}