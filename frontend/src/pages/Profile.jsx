import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserIcon } from "../components/Icons";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="px-5 pt-10 pb-28 max-w-lg mx-auto md:pl-28 flex flex-col items-center text-center">
      <div className="glass w-20 h-20 rounded-full flex items-center justify-center mb-4">
        <UserIcon size={34} />
      </div>
      <h1 className="text-xl font-semibold mb-8" style={{ fontFamily: "var(--font-display)" }}>
        {user?.username}
      </h1>

      <button
        onClick={handleLogout}
        className="btn"
        style={{
          border: "1px solid rgba(255,107,94,0.4)",
          borderRadius: 20,
          color: "var(--color-alert-coral)",
          background: "transparent",
        }}
      >
        Log Out
      </button>
    </div>
  );
}
