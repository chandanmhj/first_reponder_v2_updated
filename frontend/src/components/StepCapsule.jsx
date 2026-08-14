/**
 * The step capsule - design.md §7. Shows progress through a known-length
 * BCLS scenario as filled/unfilled dots plus a monospace "02/07" counter.
 */
export default function StepCapsule({ step, totalSteps, isNew = false }) {
  if (!step || !totalSteps) return null;

  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="step-capsule">
      <div className="flex items-center gap-1">
        {dots.map((n) => (
          <span
            key={n}
            className={`step-capsule-dot ${n > step ? "step-capsule-dot--empty" : ""} ${
              n === step && isNew ? "step-capsule-dot--new" : ""
            }`}
          />
        ))}
      </div>
      <span>
        {String(step).padStart(2, "0")}/{String(totalSteps).padStart(2, "0")}
      </span>
    </div>
  );
}
