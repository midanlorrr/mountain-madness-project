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
}

/**
 * Hook that generates and speaks real-time coach critique every 5 seconds.
 * Combines filler word analysis + posture red flags into actionable coaching.
 */
export function useLiveCoachInterval(props: LiveCoachIntervalProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const propsRef = useRef(props);
  const givenAdviceRef = useRef<Set<string>>(new Set());

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
  ]);

  useEffect(() => {
    console.log("📋 Coach interval effect:", { isRecording: props.isRecording });

    if (!props.isRecording) {
      // Clear interval when not recording
      if (intervalRef.current) {
        console.log("🛑 Stopping critique loop");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      givenAdviceRef.current.clear(); // Reset advice tracking
      return;
    }

    console.log("▶️  Starting 5-second critique loop...");

    const generateCritique = async () => {
      const current = propsRef.current;

      console.log("🔍 Critique check:", {
        hasTranscript: !!current.transcript,
        isSpeaking: isSpeakingRef.current,
        transcript: current.transcript?.slice(0, 50),
      });

      if (!current.transcript || isSpeakingRef.current) {
        console.log("⏭️  Skipping critique: no transcript or already speaking");
        return;
      }

      try {
        isSpeakingRef.current = true;

        // Analyze fillers
        const fillerCounts = Object.entries(current.fillerWords)
          .filter(([_, count]) => (count as number) > 0)
          .map(([word, count]) => `${count} ${word}${(count as number) > 1 ? "s" : ""}`)
          .join(", ");

        // Build posture red flags
        const postureIssues = [];
        if (current.isCrossed) postureIssues.push("hands crossed");
        if (current.isClasped) postureIssues.push("hands clasped");
        if (
          current.postureFeedback &&
          !current.postureFeedback.toLowerCase().includes("good")
        ) {
          postureIssues.push(current.postureFeedback.toLowerCase());
        }

        console.log("📊 Detected issues:", { fillerCounts, postureIssues });

        // Prioritize issues: Posture > Fillers
        let focusIssue = "";
        let issueKey = "";
        
        if (postureIssues.length > 0) {
          // Posture is most important
          issueKey = postureIssues[0];
          focusIssue = `Posture: ${postureIssues[0]}`;
        } else if (fillerCounts) {
          // Speech fillers second
          issueKey = `filler: ${fillerCounts.split(',')[0]}`;
          focusIssue = `Speech: ${fillerCounts}`;
        } else {
          // No issues detected
          console.log("✅ No issues detected, skipping critique");
          isSpeakingRef.current = false;
          return;
        }
        
        // Skip if we've already given this advice
        if (givenAdviceRef.current.has(issueKey)) {
          console.log("⏭️  Already gave advice for:", issueKey);
          isSpeakingRef.current = false;
          return;
        }

        // Build critique prompt - focus on ONE thing
        const critiquePrompt = `You are a warm, supportive speech coach. The issue to address is: ${focusIssue}.

Give ONE gentle, specific instruction (max 8 words). Be kind yet clear about what to do.

Examples:
- "Open your arms to look confident"
- "Unclasp hands, try gesturing naturally"
- "Straighten your shoulders and lift chin"
- "Try pausing instead of saying like"
- "Relax your crossed arms please"

Your response (max 8 words):`;  

        console.log("🎯 Sending to Gemini...");
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: critiquePrompt,
        });

        const critique = response.text.trim();
        console.log("✅ Got critique:", critique);

        // Mark this advice as given
        givenAdviceRef.current.add(issueKey);
        
        // Speak the critique
        await speakTextOnce(critique);
        console.log("🔊 Spoke critique");
      } catch (error) {
        console.error("❌ Failed to generate critique:", error);
      } finally {
        isSpeakingRef.current = false;
      }
    };

    // Start 5-second critique loop
    intervalRef.current = setInterval(() => {
      console.log("⏰ 5-second interval fired");
      generateCritique();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [props.isRecording]);
}
