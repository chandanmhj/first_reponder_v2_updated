export default function EmptyState({ icon: Icon, title, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-4">
      <div style={{ color: "var(--color-sky)", opacity: 0.4 }}>
        <Icon size={56} />
      </div>
      <p className="text-sm" style={{ color: "rgba(234,244,255,0.7)" }}>
        {title}
      </p>
      {actionLabel && (
        <button className="btn btn-primary mt-2" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
