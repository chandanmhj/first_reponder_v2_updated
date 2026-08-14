const TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export default function MealTypeChips({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {TYPES.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className="px-4 py-2 text-sm transition-colors"
            style={{
              borderRadius: 12,
              border: `1px solid ${active ? "var(--color-sky)" : "rgba(255,255,255,0.15)"}`,
              background: active ? "rgba(79,168,224,0.25)" : "rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              color: "var(--color-frost)",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
