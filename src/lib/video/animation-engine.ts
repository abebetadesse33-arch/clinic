/**
 * Medical Animation Engine
 * Produces structured scene descriptors consumed by the front-end
 * Canvas/SVG renderer. Each scene maps to a visual type and carries
 * timed animation keyframes plus voiceover cue metadata.
 */

export type VisualGraphicType =
  | "anatomy_heart"
  | "anatomy_pancreas_glucose"
  | "anatomy_kidney"
  | "anatomy_lungs"
  | "medication_pill"
  | "lifestyle_nutrition"
  | "lifestyle_exercise"
  | "warning_alert";

export interface AnimationKeyframe {
  /** Time offset in seconds from scene start */
  timeOffsetSeconds: number;
  /** CSS/SVG element selector or animation target id */
  targetId: string;
  /** CSS property to animate */
  property: string;
  /** Target value to animate to */
  toValue: string;
  /** Easing function */
  easing?: "ease-in" | "ease-out" | "ease-in-out" | "linear";
}

export interface VoiceoverCue {
  /** Start time in seconds (relative to scene) */
  startSeconds: number;
  text: string;
  /** Highlight word indices for synchronized text display */
  highlightIndices?: number[];
}

export interface AnimationScene {
  sceneNumber: number;
  graphicType: VisualGraphicType;
  durationSeconds: number;
  keyframes: AnimationKeyframe[];
  voiceoverCues: VoiceoverCue[];
  /** SVG markup rendered inline on the canvas */
  svgMarkup: string;
  /** Background gradient CSS value */
  backgroundGradient: string;
  /** Primary accent color for this scene */
  accentColor: string;
}

// ─── SVG Library ────────────────────────────────────────────────────────────

const SVG_HEART = `
<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
  <defs>
    <radialGradient id="hg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff6b7a"/>
      <stop offset="100%" stop-color="#c0392b"/>
    </radialGradient>
    <filter id="pulse">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <path id="heart-body" d="M100 160 C100 160 20 110 20 60 C20 35 40 20 60 25 C75 28 90 38 100 50 C110 38 125 28 140 25 C160 20 180 35 180 60 C180 110 100 160 100 160Z" fill="url(#hg)" filter="url(#pulse)"/>
  <!-- Aorta -->
  <line x1="100" y1="50" x2="100" y2="15" stroke="#e74c3c" stroke-width="8" stroke-linecap="round"/>
  <!-- Left/Right vessels -->
  <line x1="100" y1="25" x2="60" y2="10" stroke="#e74c3c" stroke-width="5" stroke-linecap="round"/>
  <line x1="100" y1="25" x2="140" y2="10" stroke="#e74c3c" stroke-width="5" stroke-linecap="round"/>
  <!-- Pulse waveform -->
  <polyline id="ecg" points="10,140 30,140 40,100 50,170 60,90 70,140 190,140" fill="none" stroke="#2ecc71" stroke-width="2.5"/>
</svg>`;

const SVG_PANCREAS_GLUCOSE = `
<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
  <defs>
    <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f39c12"/>
      <stop offset="100%" stop-color="#e67e22"/>
    </linearGradient>
  </defs>
  <!-- Pancreas body -->
  <ellipse cx="100" cy="90" rx="70" ry="25" fill="url(#pg)" rx="70" ry="25"/>
  <!-- Islets of Langerhans dots -->
  <circle cx="70" cy="90" r="6" fill="#fff" opacity="0.8"/>
  <circle cx="100" cy="88" r="6" fill="#fff" opacity="0.8"/>
  <circle cx="130" cy="90" r="6" fill="#fff" opacity="0.8"/>
  <!-- Insulin arrows downward -->
  <line x1="70" y1="96" x2="70" y2="130" stroke="#27ae60" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="100" y1="94" x2="100" y2="130" stroke="#27ae60" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="130" y1="96" x2="130" y2="130" stroke="#27ae60" stroke-width="2.5" marker-end="url(#arr)"/>
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6Z" fill="#27ae60"/>
    </marker>
  </defs>
  <!-- Blood glucose bar chart -->
  <rect x="20" y="150" width="20" height="25" fill="#e74c3c" rx="3"/>
  <rect x="50" y="158" width="20" height="17" fill="#f39c12" rx="3"/>
  <rect x="80" y="163" width="20" height="12" fill="#27ae60" rx="3"/>
  <text x="20" y="148" font-size="8" fill="#555">High</text>
  <text x="50" y="156" font-size="8" fill="#555">Mid</text>
  <text x="80" y="161" font-size="8" fill="#555">Target</text>
  <!-- Label -->
  <text x="100" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="#7f8c8d">Pancreas & Glucose Regulation</text>
</svg>`;

