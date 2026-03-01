/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { TranscriptSegment } from "../types";

export const FILLER_WORDS = ["um", "uh", "like", "basically", "so"];

export function useSpeechRecognition(onSessionEnd?: () => void, onSentenceEnd?: (sentence: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [fillerWords, setFillerWords] = useState<Record<string, number>>(
    FILLER_WORDS.reduce((acc, word) => ({ ...acc, [word]: 0 }), {})
  );

  const recognitionRef = useRef<any>(null);
  const isRecordingActiveRef = useRef(false);
  const transcriptRef = useRef("");
  const startTimeRef = useRef<number>(0);

  const stopRecording = useCallback(() => {
    isRecordingActiveRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      const now = (Date.now() - startTimeRef.current) / 1000;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          finalTranscript += text + " ";
          
          // Trigger sentence end callback
          if (onSentenceEnd && text.length > 5) {
            onSentenceEnd(text);
          }

          // Add to segments
          setSegments(prev => [
            ...prev,
            {
              text: text,
              startTime: Math.max(0, now - 1.2), // Tighter offset for better sync
              endTime: now
            }
          ]);
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        transcriptRef.current = (transcriptRef.current + " " + finalTranscript).trim();
      }
      
      const currentDisplayTranscript = (transcriptRef.current + " " + interimTranscript).trim();
      setTranscript(currentDisplayTranscript);

      // Check for "end session"
      if (currentDisplayTranscript.toLowerCase().includes("end session")) {
        stopRecording();
        if (onSessionEnd) onSessionEnd();
        return;
      }

      // Count filler words
      const words = currentDisplayTranscript.toLowerCase().split(/\s+/);
      const newFillerCounts = FILLER_WORDS.reduce((acc, word) => {
        const count = words.filter((w) => w === word).length;
        return { ...acc, [word]: count };
      }, {});
      setFillerWords(newFillerCounts);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        console.warn("No speech detected. Continuing...");
        return;
      }
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (isRecordingActiveRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to restart speech recognition:", e);
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [stopRecording, onSessionEnd]);

  const startRecording = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript("");
      transcriptRef.current = "";
      setSegments([]);
      startTimeRef.current = Date.now();
      setFillerWords(FILLER_WORDS.reduce((acc, word) => ({ ...acc, [word]: 0 }), {}));
      isRecordingActiveRef.current = true;
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  }, []);

  return {
    isRecording,
    transcript,
    segments,
    fillerWords,
    startRecording,
    stopRecording,
  };
}
