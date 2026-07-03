import { useState } from "react";
import { useRouter } from "next/router";
import { loginUser, saveSession } from "../lib/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await loginUser(email, password);
     saveSession(data.token, data.email, data.role, data.name || "", data.sub || "");

      // Redirect based on role
      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#FAFAF8",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif", padding: "24px"
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "#534AB7", display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: "18px",
            marginBottom: "12px"
          }}>
            AI
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
            Recruitment Agent
          </h1>
          <p style={{ fontSize: "13px", color: "#888780", marginTop: "4px" }}>
            Sign in to continue
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", border: "1px solid #E5E3DC",
          borderRadius: "16px", padding: "32px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
        }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#444441", marginBottom: "6px" }}>
            Email or username
          </label>
          <input
            type="text"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "11px 14px", borderRadius: "10px",
              border: "1px solid #D3D1C7", fontSize: "14px",
              marginBottom: "16px", background: "#FAFAF8",
              boxSizing: "border-box", fontFamily: "inherit"
            }}
          />

          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#444441", marginBottom: "6px" }}>
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "11px 14px", borderRadius: "10px",
              border: "1px solid #D3D1C7", fontSize: "14px",
              marginBottom: "20px", background: "#FAFAF8",
              boxSizing: "border-box", fontFamily: "inherit"
            }}
          />

          {error && (
            <div style={{
              background: "#FCEBEB", color: "#791F1F", borderRadius: "8px",
              padding: "10px 14px", fontSize: "13px", marginBottom: "16px"
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%", padding: "12px", background: loading ? "#AFA9EC" : "#534AB7",
              color: "white", border: "none", borderRadius: "10px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px", fontWeight: 500,
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {/* Admin hint */}
          <div style={{
            marginTop: "16px", padding: "10px 14px",
            background: "#EEEDFE", borderRadius: "8px",
            fontSize: "12px", color: "#3C3489"
          }}>
            Admin login: username <strong>admin</strong> / password <strong>admin123</strong>
          </div>

          <p style={{ textAlign: "center", fontSize: "13px", color: "#888780", marginTop: "20px" }}>
            No account?{" "}
            <span
              onClick={() => router.push("/signup")}
              style={{ color: "#534AB7", cursor: "pointer", fontWeight: 500 }}
            >
              Sign up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}