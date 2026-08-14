import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-elevated panel-in p-8 text-center max-w-xs">
        <p className="text-sm mb-5">Page not found.</p>
        <button className="btn btn-primary w-full" onClick={() => navigate("/home")}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
