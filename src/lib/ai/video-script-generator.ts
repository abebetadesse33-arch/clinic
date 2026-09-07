import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ScriptGenerationParams {
  patientName: string;
  age: number;
  gender: string;
  diagnosis: string;
  icd10?: string;
  medications?: { name: string; dosage: string; frequency: string; instructions?: string }[];
  labResults?: { name: string; value: string; unit: string; isAbnormal?: boolean }[];
  vitals?: { bp?: string; heartRate?: number; bmi?: number };
  language?: "en" | "am" | "om" | "ti" | "so";
  culturalContext?: string;
}

export interface VideoScene {
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  narrationText: string;
  visualGraphicType: "anatomy_heart" | "anatomy_pancreas_glucose" | "anatomy_kidney" | "anatomy_lungs" | "medication_pill" | "lifestyle_nutrition" | "lifestyle_exercise" | "warning_alert";
  keyBulletPoints: string[];
  calloutBadge?: string;
}

export interface GeneratedVideoScript {
  title: string;
  language: string;
  targetDurationSeconds: number;
  summary: string;
  scenes: VideoScene[];
}

export async function generatePatientVideoScript(
  params: ScriptGenerationParams
): Promise<GeneratedVideoScript> {
  const languageNames: Record<string, string> = {
    en: "English",
    am: "Amharic (አማርኛ)",
    om: "Afaan Oromoo",
    ti: "Tigrinya (ትግርኛ)",
    so: "Somali (Af-Soomaali)",
  };

  const selectedLang = params.language || "en";
  const langName = languageNames[selectedLang] || "English";

  const prompt = `
You are an expert Chief Medical Communication Officer and Patient Educator.
Create an empathetic, clear, highly illustrative 4-scene video script explaining a patient's medical condition and care plan.

PATIENT PROFILE:
- Name: ${params.patientName}
- Age: ${params.age}, Gender: ${params.gender}
- Primary Diagnosis: ${params.diagnosis} (${params.icd10 || "N/A"})
- Prescribed Medications: ${JSON.stringify(params.medications || [])}
- Recent Lab Findings: ${JSON.stringify(params.labResults || [])}
- Vitals: ${JSON.stringify(params.vitals || {})}
- Target Language: ${langName} (${selectedLang})

REQUIREMENTS:
1. Explain what is happening in the patient's body in simple, non-jargon language.
2. Break into exactly 4 sequential scenes:
   - Scene 1: Understanding Your Diagnosis (${params.diagnosis})
   - Scene 2: How Your Treatment & Medications Work
   - Scene 3: Nutrition & Daily Lifestyle Habits
   - Scene 4: Warning Symptoms & What to Watch For
3. Output MUST be valid JSON adhering to the exact schema:
{
  "title": "Short title in ${langName}",
  "language": "${selectedLang}",
  "targetDurationSeconds": 120,
  "summary": "Brief 1-sentence overview",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene headline",
      "durationSeconds": 30,
      "narrationText": "Voiceover text in ${langName}",
      "visualGraphicType": "anatomy_pancreas_glucose" | "anatomy_heart" | "anatomy_kidney" | "anatomy_lungs" | "medication_pill" | "lifestyle_nutrition" | "lifestyle_exercise" | "warning_alert",
      "keyBulletPoints": ["Point 1", "Point 2", "Point 3"],
      "calloutBadge": "Key takeaway label"
    }
  ]
}
`;

  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text) as GeneratedVideoScript;
    } catch (e) {
      console.error("Gemini Video Script Generator error, falling back to deterministic template:", e);
    }
  }

  // Fallback Deterministic Multilingual Template
  return getDeterministicScript(params, selectedLang);
}

