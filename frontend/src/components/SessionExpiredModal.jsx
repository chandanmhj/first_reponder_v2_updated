import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SessionExpiredModal() {
  const { sessionExpired, acknowledgeSessionExpired } = useAuth();
  const navigate = useNavigate();

  if (!sessionExpired) return null;

  function handleClose() {
    acknowledgeSessionExpired();
    navigate("/login");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(10,25,48,0.6)" }}>
      <div className="glass-elevated panel-in p-6 max-w-xs text-center">
        <p className="text-sm mb-5">Your session expired — please log in again.</p>
        <button className="btn btn-primary w-full" onClick={handleClose}>
          Log In
        </button>
      </div>
    </div>
  );
}
