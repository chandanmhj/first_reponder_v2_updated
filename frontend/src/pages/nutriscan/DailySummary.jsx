import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nutriscan } from "../../api/client";
import { BackIcon } from "../../components/Icons";

// Generic reference values (not personalized - the backend doesn't yet
// support per-user daily targets, see backend README's "Known Limitations").
// Used only to give the progress visuals something sensible to fill against.
const REFERENCE = { calories: 2000, protein_g: 50, carbs_g: 275, fat_g: 70 };
const SUGAR_LIMIT = 50; // matches backend features/nutriscan/advisory.py
const SODIUM_LIMIT = 2300;

export default function DailySummary() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    nutriscan
      .dailySummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  if (!summary) {
    return (
      <div className="px-5 pt-6 max-w-lg mx-auto md:pl-28">
        <p className="text-sm text-center mt-10" style={{ color: "rgba(234,244,255,0.5)" }}>
          Loading...
        </p>
      </div>
    );
  }

  const calPct = Math.min(summary.total_calories / REFERENCE.calories, 1);
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="px-5 pt-6 pb-28 max-w-lg mx-auto md:pl-28">
      <button onClick={() => navigate("/nutriscan")} className="mb-4 flex items-center gap-1 text-sm" style={{ color: "rgba(234,244,255,0.7)" }}>
        <BackIcon size={18} /> Back
      </button>
      <h1 className="text-xl font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Daily Summary
      </h1>

      <div className="glass-elevated flex flex-col items-center py-8 mb-4">
        <svg width="140" height="140" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="var(--color-sky)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - calPct)}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="-mt-24 flex flex-col items-center">
          <span className="text-2xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
            {Math.round(summary.total_calories)}
          </span>
          <span className="text-xs" style={{ color: "rgba(234,244,255,0.6)" }}>
            kcal
          </span>
        </div>
        <p className="text-xs mt-20" style={{ color: "rgba(234,244,255,0.55)" }}>
          {summary.entry_count} item{summary.entry_count === 1 ? "" : "s"} logged today
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Bar label="Protein" value={summary.total_protein_g} max={REFERENCE.protein_g} unit="g" color="var(--color-sky)" />
        <Bar label="Carbs" value={summary.total_carbs_g} max={REFERENCE.carbs_g} unit="g" color="var(--color-sky)" />
        <Bar label="Fat" value={summary.total_fat_g} max={REFERENCE.fat_g} unit="g" color="var(--color-sky)" />

        {summary.total_sugar_g > 0 && (
          <Bar
            label="Sugar"
            value={summary.total_sugar_g}
            max={SUGAR_LIMIT}
            unit="g"
            color={thresholdColor(summary.total_sugar_g, SUGAR_LIMIT)}
          />
        )}
        {summary.total_sodium_mg > 0 && (
          <Bar
            label="Sodium"
            value={summary.total_sodium_mg}
            max={SODIUM_LIMIT}
            unit="mg"
            color={thresholdColor(summary.total_sodium_mg, SODIUM_LIMIT)}
          />
        )}
      </div>
    </div>
  );
}

function thresholdColor(value, limit) {
  const ratio = value / limit;
  if (ratio >= 1) return "var(--color-alert-coral)";
  if (ratio >= 0.75) return "var(--color-caution-amber)";
  return "var(--color-confirm-teal)";
}

function Bar({ label, value, max, unit, color }) {
  const pct = Math.min(value / max, 1) * 100;
  return (
    <div className="glass px-4 py-3">
      <div className="flex justify-between mb-2 text-sm">
        <span style={{ color: "rgba(234,244,255,0.75)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)" }}>
          {Math.round(value * 10) / 10}
          {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