function getDeterministicScript(
  params: ScriptGenerationParams,
  lang: string
): GeneratedVideoScript {
  const isDiabetes = params.diagnosis.toLowerCase().includes("diabet");
  const isHypertension = params.diagnosis.toLowerCase().includes("hyperten") || params.diagnosis.toLowerCase().includes("blood pressure");

  if (lang === "am") {
    return {
      title: `${params.diagnosis} - የጤና እና የህክምና ማብራሪያ`,
      language: "am",
      targetDurationSeconds: 120,
      summary: "ስለ ጤናዎ ሁኔታ እና ስለሚወስዱት ህክምና አጭር እና ግልጽ ማብራሪያ",
      scenes: [
        {
          sceneNumber: 1,
          title: "ስለ ጤናዎ ሁኔታ መረዳት",
          durationSeconds: 30,
          narrationText: `ጤና ይስጥልኝ ${params.patientName}። በምርመራዎ መሰረት ${params.diagnosis} እንዳለቦት ታውቋል። ይህም ሰውነትዎ ስኳርን ወይም የደም ግፊትን በአግባቡ መቆጣጠር ሲያቅተው የሚከሰት ነው።`,
          visualGraphicType: isDiabetes ? "anatomy_pancreas_glucose" : "anatomy_heart",
          keyBulletPoints: [
            "የሰውነት ሴሎች ስኳርን ለመጠቀም ሲቸገሩ ይከሰታል",
            "መደበኛ የደም ምርመራ ክትትል ያስፈልጋል",
            "በትክክለኛ ህክምና ሙሉ ጤንነትን መጠበቅ ይቻላል",
          ],
          calloutBadge: "ዋናው ነጥብ",
        },
        {
          sceneNumber: 2,
          title: "የታዘዙልዎት መድሃኒቶች እንዴት እንደሚሰሩ",
          durationSeconds: 30,
          narrationText: "የታዘዙልዎ መድሃኒቶች የደም ስኳርዎን ወይም ግፊትዎን ወደ ትክክለኛው መጠን እንዲመለስ ይረዳሉ። ሁልጊዜ በታዘዘው ሰዓትና ከምግብ ጋር መውሰድዎን አይርሱ።",
          visualGraphicType: "medication_pill",
          keyBulletPoints: [
            "መድሃኒትን በየቀኑ በተመሳሳይ ሰዓት መውሰድ",
            "ያለ ዶክተር ትዕዛዝ መድሃኒት አለማቋረጥ",
            "ከምግብ በኋላ መውሰድ የሆድ ህመምን ይቀንሳል",
          ],
          calloutBadge: "የመድሃኒት አወሳሰድ",
        },
        {
          sceneNumber: 3,
          title: "የምግብ እና የአኗኗር ዘይቤ ምክሮች",
          durationSeconds: 30,
          narrationText: "ጨው እና ጣፋጭ ምግቦችን መቀነስ፣ በየቀኑ ለ30 ደቂቃ ያህል የእግር ጉዞ ማድረግ እና በቂ ውሃ መጠጣት ለጤንነትዎ ከፍተኛ ለውጥ ያመጣል።",
          visualGraphicType: "lifestyle_nutrition",
          keyBulletPoints: [
            "ጨው እና የተጠበሱ ምግቦችን መቀነስ",
            "በየቀኑ 30 ደቂቃ የእግር ጉዞ ማድረግ",
            "በቂ ውሃ መጠጣትና ጭንቀትን መቀነስ",
          ],
          calloutBadge: "የአኗኗር ዘይቤ",
        },
        {
          sceneNumber: 4,
          title: "ልዩ ትኩረት የሚሹ ምልክቶች",
          durationSeconds: 30,
          narrationText: "ከፍተኛ ራስ ምታት፣ ማዞር፣ ወይም የትንፋሽ ማጠር ከተሰማዎት ወዲያውኑ ወደ ክሊኒካችን በመደወል ወይም በአካል በመምጣት ሀኪምዎን ያማክሩ።",
          visualGraphicType: "warning_alert",
          keyBulletPoints: [
            "ከፍተኛ የራስ ምታት ወይም ማዞር",
            "የልብ ምት መጨመር ወይም የትንፋሽ ማጠር",
            "ወዲያውኑ የህክምና እርዳታ ማግኘት",
          ],
          calloutBadge: "የጥንቃቄ ምልክቶች",
        },
      ],
    };
  }

  // English default
  return {
    title: `Understanding ${params.diagnosis}: Your Care & Recovery Guide`,
    language: "en",
    targetDurationSeconds: 120,
    summary: `A personalized visual guide explaining ${params.diagnosis}, your medication mechanism, and daily wellness steps.`,
    scenes: [
      {
        sceneNumber: 1,
        title: "Understanding Your Diagnosis",
        durationSeconds: 30,
        narrationText: `Hello ${params.patientName}. Your recent diagnostic tests confirm ${params.diagnosis}. In your body, cells require balanced metabolic regulation to function properly. When blood markers rise, organs require targeted support.`,
        visualGraphicType: isDiabetes ? "anatomy_pancreas_glucose" : isHypertension ? "anatomy_heart" : "anatomy_kidney",
        keyBulletPoints: [
          `Primary Condition: ${params.diagnosis}`,
          "Cellular glucose and vascular resistance require active balance",
          "Early intervention prevents long-term microvascular complications",
        ],
        calloutBadge: "Clinical Overview",
      },
      {
        sceneNumber: 2,
        title: "How Your Treatment Works",
        durationSeconds: 30,
        narrationText: "Your prescribed therapy acts like a key, restoring cellular sensitivity and protecting your kidneys and blood vessels from excess pressure and inflammation.",
        visualGraphicType: "medication_pill",
        keyBulletPoints: [
          "Improves target receptor efficiency and glucose clearance",
          "Take consistently with meals at the scheduled morning/evening intervals",
          "Do not skip doses even when feeling energetic",
        ],
        calloutBadge: "Pharmacotherapy",
      },
      {
        sceneNumber: 3,
        title: "Daily Nutrition & Movement",
        durationSeconds: 30,
        narrationText: "Pairing your prescription with 30 minutes of brisk walking and a low-sodium, high-fiber Mediterranean meal plan boosts treatment effectiveness by over 40%.",
        visualGraphicType: "lifestyle_nutrition",
        keyBulletPoints: [
          "Target < 2,000 mg sodium daily with leafy greens and whole grains",
          "30 minutes of low-impact walking 5 days a week",
          "Maintain consistent hydration with water over sweetened beverages",
        ],
        calloutBadge: "Daily Habits",
      },
      {
        sceneNumber: 4,
        title: "Key Warning Signs & Next Steps",
        durationSeconds: 30,
        narrationText: "Monitor your vitals at home. If you experience severe dizziness, blurred vision, or sudden shortness of breath, contact our clinic immediately or request a telehealth visit.",
        visualGraphicType: "warning_alert",
        keyBulletPoints: [
          "Unexplained dizziness, extreme fatigue, or chest tightness",
          "Next follow-up consultation in 4 weeks",
          "Log your daily readings in the patient portal",
        ],
        calloutBadge: "Safety Net",
      },
    ],
  };
}
