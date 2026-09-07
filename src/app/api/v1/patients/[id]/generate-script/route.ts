import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientEducationVideos } from "@/db/schema";
import { generatePatientVideoScript, ScriptGenerationParams } from "@/lib/ai/video-script-generator";
import { buildScenesFromScript } from "@/lib/video/animation-engine";
import { VisualGraphicType } from "@/lib/video/animation-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      diagnosis,
      icd10,
      medications = [],
      labResults = [],
      vitals,
      language = "en",
      tenantId,
      patientName = "Patient",
      age = 40,
      gender = "unknown",
    } = body;

    if (!diagnosis) {
      return NextResponse.json({ error: "diagnosis is required" }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Generate script via Gemini / fallback deterministic engine
    const scriptParams: ScriptGenerationParams = {
      patientName,
      age,
      gender,
      diagnosis,
      icd10,
      medications,
      labResults,
      vitals,
      language,
    };

    const script = await generatePatientVideoScript(scriptParams);
    const animationScenes = buildScenesFromScript(
      script.scenes.map((s) => ({
        sceneNumber: s.sceneNumber,
        visualGraphicType: s.visualGraphicType as VisualGraphicType,
        durationSeconds: s.durationSeconds,
        narrationText: s.narrationText,
        keyBulletPoints: s.keyBulletPoints,
      }))
    );

    // Persist to DB
    const [record] = await db
      .insert(patientEducationVideos)
      .values({
        tenantId,
        patientId: params.id,
        title: script.title,
        conditionName: diagnosis,
        script: JSON.stringify(script),
        language,
        videoType: "condition_explainer",
        durationSeconds: script.targetDurationSeconds || 60,
        animationConfig: {
          summary: script.summary,
          scenes: animationScenes,
          icd10Codes: icd10 ? [icd10] : [],
          relatedMedications: medications.map((m: { name: string }) => m.name || m),
          generationPrompt: scriptParams,
        },
        status: "draft",
      })
      .returning();

    return NextResponse.json({
      message: "Video script generated successfully",
      videoId: record.id,
      script,
      animationScenes,
      previewUrl: `/patient/education/preview/${record.id}`,
    });
  } catch (error) {
    console.error("Generate script error:", error);
    return NextResponse.json({ error: "Script generation failed" }, { status: 500 });
  }
}
