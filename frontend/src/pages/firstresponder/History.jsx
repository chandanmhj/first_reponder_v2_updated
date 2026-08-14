import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { firstResponder } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { HeartPulseIcon, BackIcon } from "../../components/Icons";
import { relativeTime } from "../../utils/format";
import { scenarioLabel } from "../../utils/scenarios";

export default function History() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    firstResponder
      .history()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  return (
    <div className="px-5 pt-6 pb-28 max-w-lg mx-auto md:pl-28">
      <button onClick={() => navigate("/first-responder")} className="mb-4 flex items-center gap-1 text-sm" style={{ color: "rgba(234,244,255,0.7)" }}>
        <BackIcon size={18} /> Back
      </button>
      <h1 className="text-xl font-semibold mb-5" style={{ fontFamily: "var(--font-display)" }}>
        Conversation History
      </h1>

      {entries === null && <p className="text-sm text-center" style={{ color: "rgba(234,244,255,0.5)" }}>Loading...</p>}

      {entries && entries.length === 0 && <EmptyState icon={HeartPulseIcon} title="No conversations yet." />}

      <div className="flex flex-col gap-2">
        {entries?.map((entry) => (
          <div key={entry.id} className="glass-recessed px-4 py-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">{entry.is_emergency ? scenarioLabel(entry.scenario) : "General guidance"}</span>
              <span className="text-xs" style={{ color: "rgba(234,244,255,0.5)" }}>
                {relativeTime(entry.created_at)}
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: "rgba(234,244,255,0.6)" }}>
              {entry.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
