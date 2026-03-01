/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useScribe } from "@elevenlabs/react";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { TranscriptSegment } from "../types";

export const FILLER_WORDS = ["um", "uh", "like", "basically", "so"];

export function useSpeechRecognition(onSessionEnd?: () => void, onSentenceEnd?: (sentence: string) => void) {
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [fillerWords, setFillerWords] = useState<Record<string, number>>(
    FILLER_WORDS.reduce((acc, word) => ({ ...acc, [word]: 0 }), {})
  );
  const [sttError, setSttError] = useState<string | null>(null);
  
  const transcriptRef = useRef("");
  const startTimeRef = useRef<number>(0);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      // Update in real-time as user speaks
      const newText = data.text.trim();
      if (!newText) return;
      
      setTranscript(newText);
      transcriptRef.current = newText;
    },
    onCommittedTranscript: (data) => {
      // Final transcript segment
      const now = (Date.now() - startTimeRef.current) / 1000;
      
      setSegments((prev) => [
        ...prev,
        {
          text: data.text,
          startTime: Math.max(0, now - 2),
          endTime: now,
        },
      ]);

      if (onSentenceEnd && data.text.length > 5) {
        onSentenceEnd(data.text);
      }

      // Check for "end session" command
      if (transcriptRef.current.toLowerCase().includes("end session")) {
        scribe.disconnect();
        if (onSessionEnd) onSessionEnd();
      }
    },
    onError: (error) => {
      console.error("Scribe error:", error);
      setSttError("Speech recognition error occurred");
    },
  });

  const countFillerWords = useCallback((text: string) => {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const newFillerCounts = FILLER_WORDS.reduce((acc, word) => {
      const count = words.filter((w) => w === word).length;
      return { ...acc, [word]: count };
    }, {} as Record<string, number>);
    setFillerWords(newFillerCounts);
  }, []);

  // Update filler word counts whenever transcript changes
  useEffect(() => {
    if (transcript) {
      countFillerWords(transcript);
    }
  }, [transcript, countFillerWords]);

  const startRecording = useCallback(async () => {
    try {
      // Generate token client-side (QUICK APPROACH - insecure for production)
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!apiKey) {
        setSttError("Missing VITE_ELEVENLABS_API_KEY");
        return;
      }

      const client = new ElevenLabsClient({ apiKey });
      const tokenResponse = await client.tokens.singleUse.create("realtime_scribe");
      
      setTranscript("");
      transcriptRef.current = "";
      setSegments([]);
      setSttError(null);
      setFillerWords(FILLER_WORDS.reduce((acc, word) => ({ ...acc, [word]: 0 }), {}));
      startTimeRef.current = Date.now();

      await scribe.connect({
        token: tokenResponse.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (error) {
      console.error("Failed to start Scribe session:", error);
      setSttError("Microphone access denied or unavailable");
    }
  }, [scribe]);

  const stopRecording = useCallback(() => {
    scribe.disconnect();
  }, [scribe]);

  return {
    isRecording: scribe.isConnected,
    transcript,
    segments,
    fillerWords,
    sttError,
    startRecording,
    stopRecording,
  };
}