const SVG_KIDNEY = `
<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
  <defs>
    <radialGradient id="kg" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#8e44ad"/>
      <stop offset="100%" stop-color="#6c3483"/>
    </radialGradient>
  </defs>
  <!-- Left kidney -->
  <ellipse cx="70" cy="90" rx="30" ry="50" fill="url(#kg)" transform="rotate(-10,70,90)"/>
  <!-- Right kidney -->
  <ellipse cx="130" cy="90" rx="30" ry="50" fill="url(#kg)" transform="rotate(10,130,90)"/>
  <!-- Ureter lines -->
  <line x1="70" y1="135" x2="100" y2="165" stroke="#9b59b6" stroke-width="3"/>
  <line x1="130" y1="135" x2="100" y2="165" stroke="#9b59b6" stroke-width="3"/>
  <!-- Filter arrows -->
  <text x="100" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="#7f8c8d">Kidney Filtration</text>
  <text x="100" y="170" text-anchor="middle" font-size="9" fill="#9b59b6">eGFR Target: &gt; 60 mL/min</text>
</svg>`;

const SVG_LUNGS = `
<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
  <defs>
    <linearGradient id="lg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3498db"/>
      <stop offset="100%" stop-color="#1a5276"/>
    </linearGradient>
  </defs>
  <!-- Trachea -->
  <rect x="96" y="10" width="8" height="40" rx="4" fill="#7f8c8d"/>
  <!-- Bronchi -->
  <path d="M100 50 C85 55 65 55 55 70" stroke="#7f8c8d" stroke-width="5" fill="none"/>
  <path d="M100 50 C115 55 135 55 145 70" stroke="#7f8c8d" stroke-width="5" fill="none"/>
  <!-- Left lung -->
  <ellipse cx="65" cy="110" rx="45" ry="55" fill="url(#lg)" opacity="0.85"/>
  <!-- Right lung -->
  <ellipse cx="135" cy="110" rx="45" ry="55" fill="url(#lg)" opacity="0.85"/>
  <text x="100" y="175" text-anchor="middle" font-size="9" fill="#2980b9">O₂ / CO₂ Exchange</text>
  <text x="100" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#7f8c8d">Respiratory System</text>
</svg>`;

const SVG_MEDICATION = `
<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
  <defs>
    <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1abc9c"/>
      <stop offset="50%" stop-color="#1abc9c"/>
      <stop offset="50%" stop-color="#ecf0f1"/>
      <stop offset="100%" stop-color="#ecf0f1"/>
    </linearGradient>
  </defs>
  <!-- Capsule pill -->
  <rect x="60" y="75" width="80" height="30" rx="15" fill="url(#mg)" stroke="#16a085" stroke-width="2"/>
  <!-- Center split line -->
  <line x1="100" y1="75" x2="100" y2="105" stroke="#16a085" stroke-width="2"/>
  <!-- Molecules -->
  <circle cx="40" cy="50" r="8" fill="#3498db" opacity="0.7"/>
  <circle cx="160" cy="50" r="8" fill="#e74c3c" opacity="0.7"/>
  <circle cx="40" cy="130" r="6" fill="#9b59b6" opacity="0.7"/>
  <circle cx="160" cy="130" r="6" fill="#f39c12" opacity="0.7"/>
  <!-- Arrows toward pill -->
  <line x1="48" y1="53" x2="62" y2="80" stroke="#3498db" stroke-width="1.5" stroke-dasharray="4"/>
  <line x1="152" y1="53" x2="138" y2="80" stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="4"/>
  <!-- Receptor lock icon -->
  <rect x="87" y="130" width="26" height="20" rx="3" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="1.5"/>
  <path d="M100 122 C95 122 92 126 92 130 L108 130 C108 126 105 122 100 122Z" fill="#bdc3c7"/>
  <circle cx="100" cy="137" r="3" fill="#7f8c8d"/>
  <text x="100" y="170" text-anchor="middle" font-size="9" fill="#16a085">Receptor Activation</text>
  <text x="100" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#7f8c8d">How Your Medication Works</text>
</svg>`;

