import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatbotResponse {
  message: string;
  isEmergencyRedFlag: boolean;
  emergencyType?: "chest_pain_acs" | "stroke_fast" | "severe_dyspnea" | "anaphylaxis" | "suicidal_crisis";
  emergencyActionInstructions?: string;
  suggestedQuickReplies: string[];
  disclaimer: string;
}

const RED_FLAG_KEYWORDS: Record<string, { type: ChatbotResponse["emergencyType"]; instructions: string }> = {
  "chest pain": {
    type: "chest_pain_acs",
    instructions: "🚨 EMERGENCY ALERT: Severe chest pain, pressure, or radiating pain to the jaw/arm could indicate a heart attack. Please call emergency services (911/907) immediately or go to the nearest emergency room. Do NOT drive yourself.",
  },
  "crushing pain": {
    type: "chest_pain_acs",
    instructions: "🚨 EMERGENCY ALERT: Please seek immediate emergency medical care.",
  },
  "can't breathe": {
    type: "severe_dyspnea",
    instructions: "🚨 EMERGENCY ALERT: Severe difficulty breathing is a medical emergency. Call emergency services immediately.",
  },
  "face drooping": {
    type: "stroke_fast",
    instructions: "🚨 EMERGENCY STROKE WARNING (FAST): Facial drooping, arm weakness, or slurred speech require immediate 911 emergency care.",
  },
  "slurred speech": {
    type: "stroke_fast",
    instructions: "🚨 EMERGENCY STROKE WARNING (FAST): Sudden speech difficulty requires immediate emergency medical transport.",
  },
  "kill myself": {
    type: "suicidal_crisis",
    instructions: "🚨 CRISIS SUPPORT: You are not alone. Please call or text the Suicide & Crisis Lifeline at 988 (or local crisis hotline) right now to speak with a trained counselor 24/7.",
  },
};

export async function processPatientChatMessage(
  messages: ChatMessage[],
  language: string = "en"
): Promise<ChatbotResponse> {
  const latestMessage = messages[messages.length - 1]?.content || "";
  const lower = latestMessage.toLowerCase();

  // 1. Red-flag emergency screening
  for (const [keyword, alert] of Object.entries(RED_FLAG_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return {
        message: alert.instructions,
        isEmergencyRedFlag: true,
        emergencyType: alert.type,
        emergencyActionInstructions: alert.instructions,
        suggestedQuickReplies: ["Call Emergency", "Find Nearest Hospital", "Notify Emergency Contact"],
        disclaimer: "This AI tool cannot replace emergency services. In a medical crisis, call 911/907 immediately.",
      };
    }
  }

  // 2. Gemini AI response with strict medical guardrails
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        systemInstruction: `
You are an empathetic, highly trained 24/7 Patient Health Assistant.
CRITICAL SAFETY GUARDRAILS:
1. You provide health education, symptom triage, medication explanations, and clinic navigation.
2. You NEVER provide a definitive clinical diagnosis or declare a condition 'safe' without a doctor.
3. Always include actionable self-care tips and clarify when to see a clinician.
4. If the user asks in Amharic, Oromo, Tigrinya, or Somali, reply in that language.
5. Keep answers concise, clear, and reassuring (under 150 words).
`,
      });

      const chat = model.startChat({
        history: messages.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      });

      const result = await chat.sendMessage(latestMessage);
      const text = result.response.text();

      return {
        message: text,
        isEmergencyRedFlag: false,
        suggestedQuickReplies: ["How do I take my medication?", "Book an appointment", "Explain my recent lab results"],
        disclaimer: "Information provided is for educational purposes and is not a formal medical diagnosis. Consult your healthcare provider for clinical treatment decisions.",
      };
    } catch (e) {
      console.warn("Patient chatbot Gemini API call failed, using fallback:", e);
    }
  }

  // 3. Fallback Response
  return getFallbackChatbotResponse(latestMessage, language);
}

function getFallbackChatbotResponse(query: string, lang: string): ChatbotResponse {
  const lower = query.toLowerCase();

  if (lang === "am") {
    return {
      message: "ጤና ይስጥልኝ! የጤና ረዳት AI ነኝ። ስለ መድሃኒቶችዎ አወሳሰድ፣ የላብራቶሪ ውጤቶችዎ ወይም የቀጠሮ መያዝ ጥያቄዎችን በደስታ እመልሳለሁ።",
      isEmergencyRedFlag: false,
      suggestedQuickReplies: ["ቀጠሮ ለመያዝ", "የመድሃኒት አወሳሰድ", "የዶክተር ምክር"],
      disclaimer: "ይህ መረጃ ለትምህርታዊ ዓላማ ብቻ የቀረበ ነው። ለአስቸኳይ ህክምና ዶክተርዎን ያማክሩ።",
    };
  }

  if (lower.includes("metformin") || lower.includes("medication")) {
    return {
      message: "Metformin is taken with meals to reduce stomach upset. Never skip prescribed doses without consulting your doctor. If you experience unusual muscle aches, tiredness, or nausea, contact the clinic.",
      isEmergencyRedFlag: false,
      suggestedQuickReplies: ["Side effects of Metformin", "What if I miss a dose?", "Book follow-up"],
      disclaimer: "Always follow the specific prescription instructions given by your physician or pharmacist.",
    };
  }

  if (lower.includes("appointment") || lower.includes("book") || lower.includes("schedule")) {
    return {
      message: "You can schedule an in-person clinic visit or a virtual telemedicine consultation directly through this portal. Would you like to select a specialist or general physician?",
      isEmergencyRedFlag: false,
      suggestedQuickReplies: ["Schedule Telemedicine", "In-Person Clinic Visit", "View Available Doctors"],
      disclaimer: "Routine visits only. For urgent symptoms, please visit the clinic immediately.",
    };
  }

  return {
    message: "I am your 24/7 digital health assistant. I can help explain your lab results, clarify medication instructions, guide your daily wellness habits, and schedule appointments with your care team.",
    isEmergencyRedFlag: false,
    suggestedQuickReplies: ["Check my lab results", "Medication questions", "Schedule a visit", "Symptom check"],
    disclaimer: "This AI assistant is an educational tool. For formal diagnoses and prescriptions, please consult your physician.",
  };
}
