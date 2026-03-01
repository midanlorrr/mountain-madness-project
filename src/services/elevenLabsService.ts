/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Lily - warm, friendly, natural female voice
const DEFAULT_VOICE_ID = "pFZP5JQG7iQjIQuC4Bku";

let currentAudio: HTMLAudioElement | null = null;

function speakWithBrowserTts(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      reject(new Error("Browser TTS is unavailable"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Browser TTS playback failed"));

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Reads text out loud once using ElevenLabs Text-to-Speech.
 * Uses the default voice unless a voiceId is provided.
 */
export async function speakTextOnce(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<void> {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    await speakWithBrowserTts(trimmedText);
    return;
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: trimmedText,
        model_id: "eleven_multilingual_v2",
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`ElevenLabs TTS failed (${response.status}): ${details}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error("Audio playback failed"));
      };

      audio.play().catch((err) => {
        URL.revokeObjectURL(audioUrl);
        reject(err instanceof Error ? err : new Error("Audio playback was blocked"));
      });
    });
  } catch (elevenLabsError) {
    console.warn("ElevenLabs unavailable, falling back to browser TTS:", elevenLabsError);
    await speakWithBrowserTts(trimmedText);
  }
}
