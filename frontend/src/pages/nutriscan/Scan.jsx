import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nutriscan } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import AdvisoryBanner from "../../components/AdvisoryBanner";
import MealTypeChips from "../../components/MealTypeChips";
import { PlateIcon, TagIcon, CameraIcon, GalleryIcon, BackIcon, CheckIcon, AlertIcon } from "../../components/Icons";

// Stages: mode -> capture -> analyzing -> review -> (log ->) confirmation
export default function Scan() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stage, setStage] = useState("mode");
  const [mode, setMode] = useState(null); // "meal" | "label"
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [mealType, setMealType] = useState(null);
  const [logging, setLogging] = useState(false);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  function chooseMode(m) {
    setMode(m);
    setError("");
    setStage("capture");
  }

  async function handleFile(file) {
    if (!file) return;
    setStage("analyzing");
    setError("");
    try {
      const data = mode === "meal" ? await nutriscan.analyze(file) : await nutriscan.analyzeLabel(file);
      setResult(data);
      setMealType(null);
      setStage("review");
    } catch (err) {
      setError(err.message || "Couldn't read that photo. Try again with better lighting.");
      setStage("capture-error");
    }
  }

  async function confirmLog() {
    if (!result || !mealType) return;
    setLogging(true);
    try {
      await nutriscan.log({
        meal_type: mealType,
        items: result.items,
        total_calories: result.total_calories,
        total_protein_g: result.total_protein_g,
        total_carbs_g: result.total_carbs_g,
        total_fat_g: result.total_fat_g,
        total_sugar_g: result.total_sugar_g || 0,
        total_sodium_mg: result.total_sodium_mg || 0,
        total_fiber_g: result.total_fiber_g || 0,
      });
      setStage("confirmation");
      showToast("Logged!");
      setTimeout(() => {
        setStage("mode");
        setResult(null);
        setMode(null);
      }, 1100);
    } catch (err) {
      showToast(err.message || "Couldn't save that entry.", "error");
    } finally {
      setLogging(false);
    }
  }

  function reset() {
    setStage("mode");
    setMode(null);
    setResult(null);
    setError("");
  }

  return (
    <div className="px-5 pt-6 pb-28 max-w-lg mx-auto md:pl-28">
      {stage !== "mode" && stage !== "confirmation" && (
        <button onClick={reset} className="mb-4 flex items-center gap-1 text-sm" style={{ color: "rgba(234,244,255,0.7)" }}>
          <BackIcon size={18} /> Back
        </button>
      )}

      {stage === "mode" && <ModeSelect onChoose={chooseMode} navigate={navigate} />}

      {(stage === "capture" || stage === "capture-error") && (
        <CaptureStage
          mode={mode}
          error={stage === "capture-error" ? error : null}
          cameraInputRef={cameraInputRef}
          galleryInputRef={galleryInputRef}
          onFile={handleFile}
        />
      )}

      {stage === "analyzing" && <AnalyzingStage />}

      {stage === "review" && result && (
        <ReviewStage
          result={result}
          mealType={mealType}
          onMealType={setMealType}
          onLog={confirmLog}
          onDiscard={reset}
          logging={logging}
        />
      )}

      {stage === "confirmation" && <ConfirmationStage />}
    </div>
  );
}

function ModeSelect({ onChoose, navigate }) {
  return (
    <>
      <h1 className="text-xl font-semibold mb-5" style={{ fontFamily: "var(--font-display)" }}>
        NutriScan
      </h1>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Tile Icon={PlateIcon} label="Scan a Meal" desc="Estimate nutrition from a photo" onClick={() => onChoose("meal")} />
        <Tile Icon={TagIcon} label="Scan a Label" desc="Read exact values from a package" onClick={() => onChoose("label")} />
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={() => navigate("/nutriscan/history")} className="glass px-4 py-3 text-left text-sm flex justify-between items-center">
          Today's Log
        </button>
        <button onClick={() => navigate("/nutriscan/summary")} className="glass px-4 py-3 text-left text-sm flex justify-between items-center">
          Daily Summary
        </button>
      </div>
    </>
  );
}

function Tile({ Icon, label, desc, onClick }) {
  return (
    <button onClick={onClick} className="glass panel-in p-5 text-left flex flex-col gap-3" style={{ minHeight: 140 }}>
      <Icon size={26} style={{ color: "var(--color-sky)" }} />
      <div>
        <p className="font-medium text-sm mb-0.5">{label}</p>
        <p className="text-xs" style={{ color: "rgba(234,244,255,0.6)" }}>
          {desc}
        </p>
      </div>
    </button>
  );
}

