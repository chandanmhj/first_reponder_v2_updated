import { useEffect, useRef, useState } from "react";
import { firstResponder, hospitalSelector } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { getCurrentPosition } from "../../hooks/useGeolocation";
import StepCapsule from "../../components/StepCapsule";
import { scenarioSteps, scenarioLabel } from "../../utils/scenarios";
import {
  SendIcon,
  CameraIcon,
  CloseIcon,
  PhoneIcon,
  PinIcon,
  ShieldCheckIcon,
} from "../../components/Icons";

const EXAMPLE_PROMPTS = ["Someone is choking", "Severe bleeding", "Person is unconscious"];

export default function Chat() {
  const { showToast } = useToast();

  const [messages, setMessages] = useState([]); // {role, text, scenario, step, media_url, media_type, is_handover_summary}
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [sending, setSending] = useState(false);

  // The active emergency state is ALWAYS derived from the latest assistant
  // reply, not a one-time flag - this is what makes the action bar persist
  // and update across an ongoing emergency instead of vanishing after one
  // appearance (see the design discussion this screen is built around).
  const [activeEmergency, setActiveEmergency] = useState(null); // {scenario, step, lastUserMessage} | null
  const [locatingHospital, setLocatingHospital] = useState(false);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    firstResponder
      .history()
      .then((rows) => {
        // API returns most-recent-first; reverse to chronological for display
        const chronological = [...rows].reverse();
        const flat = [];
        chronological.forEach((row) => {
          flat.push({ role: "user", text: row.message });
          flat.push({
            role: "assistant",
            text: row.reply,
            scenario: row.scenario,
            step: row.step,
            is_emergency: row.is_emergency,
          });
        });
        setMessages(flat);
        const lastAssistant = [...flat].reverse().find((m) => m.role === "assistant");
        if (lastAssistant?.is_emergency) {
          setActiveEmergency({ scenario: lastAssistant.scenario, step: lastAssistant.step, lastUserMessage: "" });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (typeof scrollRef.current?.scrollTo === "function") {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    const fileToSend = attachedFile;
    setAttachedFile(null);
    setSending(true);

    try {
      const res = await firstResponder.chat(trimmed, fileToSend);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.reply,
          scenario: res.scenario,
          step: res.step,
          media_url: res.media_url,
          media_type: res.media_type,
          is_emergency: res.is_emergency,
          is_handover_summary: res.is_handover_summary,
        },
      ]);

      if (res.is_handover_summary) {
        setActiveEmergency(null);
      } else if (res.is_emergency) {
        setActiveEmergency({ scenario: res.scenario, step: res.step, lastUserMessage: trimmed });
      } else {
        setActiveEmergency(null);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "system-error", text: err.message || "Couldn't send that." }]);
    } finally {
      setSending(false);
    }
  }

  async function handleNavigate() {
    if (!activeEmergency) return;
    setLocatingHospital(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      const description = `${scenarioLabel(activeEmergency.scenario)} ${activeEmergency.lastUserMessage}`.trim();
      const res = await hospitalSelector.nearest(description, lat, lng, 1);
      const top = res.results?.[0];
      if (!top) {
        showToast("Couldn't find a nearby hospital.", "error");
        return;
      }
      // Always a NEW tab - the chat must never be navigated away from or lost.
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${top.lat},${top.lng}`, "_blank");
    } catch (err) {
      showToast(err.message || "Couldn't get your location.", "error");
    } finally {
      setLocatingHospital(false);
    }
  }

  return (
    <div className="flex flex-col h-screen md:pl-24">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-6" style={{ paddingBottom: activeEmergency ? 190 : 100 }}>
        <div className="max-w-lg mx-auto flex flex-col gap-3">
          {loaded && messages.length === 0 && <WelcomeState onExample={(p) => sendMessage(p)} />}

          {messages.map((m, i) => (
            <Message key={i} message={m} />
          ))}

          {sending && <TypingIndicator />}
        </div>
      </div>

      {activeEmergency && (
        <div className="fixed left-0 right-0 z-30 px-4 md:pl-28" style={{ bottom: 88 }}>
          <div className="glass-elevated max-w-lg mx-auto flex gap-3 p-3">
            <a href="tel:112" className="btn-alert btn flex-1">
              <PhoneIcon size={18} /> Call 112
            </a>
            <button className="btn btn-primary flex-1" onClick={handleNavigate} disabled={locatingHospital}>
              <PinIcon size={18} /> {locatingHospital ? "Locating..." : "Navigate"}
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2 md:pl-28">
        <div className="max-w-lg mx-auto">
          {attachedFile && (
            <div className="glass inline-flex items-center gap-2 px-3 py-1.5 mb-2 text-xs">
              {attachedFile.name}
              <button onClick={() => setAttachedFile(null)}>
                <CloseIcon size={14} />
              </button>
            </div>
          )}
          <div className="glass-recessed flex items-center gap-2 px-3 py-2">
            <button onClick={() => fileInputRef.current?.click()} style={{ color: "rgba(234,244,255,0.6)" }} className="shrink-0 p-1.5">
              <CameraIcon size={20} />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
            />
            <input
              className="flex-1 bg-transparent outline-none text-sm min-w-0"
              placeholder="Tell me what's happening..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center btn-primary p-0"
            >
              <SendIcon size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeState({ onExample }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 pt-10 pb-4">
      <div className="glass w-14 h-14 rounded-full flex items-center justify-center">
        <ShieldCheckIcon size={26} style={{ color: "var(--color-sky)" }} />
      </div>
      <div className="glass px-4 py-3 max-w-xs">
        <p className="text-sm">Hi, I'm Jeeva. Tell me what's happening and I'll help.</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-xs">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onExample(p)}
            className="text-xs px-3 py-2"
            style={{ border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: "rgba(234,244,255,0.75)" }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function Message({ message }) {
  if (message.role === "system-error") {
    return (
      <p className="text-xs text-center py-1" style={{ color: "rgba(234,244,255,0.5)" }}>
        {message.text}
      </p>
    );
  }

  if (message.is_handover_summary) {
    return <HandoverCard text={message.text} />;
  }

  const isUser = message.role === "user";
  const totalSteps = scenarioSteps(message.scenario);

  return (
    <div className={`message-in flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      {!isUser && message.step && totalSteps && (
        <div className="mb-1.5">
          <StepCapsule step={message.step} totalSteps={totalSteps} />
        </div>
      )}
      <div
        className={isUser ? "glass" : "glass"}
        style={{
          maxWidth: "80%",
          padding: "10px 14px",
          background: isUser ? "rgba(27,75,145,0.45)" : "rgba(255,255,255,0.08)",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        {message.media_url && (
          <div className="mt-2 rounded-lg overflow-hidden" style={{ borderRadius: 16 }}>
            {message.media_type === "video" ? (
              <video src={message.media_url} controls className="w-full" />
            ) : (
              <img src={message.media_url} alt="Guidance reference" className="w-full" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HandoverCard({ text }) {
  const lines = text.split("\n").filter(Boolean);
  return (
    <div
      className="glass-elevated message-in w-full p-5"
      style={{ borderLeft: "3px solid var(--color-confirm-teal)" }}
    >
      <div className="flex items-center gap-2 mb-3" style={{ color: "var(--color-confirm-teal)" }}>
        <ShieldCheckIcon size={20} />
        <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Help Has Arrived
        </h3>
      </div>
      <div className="text-sm leading-relaxed flex flex-col gap-1">
        {lines.map((line, i) =>
          line.trim().startsWith("-") ? (
            <p key={i} className="pl-3" style={{ color: "rgba(234,244,255,0.85)" }}>
              {line.trim()}
            </p>
          ) : (
            <p key={i} style={{ color: "rgba(234,244,255,0.85)" }}>
              {line}
            </p>
          )
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start message-in">
      <div className="glass px-4 py-3 flex gap-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
        <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--color-sky)" }} />
        <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--color-sky)" }} />
        <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--color-sky)" }} />
      </div>
    </div>
  );
}
