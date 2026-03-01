/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DEFAULT_MODEL_ID = "scribe_v1";

interface ElevenLabsSttResponse {
  text?: string;
}

/**
 * Transcribe an audio blob with ElevenLabs Speech-to-Text.
 * Returns an empty string if nothing was recognized.
 */
export async function transcribeAudioBlob(audioBlob: Blob, mimeType: string = "audio/webm"): Promise<string> {
  if (!audioBlob || audioBlob.size === 0) {
    return "";
  }

  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_ELEVENLABS_API_KEY");
  }

  // Map MIME type to file extension
  const extensionMap: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/mp4": "mp4",
  };
  const ext = extensionMap[mimeType] || "webm";

  const formData = new FormData();
  formData.append("file", audioBlob, `chunk.${ext}`);
  formData.append("model_id", DEFAULT_MODEL_ID);

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`ElevenLabs STT failed (${response.status}): ${details}`);
  }

  const data = (await response.json()) as ElevenLabsSttResponse;
  return (data.text ?? "").trim();
}