const SVG_NUTRITION = `
<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
  <!-- Plate -->
  <circle cx="100" cy="105" r="65" fill="#f8f9fa" stroke="#dee2e6" stroke-width="3"/>
  <circle cx="100" cy="105" r="55" fill="none" stroke="#adb5bd" stroke-width="1" stroke-dasharray="4"/>
  <!-- Greens (half) -->
  <path d="M100 105 L100 50 A55 55 0 0 1 155 105Z" fill="#27ae60" opacity="0.8"/>
  <!-- Grains (quarter) -->
  <path d="M100 105 L100 50 A55 55 0 0 0 45 105Z" fill="#f39c12" opacity="0.8"/>
  <!-- Protein (quarter) -->
  <path d="M100 105 L45 105 A55 55 0 0 0 100 160Z" fill="#e74c3c" opacity="0.7"/>
  <!-- Labels -->
  <text x="135" y="85" font-size="8" fill="#fff" font-weight="bold">Vegetables</text>
  <text x="55" y="85" font-size="8" fill="#fff" font-weight="bold">Grains</text>
  <text x="62" y="145" font-size="8" fill="#fff" font-weight="bold">Protein</text>
  <!-- Water cup -->
  <rect x="15" y="120" width="22" height="30" rx="3" fill="#3498db" opacity="0.7"/>
  <text x="26" y="165" text-anchor="middle" font-size="7" fill="#2980b9">Water</text>
  <text x="100" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="#7f8c8d">Balanced Nutrition Plate</text>
</svg>`;

const SVG_EXERCISE = `
<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
  <!-- Person walking (stick figure) -->
  <circle cx="100" cy="40" r="15" fill="#3498db"/>
  <!-- Body -->
  <line x1="100" y1="55" x2="100" y2="110" stroke="#3498db" stroke-width="5" stroke-linecap="round"/>
  <!-- Left arm swing -->
  <line x1="100" y1="70" x2="70" y2="90" stroke="#3498db" stroke-width="4" stroke-linecap="round"/>
  <!-- Right arm swing -->
  <line x1="100" y1="70" x2="130" y2="85" stroke="#3498db" stroke-width="4" stroke-linecap="round"/>
  <!-- Left leg -->
  <line x1="100" y1="110" x2="75" y2="145" stroke="#3498db" stroke-width="4" stroke-linecap="round"/>
  <line x1="75" y1="145" x2="70" y2="165" stroke="#3498db" stroke-width="3" stroke-linecap="round"/>
  <!-- Right leg -->
  <line x1="100" y1="110" x2="125" y2="140" stroke="#3498db" stroke-width="4" stroke-linecap="round"/>
  <line x1="125" y1="140" x2="135" y2="162" stroke="#3498db" stroke-width="3" stroke-linecap="round"/>
  <!-- Ground -->
  <line x1="20" y1="165" x2="180" y2="165" stroke="#95a5a6" stroke-width="2"/>
  <!-- Heart rate pulse on side -->
  <polyline points="140,60 150,60 155,45 160,75 165,50 170,60 185,60" fill="none" stroke="#e74c3c" stroke-width="2"/>
  <text x="100" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#7f8c8d">Daily Movement</text>
  <text x="100" y="178" text-anchor="middle" font-size="8" fill="#2980b9">30 min / day target</text>
</svg>`;

const SVG_WARNING = `
<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
  <defs>
    <linearGradient id="wg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f39c12"/>
      <stop offset="100%" stop-color="#e67e22"/>
    </linearGradient>
  </defs>
  <!-- Warning triangle -->
  <polygon points="100,20 185,160 15,160" fill="url(#wg)" stroke="#d35400" stroke-width="3" stroke-linejoin="round"/>
  <!-- Exclamation mark -->
  <rect x="94" y="65" width="12" height="55" rx="6" fill="white"/>
  <circle cx="100" cy="140" r="8" fill="white"/>
  <!-- Symptom icons: pulse, eye, dizzy -->
  <text x="30" y="175" font-size="18">❤️</text>
  <text x="85" y="175" font-size="18">👁️</text>
  <text x="140" y="175" font-size="18">🌀</text>
  <text x="100" y="15" text-anchor="middle" font-size="11" font-weight="bold" fill="#7f8c8d">Warning Signs</text>
</svg>`;

