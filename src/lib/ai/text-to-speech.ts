export type TTSOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
};

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, options?: TTSOptions): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options?.lang || "en-US";
  utterance.rate = options?.rate ?? 0.92;
  utterance.pitch = options?.pitch ?? 1.0;

  // Wait for voices to load (chromium quirk)
  const applyVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes("Google UK English Female") ||
        v.name.includes("Google US English") ||
        v.name.includes("Samantha") ||
        v.name.includes("Natural") ||
        v.name.includes("Karen")
    );
    if (preferred) utterance.voice = preferred;
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    applyVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = applyVoice;
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis?.speaking ?? false;
}

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
