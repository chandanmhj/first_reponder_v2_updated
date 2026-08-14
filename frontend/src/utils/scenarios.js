/**
 * Matches features/first_responder/knowledge_base.py exactly - 11 scenarios,
 * step counts as documented in the original README. Used to render the
 * step capsule's dot progress and to humanize scenario names in history views.
 */
export const SCENARIOS = {
  scene_safety_primary_assessment: { label: "Scene Safety & Assessment", steps: 8 },
  heart_attack: { label: "Heart Attack", steps: 7 },
  stroke: { label: "Stroke", steps: 4 },
  fits_seizures: { label: "Seizure", steps: 6 },
  low_blood_sugar: { label: "Low Blood Sugar", steps: 4 },
  snake_bite: { label: "Snake Bite", steps: 6 },
  trauma_road_accident: { label: "Trauma / Road Accident", steps: 8 },
  burns: { label: "Burns", steps: 3 },
  cardiac_arrest_cpr: { label: "Cardiac Arrest / CPR", steps: 11 },
  choking: { label: "Choking", steps: 7 },
  infections_animal_bites: { label: "Animal Bite / Infection", steps: 2 },
};

export function scenarioLabel(scenario) {
  return SCENARIOS[scenario]?.label || "General guidance";
}

export function scenarioSteps(scenario) {
  return SCENARIOS[scenario]?.steps || null;
}
