import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../api";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const res = await publicApi.post("/api/admin/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("admin_token", res.data.access_token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError("Incorrect username or password");
    }
  };

  return (
    <div
      style={{
        padding: 40,
        maxWidth: 400,
        margin: "100px auto",
        background: "white",
        borderRadius: 8,
      }}
    >
      <h2 style={{ marginBottom: 20 }}>Admin Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        {error && <p style={{ color: "red", marginBottom: 10 }}>{error}</p>}
        <button type="submit" style={buttonStyle}>
          Login
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 10,
  border: "1px solid #ccc",
  borderRadius: 4,
};

const buttonStyle = {
  width: "100%",
  padding: 10,
  background: "#333",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};
