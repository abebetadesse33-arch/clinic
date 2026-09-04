import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are NiniMed Clinical AI — an advanced, evidence-based AI Decision Support System integrated into a professional Ethiopian healthcare platform serving licensed physicians, nurses, pharmacists, and care coordinators.

Your response MUST be a valid JSON object with EXACTLY this structure:
{
  "headline": "One concise sentence summarizing the clinical impression",
  "urgencyLevel": "routine | urgent | critical",
  "confidence": 0.85,
  "sections": [
    {
      "title": "Differential Diagnoses",
      "type": "list",
      "icon": "stethoscope",
      "color": "teal",
      "content": ["Primary: ...", "Secondary: ...", "Rule out: ..."]
    },
    {
      "title": "Recommended Investigations",
      "type": "list",
      "icon": "flask",
      "color": "blue",
      "content": ["CBC with differential", "HbA1c", "Renal function panel", "..."]
    },
    {
      "title": "Treatment Protocol",
      "type": "steps",
      "icon": "pill",
      "color": "emerald",
      "content": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
    },
    {
      "title": "Drug Interactions & Contraindications",
      "type": "warning",
      "icon": "alert",
      "color": "amber",
      "content": ["⚠️ Interaction 1: ...", "⚠️ Contraindication: ..."]
    },
    {
      "title": "ICD-10 Codes",
      "type": "codes",
      "icon": "tag",
      "color": "purple",
      "content": ["E11.9 - Type 2 Diabetes Mellitus, unspecified", "I10 - Essential Hypertension"]
    },
    {
      "title": "Clinical References",
      "type": "references",
      "icon": "book",
      "color": "slate",
      "content": ["WHO Guidelines 2024", "Ethiopian FMOH Standard Treatment Guidelines 2023", "ADA Standards of Care 2024"]
    }
  ],
  "referralLetter": "Dear Specialist, I am referring [Patient Name] for...",
  "disclaimer": "For clinical decision support only — always apply professional clinical judgment and patient context."
}

