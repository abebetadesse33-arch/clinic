/**
 * Video Recommendation Service
 * Curated YouTube & TikTok health video library mapped to ICD-10 codes
 * and medication names. Supports curation/approval workflow, relevance
 * ranking, and patient language preferences.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type VideoSource = "youtube" | "tiktok" | "internal";
export type VideoStatus = "pending" | "approved" | "rejected" | "flagged";
export type AudienceLevel = "patient" | "caregiver" | "professional";

export interface CuratedVideo {
  id: string;
  source: VideoSource;
  externalId: string;
  url: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSeconds: number;
  language: string;
  subtitleLanguages: string[];
  icd10Codes: string[];
  medications: string[];
  tags: string[];
  audienceLevel: AudienceLevel;
  status: VideoStatus;
  qualityScore: number; // 0-100
  viewCount?: number;
  likeRatio?: number;
  curatedBy?: string;
  curatedAt?: string;
  rejectionReason?: string;
  patientRatingAvg?: number;
  patientRatingCount?: number;
}

export interface RecommendationQuery {
  icd10Codes?: string[];
  medications?: string[];
  language?: string;
  audienceLevel?: AudienceLevel;
  maxResults?: number;
  minQualityScore?: number;
}

export interface RankedRecommendation {
  video: CuratedVideo;
  relevanceScore: number;
  matchedCriteria: string[];
}

// ─── Curated Video Library ────────────────────────────────────────────────────
// Real YouTube video IDs mapped to clinical codes for demonstration
// In production, this is populated by the curation admin console

const CURATED_LIBRARY: CuratedVideo[] = [
  // ─ Diabetes ─────────────────────────────────────────────────
  {
    id: "vid-001",
    source: "youtube",
    externalId: "wZAjVQWbMlE",
    url: "https://www.youtube.com/watch?v=wZAjVQWbMlE",
    title: "How Does Insulin Work? (Diabetes Explained Clearly)",
    channelName: "Medcram Medical Lectures",
    thumbnailUrl: "https://img.youtube.com/vi/wZAjVQWbMlE/hqdefault.jpg",
    durationSeconds: 480,
    language: "en",
    subtitleLanguages: ["en", "es", "fr"],
    icd10Codes: ["E11", "E11.9", "E13"],
    medications: ["insulin", "metformin"],
    tags: ["diabetes", "insulin", "blood sugar", "type 2 diabetes"],
    audienceLevel: "patient",
    status: "approved",
    qualityScore: 92,
    curatedBy: "system",
    patientRatingAvg: 4.7,
    patientRatingCount: 214,
  },
  {
    id: "vid-002",
    source: "youtube",
    externalId: "aenvNNHtHbA",
    url: "https://www.youtube.com/watch?v=aenvNNHtHbA",
    title: "Diabetes Diet: Best & Worst Foods",
    channelName: "Dr. Eric Berg",
    thumbnailUrl: "https://img.youtube.com/vi/aenvNNHtHbA/hqdefault.jpg",
    durationSeconds: 540,
    language: "en",
    subtitleLanguages: ["en"],
    icd10Codes: ["E11", "E11.9"],
    medications: ["metformin"],
    tags: ["diabetes", "diet", "nutrition", "low carb", "blood sugar control"],
    audienceLevel: "patient",
    status: "approved",
    qualityScore: 85,
    curatedBy: "system",
    patientRatingAvg: 4.5,
    patientRatingCount: 178,
  },
  // ─ Hypertension ─────────────────────────────────────────────
  {
    id: "vid-003",
    source: "youtube",
    externalId: "kEAzJFrwNWw",
    url: "https://www.youtube.com/watch?v=kEAzJFrwNWw",
    title: "High Blood Pressure - What You Need to Know",
    channelName: "Khan Academy Medicine",
    thumbnailUrl: "https://img.youtube.com/vi/kEAzJFrwNWw/hqdefault.jpg",
    durationSeconds: 620,
    language: "en",
    subtitleLanguages: ["en"],
    icd10Codes: ["I10", "I11", "I12"],
    medications: ["lisinopril", "amlodipine", "hydrochlorothiazide"],
    tags: ["hypertension", "blood pressure", "heart", "cardiovascular"],
    audienceLevel: "patient",
    status: "approved",
    qualityScore: 95,
    curatedBy: "system",
    patientRatingAvg: 4.8,
    patientRatingCount: 307,
  },
  {
    id: "vid-004",
    source: "youtube",
    externalId: "RFBG9-NU7nA",
    url: "https://www.youtube.com/watch?v=RFBG9-NU7nA",
    title: "DASH Diet for High Blood Pressure",
    channelName: "American Heart Association",
    thumbnailUrl: "https://img.youtube.com/vi/RFBG9-NU7nA/hqdefault.jpg",
    durationSeconds: 360,
    language: "en",
    subtitleLanguages: ["en", "es"],
    icd10Codes: ["I10"],
    medications: ["lisinopril"],
    tags: ["hypertension", "DASH diet", "sodium", "nutrition"],
    audienceLevel: "patient",
    status: "approved",
    qualityScore: 98,
    curatedBy: "system",
    patientRatingAvg: 4.9,
    patientRatingCount: 421,
  },
  // ─ Heart Failure ─────────────────────────────────────────────
  {
    id: "vid-005",
    source: "youtube",
    externalId: "VGhVdWHHvKQ",
    url: "https://www.youtube.com/watch?v=VGhVdWHHvKQ",
    title: "Heart Failure Explained Clearly",
    channelName: "Medcram Medical Lectures",
    thumbnailUrl: "https://img.youtube.com/vi/VGhVdWHHvKQ/hqdefault.jpg",
    durationSeconds: 900,
    language: "en",
    subtitleLanguages: ["en"],
    icd10Codes: ["I50", "I50.9"],
    medications: ["furosemide", "carvedilol", "spironolactone"],
    tags: ["heart failure", "cardiac", "ejection fraction", "fluid"],
    audienceLevel: "patient",
    status: "approved",
    qualityScore: 91,
    curatedBy: "system",
    patientRatingAvg: 4.6,
    patientRatingCount: 195,
  },
  // ─ Asthma / COPD ─────────────────────────────────────────────
  {
    id: "vid-006",
    source: "youtube",
    externalId: "z4JN3-h-OI8",
    url: "https://www.youtube.com/watch?v=z4JN3-h-OI8",
    title: "How to Use Your Inhaler Correctly",
    channelName: "AstraZeneca Patient Education",
    thumbnailUrl: "https://img.youtube.com/vi/z4JN3-h-OI8/hqdefault.jpg",
    durationSeconds: 240,
    language: "en",
    subtitleLanguages: ["en", "fr"],
    icd10Codes: ["J45", "J44"],
    medications: ["salbutamol", "budesonide", "formoterol"],
    tags: ["asthma", "COPD", "inhaler", "technique", "bronchodilator"],
    audienceLevel: "patient",
    status: "approved",
    qualityScore: 94,
    curatedBy: "system",
    patientRatingAvg: 4.8,
    patientRatingCount: 289,
  },
  // ─ Mental Health ─────────────────────────────────────────────
  {
    id: "vid-007",
    source: "youtube",
    externalId: "OqkChSAVtBk",
    url: "https://www.youtube.com/watch?v=OqkChSAVtBk",
    title: "Understanding Depression and How It Affects the Brain",
    channelName: "TED-Ed",
    thumbnailUrl: "https://img.youtube.com/vi/OqkChSAVtBk/hqdefault.jpg",
    durationSeconds: 270,
    language: "en",
    subtitleLanguages: ["en", "am", "fr", "ar"],
    icd10Codes: ["F32", "F33"],
    medications: ["fluoxetine", "sertraline", "amitriptyline"],
    tags: ["depression", "mental health", "antidepressant", "serotonin"],
    audienceLevel: "patient",
    status: "approved",
    qualityScore: 97,
    curatedBy: "system",
    patientRatingAvg: 4.9,
    patientRatingCount: 532,
  },
  // ─ Kidney Disease ─────────────────────────────────────────────
  {
    id: "vid-008",
    source: "youtube",
    externalId: "r9FELmUAGHU",
    url: "https://www.youtube.com/watch?v=r9FELmUAGHU",
    title: "Chronic Kidney Disease (CKD) - Stages, Causes, & Diet",
    channelName: "NephU - Online Nephrology Education",
    thumbnailUrl: "https://img.youtube.com/vi/r9FELmUAGHU/hqdefault.jpg",
    durationSeconds: 720,
    language: "en",
    subtitleLanguages: ["en"],
    icd10Codes: ["N18", "N18.3", "N18.4", "N18.5"],
    medications: ["furosemide", "erythropoietin"],
    tags: ["kidney", "CKD", "renal", "eGFR", "diet", "protein restriction"],
    audienceLevel: "patient",
    status: "approved",
    qualityScore: 90,
    curatedBy: "system",
    patientRatingAvg: 4.7,
    patientRatingCount: 156,
  },
];

// ─── ICD-10 Prefix Hierarchy ─────────────────────────────────────────────────

function icd10Matches(videoCode: string, queryCode: string): boolean {
  // E11 matches E11.9, E11 matches E11, etc.
  return queryCode.startsWith(videoCode) || videoCode.startsWith(queryCode);
}

// ─── Ranking Engine ──────────────────────────────────────────────────────────

export function getVideoRecommendations(query: RecommendationQuery): RankedRecommendation[] {
  const {
    icd10Codes = [],
    medications = [],
    language = "en",
    audienceLevel,
    maxResults = 5,
    minQualityScore = 75,
  } = query;

  const normMeds = medications.map((m) => m.toLowerCase().trim());
  const results: RankedRecommendation[] = [];

  for (const video of CURATED_LIBRARY) {
    if (video.status !== "approved") continue;
    if (video.qualityScore < minQualityScore) continue;
    if (audienceLevel && video.audienceLevel !== audienceLevel) continue;

    let relevanceScore = 0;
    const matchedCriteria: string[] = [];

    // Language match
    if (video.language === language) {
      relevanceScore += 20;
      matchedCriteria.push(`Language: ${language}`);
    } else if (video.subtitleLanguages.includes(language)) {
      relevanceScore += 10;
      matchedCriteria.push(`Subtitles: ${language}`);
    }

    // ICD-10 match
    for (const queryCode of icd10Codes) {
      for (const videoCode of video.icd10Codes) {
        if (icd10Matches(videoCode, queryCode)) {
          relevanceScore += 35;
          matchedCriteria.push(`Diagnosis: ${videoCode}`);
          break;
        }
      }
    }

    // Medication match
    for (const med of normMeds) {
      if (video.medications.some((vm) => vm.toLowerCase().includes(med) || med.includes(vm.toLowerCase()))) {
        relevanceScore += 25;
        matchedCriteria.push(`Medication: ${med}`);
      }
    }

    // Quality bonus
    relevanceScore += video.qualityScore * 0.15;

    // Rating bonus
    if (video.patientRatingAvg) {
      relevanceScore += video.patientRatingAvg * 2;
    }

    if (relevanceScore > 0 || matchedCriteria.length > 0) {
      results.push({ video, relevanceScore, matchedCriteria });
    }
  }

  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}

export function getVideoById(id: string): CuratedVideo | undefined {
  return CURATED_LIBRARY.find((v) => v.id === id);
}

export function getAllApprovedVideos(): CuratedVideo[] {
  return CURATED_LIBRARY.filter((v) => v.status === "approved");
}

export function getPendingVideos(): CuratedVideo[] {
  return CURATED_LIBRARY.filter((v) => v.status === "pending");
}

export function buildYouTubeEmbedUrl(externalId: string, startSeconds?: number): string {
  const base = `https://www.youtube-nocookie.com/embed/${externalId}?rel=0&modestbranding=1`;
  return startSeconds ? `${base}&start=${startSeconds}` : base;
}

export function buildYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " patient education")}`;
}
