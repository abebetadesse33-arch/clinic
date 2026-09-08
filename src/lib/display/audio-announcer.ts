/**
 * Audio Alert & Text-to-Speech Engine for Waiting Room TV Display
 * Synthesizes a melodic hospital chime via Web Audio API,
 * followed by clear spoken voice direction via Web Speech API.
 */

class AudioAnnouncerService {
  private audioCtx: AudioContext | null = null;
  private isAudioUnlocked = false;
  private queue: Array<{ text: string; language: string; volume: number }> = [];
  private isSpeaking = false;

  /**
   * Unlock AudioContext on first user interaction or kiosk gesture
   */
  public unlockAudio(): boolean {
    if (typeof window === "undefined") return false;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      this.isAudioUnlocked = true;
      return true;
    } catch (e) {
      console.warn("[AudioAnnouncer] Could not unlock Web Audio:", e);
      return false;
    }
  }

  public isUnlocked(): boolean {
    return this.isAudioUnlocked;
  }

  /**
   * Play a clean, modern two-tone hospital ding-dong chime
   */
  public async playChime(volume = 0.8): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }

      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const masterGain = this.audioCtx.createGain();
      masterGain.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), now);
      masterGain.connect(this.audioCtx.destination);

      // Note 1: High crisp chime (F5 ~ 698.46 Hz)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(698.46, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.55);

      // Note 2: Harmonic resolving tone (C5 ~ 523.25 Hz)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(523.25, now + 0.25);
      gain2.gain.setValueAtTime(0.5, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.0);

      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (e) {
      console.warn("[AudioAnnouncer] Chime failed:", e);
    }
  }

  /**
   * Queue and speak an announcement with chime
   */
  public announcePatientCall(params: {
    ticketNumber: string;
    servicePoint: string;
    patientName?: string;
    language?: "en" | "am" | "om";
    volume?: number;
  }) {
    if (typeof window === "undefined") return;

    const volume = params.volume !== undefined ? params.volume / 100 : 0.8;
    const lang = params.language || "en";

    let text = "";
    if (lang === "am") {
      text = `ቲኬት ${params.ticketNumber}፣ እባክዎ ወደ ${params.servicePoint} ይሂዱ።`;
    } else if (lang === "om") {
      text = `Tikkeettii ${params.ticketNumber}، gara ${params.servicePoint} qajeelaa.`;
    } else {
      text = `Ticket ${params.ticketNumber}, please proceed to ${params.servicePoint}.`;
    }

    this.queue.push({ text, language: lang, volume });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;
    this.isSpeaking = true;

    const item = this.queue.shift();
    if (!item) {
      this.isSpeaking = false;
      return;
    }

    try {
      // 1. Play dual-tone alert chime first
      await this.playChime(item.volume);

      // 2. Speak via Web Speech API
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel(); // Stop stale speech
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.volume = item.volume;
        utterance.rate = 0.92; // Slightly slower for crisp acoustic clarity in waiting halls
        utterance.pitch = 1.05;

        // Choose appropriate voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find((v) =>
          item.language === "am" ? v.lang.startsWith("am") : v.lang.startsWith("en")
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          this.isSpeaking = false;
          setTimeout(() => this.processQueue(), 400);
        };

        utterance.onerror = () => {
          this.isSpeaking = false;
          setTimeout(() => this.processQueue(), 200);
        };

        window.speechSynthesis.speak(utterance);
      } else {
        this.isSpeaking = false;
        setTimeout(() => this.processQueue(), 200);
      }
    } catch {
      this.isSpeaking = false;
      setTimeout(() => this.processQueue(), 200);
    }
  }
}

export const AudioAnnouncer = new AudioAnnouncerService();
