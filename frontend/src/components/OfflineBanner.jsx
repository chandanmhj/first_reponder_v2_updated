import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 glass text-center text-xs py-2"
      style={{ borderLeft: "none", borderRight: "none", borderTop: "none", borderRadius: 0, borderBottom: "1px solid rgba(255,184,77,0.4)" }}
    >
      You're offline — some features won't work.
    </div>
  );
}
