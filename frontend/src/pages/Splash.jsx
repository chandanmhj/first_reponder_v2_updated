import { useNavigate } from "react-router-dom";

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-[var(--font-display)] font-bold text-4xl mb-3" style={{ fontFamily: "var(--font-display)" }}>
        First Responder v2
      </h1>
      <p className="text-sm max-w-xs mb-10" style={{ color: "rgba(234,244,255,0.7)" }}>
        Emergency guidance and nutrition tracking, in one place.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button className="btn btn-primary w-full" onClick={() => navigate("/login")}>
          Log In
        </button>
        <button className="btn btn-secondary w-full" onClick={() => navigate("/signup")}>
          Create Account
        </button>
      </div>
    </div>
  );
}