function CaptureStage({ mode, error, cameraInputRef, galleryInputRef, onFile }) {
  return (
    <div className="flex flex-col items-center gap-6 pt-10">
      <p className="text-sm" style={{ color: "rgba(234,244,255,0.7)" }}>
        {mode === "meal" ? "Photograph your food" : "Photograph the nutrition label"}
      </p>

      {error && (
        <div className="glass-alert px-4 py-3 text-sm flex items-center gap-2 max-w-xs text-center">
          <AlertIcon size={18} className="shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={() => cameraInputRef.current?.click()}
        className="w-24 h-24 rounded-full flex items-center justify-center btn-primary"
      >
        <CameraIcon size={32} />
      </button>

      <button
        onClick={() => galleryInputRef.current?.click()}
        className="flex items-center gap-2 text-sm"
        style={{ color: "rgba(234,244,255,0.7)" }}
      >
        <GalleryIcon size={18} /> Choose from gallery
      </button>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}

function AnalyzingStage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-24">
      <div className="glass-elevated w-16 h-16 rounded-full flex items-center justify-center">
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "var(--color-sky)" }} />
      </div>
      <p className="text-sm" style={{ color: "rgba(234,244,255,0.7)" }}>
        Reading your photo...
      </p>
    </div>
  );
}

function ReviewStage({ result, mealType, onMealType, onLog, onDiscard, logging }) {
  const isLabel = result.source === "nutrition_label";

  return (
    <div className="panel-in flex flex-col gap-4">
      <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {isLabel ? "Here's what's in it" : "Here's what I found"}
      </h2>

      {result.items.map((item, i) => (
        <div key={i} className="glass p-4">
          <div className="flex justify-between items-baseline mb-2">
            <p className="font-medium text-sm">{item.name}</p>
            <p className="text-xs" style={{ color: "rgba(234,244,255,0.55)" }}>
              {item.estimated_quantity}
            </p>
          </div>
          <div className="flex gap-4 flex-wrap" style={{ fontFamily: "var(--font-mono)" }}>
            <Stat value={item.calories} unit="kcal" />
            <Stat value={item.protein_g} unit="protein" />
            <Stat value={item.carbs_g} unit="carbs" />
            <Stat value={item.fat_g} unit="fat" />
            {isLabel && <Stat value={item.sugar_g} unit="sugar" />}
            {isLabel && <Stat value={item.sodium_mg} unit="sodium" />}
            {isLabel && <Stat value={item.fiber_g} unit="fiber" />}
          </div>
        </div>
      ))}

      <div className="glass px-4 py-3 flex justify-between" style={{ fontFamily: "var(--font-mono)" }}>
        <span className="text-sm" style={{ fontFamily: "var(--font-body)", color: "rgba(234,244,255,0.7)" }}>
          Total
        </span>
        <span className="text-sm font-semibold">
          {Math.round(result.total_calories)} kcal
        </span>
      </div>

      {result.confidence_note && (
        <p className="text-xs italic" style={{ color: "rgba(234,244,255,0.5)" }}>
          {result.confidence_note}
        </p>
      )}

      <AdvisoryBanner text={result.advisory} />

      <div>
        <p className="text-xs mb-2" style={{ color: "rgba(234,244,255,0.6)" }}>
          Meal type
        </p>
        <MealTypeChips value={mealType} onChange={onMealType} />
      </div>

      <div className="flex gap-3 mt-2">
        <button className="btn btn-secondary flex-1" onClick={onDiscard}>
          Discard
        </button>
        <button className="btn btn-primary flex-1" onClick={onLog} disabled={!mealType || logging}>
          {logging ? "Logging..." : "Log This"}
        </button>
      </div>
    </div>
  );
}

function Stat({ value, unit }) {
  if (value === null || value === undefined) {
    return (
      <div className="text-xs">
        <span className="text-sm">—</span> <span style={{ color: "rgba(234,244,255,0.45)", fontFamily: "var(--font-body)" }}>{unit}</span>
      </div>
    );
  }
  return (
    <div className="text-xs">
      <span className="text-sm">{Math.round(value * 10) / 10}</span>{" "}
      <span style={{ color: "rgba(234,244,255,0.45)", fontFamily: "var(--font-body)" }}>{unit}</span>
    </div>
  );
}

function ConfirmationStage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-24 panel-in">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "rgba(79,209,197,0.2)", color: "var(--color-confirm-teal)" }}
      >
        <CheckIcon size={30} />
      </div>
      <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        Logged!
      </p>
    </div>
  );
}
