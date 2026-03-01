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
  
  const fullTranscriptRef = useRef("");
  const startTimeRef = useRef<number>(0);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      // Show real-time partial transcript combined with committed text
      const partialText = data.text.trim();
      if (!partialText) return;
      
      // Combine full committed transcript + current partial
      const combinedText = fullTranscriptRef.current 
        ? `${fullTranscriptRef.current} ${partialText}` 
        : partialText;
      
      setTranscript(combinedText);
    },
    onCommittedTranscript: (data) => {
      // Append to full transcript permanently
      const committedText = data.text.trim();
      if (!committedText) return;

      fullTranscriptRef.current = fullTranscriptRef.current 
        ? `${fullTranscriptRef.current} ${committedText}` 
        : committedText;
      
      setTranscript(fullTranscriptRef.current);

      const now = (Date.now() - startTimeRef.current) / 1000;
      
      setSegments((prev) => [
        ...prev,
        {
          text: committedText,
          startTime: Math.max(0, now - 2),
          endTime: now,
        },
      ]);

      if (onSentenceEnd && committedText.length > 5) {
        onSentenceEnd(committedText);
      }

      // Check for "end session" command variations in committed text or full transcript
      const fullText = fullTranscriptRef.current.toLowerCase();
      const committedLower = committedText.toLowerCase();
      console.log("🔍 Checking for 'end session':", { 
        committedText, 
        committedLower,
        fullText: fullText.slice(-100) 
      });
      
      // Check multiple variations
      const endPhrases = ["end session", "and session", "in session", "end the session", "stop session"];
      const hasEndCommand = endPhrases.some(phrase => 
        committedLower.includes(phrase) || fullText.includes(phrase)
      );
      
      if (hasEndCommand) {
        console.log("🛑 'End session' command detected! Stopping recording...");
        console.log("🛑 Committed:", committedText);
        console.log("🛑 Full transcript:", fullTranscriptRef.current);
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
      fullTranscriptRef.current = "";
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
