import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { nutriscan } from "../api/client";
import { PlateIcon, HeartPulseIcon, ChevronRightIcon } from "../components/Icons";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    nutriscan
      .dailySummary()
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  return (
    <div className="px-5 pt-8 pb-28 max-w-lg mx-auto md:pl-28">
      <h1 className="text-2xl font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Hi, {user?.username}
      </h1>

      <div className="flex flex-col md:flex-row gap-4">
        <HomeCard
          title="NutriScan"
          description="Scan a meal or label"
          Icon={PlateIcon}
          gradient="linear-gradient(135deg, rgba(27,75,145,0.55), rgba(79,168,224,0.35))"
          onClick={() => navigate("/nutriscan")}
        />
        <HomeCard
          title="First Responder"
          description="Get step-by-step emergency guidance"
          Icon={HeartPulseIcon}
          gradient="linear-gradient(135deg, rgba(13,27,46,0.6), rgba(27,75,145,0.4))"
          onClick={() => navigate("/first-responder")}
        />
      </div>

      {summary && summary.entry_count > 0 && (
        <div className="glass mt-5 px-4 py-3 flex items-center justify-between">
          <span className="text-sm" style={{ color: "rgba(234,244,255,0.75)" }}>
            Today
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }} className="text-sm">
            {Math.round(summary.total_calories)} kcal logged
          </span>
        </div>
      )}
    </div>
  );
}

function HomeCard({ title, description, Icon, gradient, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glass panel-in flex-1 p-6 text-left relative overflow-hidden group"
      style={{ minHeight: 180 }}
    >
      <div className="absolute inset-0" style={{ background: gradient, opacity: 0.9 }} />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center glass"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <Icon size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h2>
          <p className="text-sm flex items-center gap-1" style={{ color: "rgba(234,244,255,0.8)" }}>
            {description}
            <ChevronRightIcon size={16} />
          </p>
        </div>
      </div>
    </button>
  );
}
