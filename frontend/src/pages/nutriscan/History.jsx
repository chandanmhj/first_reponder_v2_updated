import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nutriscan } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import EmptyState from "../../components/EmptyState";
import { PlateIcon, TrashIcon, BackIcon } from "../../components/Icons";
import { relativeTime } from "../../utils/format";

export default function History() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    nutriscan
      .history()
      .then(setEntries)
      .catch(() => setEntries([]));
  }

  async function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await nutriscan.deleteEntry(id);
    } catch {
      showToast("Couldn't delete that entry.", "error");
      load();
    }
  }

  return (
    <div className="px-5 pt-6 pb-28 max-w-lg mx-auto md:pl-28">
      <button onClick={() => navigate("/nutriscan")} className="mb-4 flex items-center gap-1 text-sm" style={{ color: "rgba(234,244,255,0.7)" }}>
        <BackIcon size={18} /> Back
      </button>
      <h1 className="text-xl font-semibold mb-5" style={{ fontFamily: "var(--font-display)" }}>
        Today's Log
      </h1>

      {entries === null && <p className="text-sm text-center" style={{ color: "rgba(234,244,255,0.5)" }}>Loading...</p>}

      {entries && entries.length === 0 && (
        <EmptyState icon={PlateIcon} title="Nothing logged yet today." actionLabel="Scan a Meal" onAction={() => navigate("/nutriscan")} />
      )}

      <div className="flex flex-col gap-2">
        {entries?.map((entry) => {
          const items = JSON.parse(entry.items_json || "[]");
          const summary = items.length > 1 ? `${items[0]?.name} and ${items.length - 1} more` : items[0]?.name || "Entry";
          return (
            <div key={entry.id} className="glass-recessed px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm truncate capitalize">
                  {entry.meal_type} · {summary}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(234,244,255,0.5)" }}>
                  {relativeTime(entry.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  {Math.round(entry.total_calories)} kcal
                </span>
                <button onClick={() => handleDelete(entry.id)} style={{ color: "rgba(255,107,94,0.7)" }}>
                  <TrashIcon size={17} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