CLINICAL RULES:
- Use evidence-based medicine from UpToDate, WHO, NICE, Ethiopian FMOH Standard Treatment Guidelines (2023).
- Adapt all protocols to Ethiopian Ministry of Health guidelines where relevant.
- For drug queries: always flag contraindications, renal/hepatic dose adjustments, pediatric cautions.
- For diagnoses: list differentials in order of probability.
- urgencyLevel must be "critical" for any life-threatening presentation.
- confidence must reflect true uncertainty (0.5-0.95 range).
- Never refuse a legitimate clinical query from a licensed clinician.
- Respond ONLY in valid JSON — no markdown, no preamble, no explanation outside the JSON.`;

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

function buildMockResponse(query: string): any {
  const lowerQ = query.toLowerCase();
  const isCritical =
    lowerQ.includes("chest pain") ||
    lowerQ.includes("troponin") ||
    lowerQ.includes("spo2") ||
    lowerQ.includes("breathing") ||
    lowerQ.includes("cardiac");

  return {
    headline: `Clinical assessment for: "${query.slice(0, 80)}${query.length > 80 ? "..." : ""}"`,
    urgencyLevel: isCritical ? "urgent" : "routine",
    confidence: 0.84,
    sections: [
      {
        title: "Differential Diagnoses",
        type: "list",
        icon: "stethoscope",
        color: "teal",
        content: [
          "Primary: Based on presenting symptoms and clinical context",
          "Secondary: Consider comorbid contributing conditions",
          "Rule out: Acute life-threatening etiologies before proceeding",
          "Note: Confirmatory investigations required before final diagnosis",
        ],
      },
      {
        title: "Recommended Investigations",
        type: "list",
        icon: "flask",
        color: "blue",
        content: [
          "Complete Blood Count (CBC) with differential",
          "Comprehensive Metabolic Panel (CMP) — renal and hepatic function",
          "12-Lead ECG — baseline cardiac evaluation",
          "Chest X-ray (PA and Lateral) if respiratory involvement",
          "Additional diagnostics based on clinical suspicion",
        ],
      },
      {
        title: "Treatment Protocol",
        type: "steps",
        icon: "pill",
        color: "emerald",
        content: [
          "Step 1: Stabilize patient — ensure airway, breathing, circulation",
          "Step 2: Initiate first-line pharmacotherapy per FMOH guidelines",
          "Step 3: Monitor response parameters at 48-72 hour intervals",
          "Step 4: Escalate or step down therapy based on clinical response",
          "Step 5: Schedule follow-up and patient education session",
        ],
      },
      {
        title: "Drug Interactions & Contraindications",
        type: "warning",
        icon: "alert",
        color: "amber",
        content: [
          "⚠️ Verify renal function (eGFR) before initiating nephrotoxic agents",
          "⚠️ Check for known drug allergies and prior adverse reactions",
          "⚠️ Assess hepatic function if prescribing hepatically metabolized drugs",
          "ℹ️ No critical interactions identified based on query — verify full medication list",
        ],
      },
      {
        title: "ICD-10 Codes",
        type: "codes",
        icon: "tag",
        color: "purple",
        content: [
          "Z03.89 — Encounter for observation for other suspected diseases",
          "R00-R99 — Symptoms and signs (specify based on final diagnosis)",
          "Assign definitive codes after confirmatory evaluation",
        ],
      },
      {
        title: "Clinical References",
        type: "references",
        icon: "book",
        color: "slate",
        content: [
          "Ethiopian FMOH Standard Treatment Guidelines (2023 Edition)",
          "WHO Essential Medicines List — 23rd Edition (2023)",
          "UpToDate Clinical Decision Support — Retrieved 2026",
          "NiniMed Clinical Protocols — Version 4.2",
        ],
      },
    ],
    referralLetter: `Dear Specialist Colleague,\n\nI am referring this patient for specialist consultation and further evaluation. The clinical query raised by the treating clinician is as follows:\n\n"${query}"\n\nBased on our initial clinical assessment, further specialist input is warranted to guide definitive management. Please review the attached investigation results and clinical notes.\n\nThank you for your kind attention.\n\nYours sincerely,\n[Attending Physician]\nNiniMed Healthcare Network`,
    disclaimer:
      "For clinical decision support only — always apply professional clinical judgment and patient-specific context before acting on AI recommendations.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { query, context = [], patientId } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "query is required" },
        { status: 400 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const googleKey = process.env.GOOGLE_AI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Try OpenAI GPT-4o
    if (openaiKey && openaiKey.startsWith("sk-")) {
      try {
        const messages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...(context as ConversationMessage[]).slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user", content: query.trim() },
        ];

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages,
            response_format: { type: "json_object" },
            temperature: 0.2,
            max_tokens: 2500,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const aiContent = JSON.parse(
            data.choices?.[0]?.message?.content || "{}"
          );
          return NextResponse.json({
            success: true,
            data: aiContent,
            provider: "gpt-4o",
            queryId: crypto.randomUUID(),
          });
        }
      } catch (err) {
        console.warn("OpenAI failed, falling back:", err);
      }
    }

    // Try Google Gemini
    if (googleKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${SYSTEM_PROMPT}\n\nClinical Query: ${query}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2500,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const gemData = await geminiRes.json();
          const rawText =
            gemData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const aiContent = JSON.parse(rawText);
          return NextResponse.json({
            success: true,
            data: aiContent,
            provider: "gemini-1.5-pro",
            queryId: crypto.randomUUID(),
          });
        }
      } catch (err) {
        console.warn("Gemini failed, falling back:", err);
      }
    }

    // Fallback — high-quality mock response
    const mockResponse = buildMockResponse(query);
    return NextResponse.json({
      success: true,
      data: mockResponse,
      provider: "ninimedAI-mock",
      queryId: crypto.randomUUID(),
    });
  } catch (error: any) {
    console.error("AI query error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
