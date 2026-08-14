import { CheckIcon, AlertIcon } from "./Icons";

/**
 * The backend's advisory.py (see features/nutriscan/advisory.py) always
 * phrases an exceeded guideline as "...over the general Xg/day guideline"
 * and a fine one as "...within the general Xg/day guideline". This keyword
 * check mirrors that exact wording rather than guessing.
 */
function isOverGuideline(text) {
  if (!text) return false;
  return /over the general/i.test(text);
}

export default function AdvisoryBanner({ text }) {
  if (!text) return null;
  const exceeded = isOverGuideline(text);

  return (
    <div
      className="glass px-4 py-3 flex gap-3 items-start"
      style={{
        borderLeft: `3px solid ${exceeded ? "var(--color-alert-coral)" : "var(--color-confirm-teal)"}`,
      }}
    >
      <div style={{ color: exceeded ? "var(--color-alert-coral)" : "var(--color-confirm-teal)" }} className="mt-0.5 shrink-0">
        {exceeded ? <AlertIcon size={18} /> : <CheckIcon size={18} />}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(234,244,255,0.9)" }}>
        {text}
      </p>
    </div>
  );
}