const SVG_MAP: Record<VisualGraphicType, string> = {
  anatomy_heart: SVG_HEART,
  anatomy_pancreas_glucose: SVG_PANCREAS_GLUCOSE,
  anatomy_kidney: SVG_KIDNEY,
  anatomy_lungs: SVG_LUNGS,
  medication_pill: SVG_MEDICATION,
  lifestyle_nutrition: SVG_NUTRITION,
  lifestyle_exercise: SVG_EXERCISE,
  warning_alert: SVG_WARNING,
};

const GRADIENT_MAP: Record<VisualGraphicType, string> = {
  anatomy_heart: "linear-gradient(135deg, #1a1a2e 0%, #2d1b3d 100%)",
  anatomy_pancreas_glucose: "linear-gradient(135deg, #1a1a2e 0%, #1e3a1e 100%)",
  anatomy_kidney: "linear-gradient(135deg, #1a0a2e 0%, #2d1b3d 100%)",
  anatomy_lungs: "linear-gradient(135deg, #0a1628 0%, #1a3a5c 100%)",
  medication_pill: "linear-gradient(135deg, #0d2137 0%, #1a4a3a 100%)",
  lifestyle_nutrition: "linear-gradient(135deg, #0d2a0d 0%, #1a3a1a 100%)",
  lifestyle_exercise: "linear-gradient(135deg, #0a1a2e 0%, #1a2a4a 100%)",
  warning_alert: "linear-gradient(135deg, #2a1a00 0%, #3a2a00 100%)",
};

const ACCENT_MAP: Record<VisualGraphicType, string> = {
  anatomy_heart: "#ff6b7a",
  anatomy_pancreas_glucose: "#f39c12",
  anatomy_kidney: "#9b59b6",
  anatomy_lungs: "#3498db",
  medication_pill: "#1abc9c",
  lifestyle_nutrition: "#27ae60",
  lifestyle_exercise: "#3498db",
  warning_alert: "#f39c12",
};

// ─── Scene Builder ───────────────────────────────────────────────────────────

export function buildAnimationScene(
  sceneNumber: number,
  graphicType: VisualGraphicType,
  durationSeconds: number,
  narrationText: string,
  keyBulletPoints: string[]
): AnimationScene {
  const voiceoverCues: VoiceoverCue[] = [];
  const words = narrationText.split(/\s+/);
  const wordsPerCue = Math.ceil(words.length / 3);

  for (let i = 0; i < 3; i++) {
    const startWord = i * wordsPerCue;
    const cueWords = words.slice(startWord, startWord + wordsPerCue);
    voiceoverCues.push({
      startSeconds: (durationSeconds / 3) * i,
      text: cueWords.join(" "),
      highlightIndices: Array.from({ length: cueWords.length }, (_, j) => startWord + j),
    });
  }

  const keyframes: AnimationKeyframe[] = [
    {
      timeOffsetSeconds: 0,
      targetId: `scene-${sceneNumber}-graphic`,
      property: "opacity",
      toValue: "1",
      easing: "ease-in",
    },
    {
      timeOffsetSeconds: durationSeconds * 0.2,
      targetId: `scene-${sceneNumber}-bullets`,
      property: "transform",
      toValue: "translateX(0)",
      easing: "ease-out",
    },
    {
      timeOffsetSeconds: durationSeconds * 0.8,
      targetId: `scene-${sceneNumber}-graphic`,
      property: "filter",
      toValue: "brightness(1.1)",
      easing: "ease-in-out",
    },
  ];

  return {
    sceneNumber,
    graphicType,
    durationSeconds,
    keyframes,
    voiceoverCues,
    svgMarkup: SVG_MAP[graphicType] || SVG_WARNING,
    backgroundGradient: GRADIENT_MAP[graphicType],
    accentColor: ACCENT_MAP[graphicType],
  };
}

export function buildScenesFromScript(
  scenes: { sceneNumber: number; visualGraphicType: VisualGraphicType; durationSeconds: number; narrationText: string; keyBulletPoints: string[] }[]
): AnimationScene[] {
  return scenes.map((s) =>
    buildAnimationScene(s.sceneNumber, s.visualGraphicType, s.durationSeconds, s.narrationText, s.keyBulletPoints)
  );
}

export function getSvgForType(type: VisualGraphicType): string {
  return SVG_MAP[type] || SVG_WARNING;
}

export function getAccentColor(type: VisualGraphicType): string {
  return ACCENT_MAP[type] || "#3498db";
}

export function getBackgroundGradient(type: VisualGraphicType): string {
  return GRADIENT_MAP[type] || "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)";
}
