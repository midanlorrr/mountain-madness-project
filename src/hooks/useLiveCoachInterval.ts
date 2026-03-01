/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import { speakTextOnce } from "../services/elevenLabsService";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

interface LiveCoachIntervalProps {
  isRecording: boolean;
  transcript: string;
  fillerWords: Record<string, number>;
  postureFeedback: string;
  isCrossed: boolean;
  isClasped: boolean;
  isFacingForward: boolean;
  onCoachingGenerated?: (coaching: string) => void;
}

/**
 * Hook that generates and speaks real-time coach critique.
 * - Posture warnings trigger instantly on posture-state changes.
 * - Speech coaching runs continuously with richer transcript context.
 * - Voice playback never overlaps; latest message is queued.
 */
export function useLiveCoachInterval(props: LiveCoachIntervalProps) {
  const isSpeakingRef = useRef<boolean>(false);
  const pendingSpeechRef = useRef<string | null>(null);
  const propsRef = useRef(props);
  const lastPostureIssueRef = useRef<string>("");
  const lastAnalyzedSentenceCountRef = useRef<number>(0);
  const lastSpeechAnalysisTimeRef = useRef<number>(0);

  // Keep props ref updated without causing effect re-runs
  useEffect(() => {
    propsRef.current = props;
  }, [
    props.isRecording,
    props.transcript,
    props.fillerWords,
    props.postureFeedback,
    props.isCrossed,
    props.isClasped,
    props.isFacingForward,
    props.onCoachingGenerated,
  ]);

  const speakNonOverlapping = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    if (isSpeakingRef.current) {
      pendingSpeechRef.current = trimmed;
      return;
    }

    isSpeakingRef.current = true;
    try {
      await speakTextOnce(trimmed);
    } catch (error) {
      console.error("❌ Failed to speak coaching:", error);
    } finally {
      isSpeakingRef.current = false;

      if (pendingSpeechRef.current) {
        const queued = pendingSpeechRef.current;
        pendingSpeechRef.current = null;
        void speakNonOverlapping(queued);
      }
    }
  };

  const detectPostureIssue = (current: LiveCoachIntervalProps) => {
    if (current.isCrossed) {
      return {
        key: "crossed-arms",
        voice: "Open your arms.",
      };
    }

    if (current.isClasped) {
      return {
        key: "clasped-hands",
        voice: "Relax your hands.",
      };
    }

    if (!current.isFacingForward) {
      return {
        key: "face-off-center",
        voice: "Face forward.",
      };
    }

    if (current.postureFeedback && !current.postureFeedback.toLowerCase().includes("good")) {
      return {
        key: "posture-feedback",
        voice: current.postureFeedback,
      };
    }

    return null;
  };

  useEffect(() => {
    if (!props.isRecording) {
      lastPostureIssueRef.current = "";
      pendingSpeechRef.current = null;
      return;
    }

    const current = propsRef.current;
    const postureIssue = detectPostureIssue(current);
    const postureKey = postureIssue?.key ?? "";

    if (postureKey && postureKey !== lastPostureIssueRef.current) {
      lastPostureIssueRef.current = postureKey;
      if (current.onCoachingGenerated) {
        current.onCoachingGenerated(postureIssue!.voice);
      }
      void speakNonOverlapping(postureIssue!.voice);
    }

    if (!postureKey) {
      lastPostureIssueRef.current = "";
    }
  }, [
    props.isRecording,
    props.isCrossed,
    props.isClasped,
    props.isFacingForward,
    props.postureFeedback,
  ]);

  useEffect(() => {
    if (!props.isRecording) {
      lastAnalyzedSentenceCountRef.current = 0;
      return;
    }

    const generateSpeechCritique = async () => {
      const current = propsRef.current;
      if (!current.transcript) return;

      const now = Date.now();
      if (now - lastSpeechAnalysisTimeRef.current < 3000) {
        return;
      }

      const sentences = current.transcript
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (sentences.length === 0) return;

      const recentSentences = sentences.length >= 3
        ? sentences.slice(-3).join(". ")
        : sentences.join(". ");

      if (sentences.length === lastAnalyzedSentenceCountRef.current && sentences.length >= 3) {
        return;
      }

      lastSpeechAnalysisTimeRef.current = now;

      lastAnalyzedSentenceCountRef.current = sentences.length;

      const lastSentence = sentences[sentences.length - 1] ?? "";
      const lastSentenceWordCount = lastSentence.split(/\s+/).filter(Boolean).length;
      const averageSentenceLength = sentences.reduce(
        (sum, sentence) => sum + sentence.split(/\s+/).filter(Boolean).length,
        0,
      ) / sentences.length;

      const totalFillers = Object.values(current.fillerWords).reduce<number>(
        (sum, count) => sum + Number(count),
        0,
      );

      const speechSignal = {
        totalSentences: sentences.length,
        lastSentenceWordCount,
        averageSentenceLength: Number(averageSentenceLength.toFixed(1)),
        totalFillers,
      };

      const likelyIssue =
        totalFillers > 3
          ? "filler_words"
          : averageSentenceLength > 20
            ? "beating_around_the_bush"
            : lastSentenceWordCount > 25
              ? "too_long_sentence"
              : "general_flow";

      try {
        const critiquePrompt = `You are a warm speech coach giving live feedback.

Recent speech sample:
"${recentSentences}"

Signal metrics:
${JSON.stringify(speechSignal)}

Likely issue:
${likelyIssue}

Give one gentle and concise coaching line (no strict word limit, but keep it short and natural like a real coach).
Do not mention numbers. Give an actionable suggestion.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: critiquePrompt,
        });

        const critique = response.text.trim();
        if (!critique) return;

        if (current.onCoachingGenerated) {
          current.onCoachingGenerated(critique);
        }

        void speakNonOverlapping(critique);
      } catch (error) {
        console.error("❌ Failed to generate speech critique:", error);
      }
    };

    void generateSpeechCritique();
  }, [props.isRecording, props.transcript, props.fillerWords]);
}
