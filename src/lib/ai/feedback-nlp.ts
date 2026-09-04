import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FeedbackNLPAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // -1.0 to 1.0
  confidenceScore: number; // 0.0 to 1.0
  extractedThemes: string[];
  actionRecommendations: Array<{
    action: string;
    priority: "low" | "medium" | "high" | "critical";
    department: string;
    rationale: string;
  }>;
  urgencyLevel: "low" | "normal" | "elevated" | "critical_safety";
  isSafetyHazard: boolean;
  summary: string;
}

const THEME_DICTIONARY = [
  "wait_times",
  "triage_speed",
  "bedside_manner",
  "diagnostic_accuracy",
  "pharmacy_stock",
  "billing_transparency",
  "cleanliness_hygiene",
  "nursing_responsiveness",
  "telehealth_connectivity",
  "appointment_scheduling",
  "language_barrier",
  "staff_workload",
];

export async function analyzeFeedbackNLP(feedbackText: string, context?: {
  department?: string;
  category?: string;
  submitterType?: string;
  rating?: number;
}): Promise<FeedbackNLPAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are a clinical quality assurance and healthcare operations intelligence system. Analyze the following feedback from a hospital/clinic visitor or staff member.

Feedback Text: "${feedbackText}"
Context: Submitter=${context?.submitterType || "patient"}, Department=${context?.department || "General"}, Rating=${context?.rating || "N/A"}/5

Return a strictly valid JSON object (no markdown, no backticks) with:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": <number between -1.00 and 1.00>,
  "confidenceScore": <number between 0.50 and 1.00>,
  "extractedThemes": [<array of matching theme codes from: ${THEME_DICTIONARY.join(", ")}>],
  "actionRecommendations": [
    {
      "action": "<concise operational improvement recommendation>",
      "priority": "low" | "medium" | "high" | "critical",
      "department": "<Target Department e.g. Triage, Pharmacy, Inpatient, Billing, Facilities>",
      "rationale": "<brief explanation>"
    }
  ],
  "urgencyLevel": "low" | "normal" | "elevated" | "critical_safety",
  "isSafetyHazard": <true if text mentions adverse medication reaction, medical error, infection risk, or severe distress; otherwise false>,
  "summary": "<1-sentence executive summary>"
}`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        sentiment: parsed.sentiment || "neutral",
        sentimentScore: typeof parsed.sentimentScore === "number" ? parsed.sentimentScore : 0,
        confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.9,
        extractedThemes: Array.isArray(parsed.extractedThemes) ? parsed.extractedThemes : ["wait_times"],
        actionRecommendations: Array.isArray(parsed.actionRecommendations) ? parsed.actionRecommendations : [],
        urgencyLevel: parsed.urgencyLevel || "normal",
        isSafetyHazard: Boolean(parsed.isSafetyHazard),
        summary: parsed.summary || "Feedback processed by clinical NLP.",
      };
    } catch (err) {
      console.warn("[FeedbackNLP] Gemini API call failed, using rule-based heuristic fallback:", err);
    }
  }

  // Heuristic Rule-Based NLP Fallback
  return analyzeFeedbackHeuristic(feedbackText, context);
}

function analyzeFeedbackHeuristic(text: string, context?: {
  rating?: number;
  department?: string;
}): FeedbackNLPAnalysis {
  const lower = text.toLowerCase();

  const positiveWords = ["great", "excellent", "kind", "fast", "helpful", "good", "compassionate", "clean", "professional", "best", "thank", "pleased", "smooth"];
  const negativeWords = ["slow", "delayed", "rude", "dirty", "unhelpful", "bad", "terrible", "worst", "mistake", "error", "pain", "expensive", "confused", "overcrowded", "lost"];
  const safetyKeywords = ["reaction", "allergic", "wrong drug", "overdose", "bleeding", "unconscious", "fell", "infection", "hazard", "needle", "contaminated", "emergency"];

  let posCount = 0;
  let negCount = 0;

  positiveWords.forEach((w) => { if (lower.includes(w)) posCount++; });
  negativeWords.forEach((w) => { if (lower.includes(w)) negCount++; });

  const hasSafetyRisk = safetyKeywords.some((k) => lower.includes(k));

  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  let sentimentScore = 0;

  if (context?.rating) {
    if (context.rating >= 4) {
      sentiment = "positive";
      sentimentScore = (context.rating - 3) / 2;
    } else if (context.rating <= 2) {
      sentiment = "negative";
      sentimentScore = (context.rating - 3) / 2;
    }
  } else if (posCount > negCount) {
    sentiment = "positive";
    sentimentScore = Math.min(1.0, 0.2 + posCount * 0.25);
  } else if (negCount > posCount) {
    sentiment = "negative";
    sentimentScore = Math.max(-1.0, -0.2 - negCount * 0.25);
  }

  // Extract themes
  const extractedThemes: string[] = [];
  if (lower.includes("wait") || lower.includes("queue") || lower.includes("hour") || lower.includes("line")) extractedThemes.push("wait_times");
  if (lower.includes("nurse") || lower.includes("injection") || lower.includes("care")) extractedThemes.push("nursing_responsiveness");
  if (lower.includes("doctor") || lower.includes("attitude") || lower.includes("manner") || lower.includes("listen")) extractedThemes.push("bedside_manner");
  if (lower.includes("medicine") || lower.includes("drug") || lower.includes("pharmacy") || lower.includes("stock")) extractedThemes.push("pharmacy_stock");
  if (lower.includes("bill") || lower.includes("price") || lower.includes("payment") || lower.includes("cost")) extractedThemes.push("billing_transparency");
  if (lower.includes("clean") || lower.includes("bathroom") || lower.includes("toilet") || lower.includes("trash")) extractedThemes.push("cleanliness_hygiene");
  if (lower.includes("lab") || lower.includes("blood") || lower.includes("test") || lower.includes("result")) extractedThemes.push("triage_speed");

  if (extractedThemes.length === 0) extractedThemes.push("general_experience");

  // Action Recommendations
  const actionRecommendations: FeedbackNLPAnalysis["actionRecommendations"] = [];
  if (extractedThemes.includes("wait_times")) {
    actionRecommendations.push({
      action: "Deploy dynamic fast-track triage buffer and calibrate queue notifications.",
      priority: sentiment === "negative" ? "high" : "medium",
      department: context?.department || "Triage & Outpatient",
      rationale: "Patients flagged excessive wait times during peak hours.",
    });
  }
  if (extractedThemes.includes("pharmacy_stock")) {
    actionRecommendations.push({
      action: "Audit essential medicine formulary buffer stock and verify replenishment cycles.",
      priority: "high",
      department: "Pharmacy",
      rationale: "Identified potential prescription fulfillment friction.",
    });
  }
  if (hasSafetyRisk) {
    actionRecommendations.unshift({
      action: "URGENT: Initiate clinical quality audit and follow up with patient immediately.",
      priority: "critical",
      department: "Clinical Governance & Patient Safety",
      rationale: "Safety hazard keywords detected in unstructured narrative.",
    });
  }

  return {
    sentiment,
    sentimentScore: Number(sentimentScore.toFixed(2)),
    confidenceScore: 0.82,
    extractedThemes,
    actionRecommendations,
    urgencyLevel: hasSafetyRisk ? "critical_safety" : sentiment === "negative" ? "elevated" : "normal",
    isSafetyHazard: hasSafetyRisk,
    summary: hasSafetyRisk
      ? "Safety-critical feedback requiring immediate clinical administrator review."
      : sentiment === "negative"
      ? "Constructive feedback highlighting operational friction points."
      : "Positive healthcare experience feedback recorded.",
  };
}
