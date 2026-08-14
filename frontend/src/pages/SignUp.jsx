import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { EyeIcon, EyeOffIcon, CheckIcon } from "../components/Icons";

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | validating | success

  function validate() {
    const errs = {};
    if (username.trim().length < 3) errs.username = "Username must be at least 3 characters.";
    if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (password !== confirm) errs.confirm = "Passwords don't match.";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setStatus("validating");
    setErrors({});
    try {
      await signup(username.trim(), password);
      setStatus("success");
      setTimeout(() => navigate("/home"), 900);
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ username: "That username is already taken." });
      } else {
        setErrors({ form: err.message || "Something went wrong. Try again." });
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="glass-elevated panel-in w-full max-w-sm p-7 relative">
        {status === "success" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 glass-elevated z-10">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(79,209,197,0.2)", color: "var(--color-confirm-teal)" }}
            >
              <CheckIcon size={28} />
            </div>
            <p className="text-sm">Account created</p>
          </div>
        )}

        <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Create Account
        </h1>
        <p className="text-sm mb-6" style={{ color: "rgba(234,244,255,0.65)" }}>
          Set up your account to start tracking.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Username" error={errors.username}>
            <input
              className="w-full bg-transparent outline-none text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-transparent outline-none text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="shrink-0" style={{ color: "rgba(234,244,255,0.5)" }}>
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </Field>

          <Field label="Confirm Password" error={errors.confirm}>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full bg-transparent outline-none text-sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>

          {errors.form && (
            <p className="text-sm" style={{ color: "var(--color-alert-coral)" }}>
              {errors.form}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full mt-2" disabled={status === "validating"}>
            {status === "validating" ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-center mt-5" style={{ color: "rgba(234,244,255,0.6)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--color-sky)" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs" style={{ color: "rgba(234,244,255,0.6)" }}>
        {label}
      </span>
      <div
        className="glass-recessed px-3.5 py-3"
        style={{ borderColor: error ? "var(--color-alert-coral)" : undefined }}
      >
        {children}
      </div>
      {error && (
        <span className="text-xs" style={{ color: "var(--color-alert-coral)" }}>
          {error}
        </span>
      )}
    </label>
  );
}
