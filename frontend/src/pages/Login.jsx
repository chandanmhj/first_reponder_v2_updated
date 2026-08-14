import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { EyeIcon, EyeOffIcon } from "../components/Icons";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("validating");
    setError("");
    try {
      await login(username.trim(), password);
      navigate("/home");
    } catch {
      setStatus("idle");
      setError("Incorrect username or password.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="glass-elevated panel-in w-full max-w-sm p-7">
        <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Log In
        </h1>
        <p className="text-sm mb-6" style={{ color: "rgba(234,244,255,0.65)" }}>
          Welcome back.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs" style={{ color: "rgba(234,244,255,0.6)" }}>
              Username
            </span>
            <div className="glass-recessed px-3.5 py-3" style={{ borderColor: error ? "var(--color-alert-coral)" : undefined }}>
              <input
                className="w-full bg-transparent outline-none text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs" style={{ color: "rgba(234,244,255,0.6)" }}>
              Password
            </span>
            <div className="glass-recessed px-3.5 py-3" style={{ borderColor: error ? "var(--color-alert-coral)" : undefined }}>
              <div className="flex items-center gap-2">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-transparent outline-none text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="shrink-0" style={{ color: "rgba(234,244,255,0.5)" }}>
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>
          </label>

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--color-alert-coral)" }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full mt-2" disabled={status === "validating"}>
            {status === "validating" ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-sm text-center mt-5" style={{ color: "rgba(234,244,255,0.6)" }}>
          New here?{" "}
          <Link to="/signup" style={{ color: "var(--color-sky)" }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
