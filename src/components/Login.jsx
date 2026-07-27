import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { T, VER } from "../lib/utils";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (!email || !password) { setError("Nhập email và mật khẩu"); return; }
    setLoading(true);
    setError("");
    const result = await login(email, password);
    if (!result.ok) setError(result.msg || "Sai tài khoản hoặc mật khẩu");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0a0e1a,#0f172a)" }}>
      <div className="fade" style={{ background: T.sf, border: "1px solid " + T.bd, borderRadius: 16, padding: 44, width: 380, textAlign: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 4 }}><span style={{ color: T.p }}>IMG</span> Pricing</div>
        <div style={{ color: T.tm, fontSize: 13, marginBottom: 28 }}>v{VER}</div>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          style={{ width: "100%", marginBottom: 10, padding: 11 }}
        />
        <input
          placeholder="Mật khẩu"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          style={{ width: "100%", marginBottom: 14, padding: 11 }}
        />
        {error && <div style={{ color: T.dg, fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button className="bp2" onClick={go} disabled={loading} style={{ width: "100%", padding: 11, fontSize: 14, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </div>
    </div>
  );
}
