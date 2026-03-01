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
  onCoachingGenerated?: (coaching: string) => void;
}

/**
 * Hook that generates and speaks real-time coach critique every 5 seconds.
 * Combines filler word analysis + posture red flags + speech patterns into actionable coaching.
 * Warnings are spoken immediately when detected.
 */
export function useLiveCoachInterval(props: LiveCoachIntervalProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const propsRef = useRef(props);
  // const givenAdviceRef = useRef<Set<string>>(new Set()); // Commented out - allow repeats

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
      // givenAdviceRef.current.clear(); // Commented out - allow repeats
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

        // Extract last 3 sentences (or all if less than 3)
        const sentences = current.transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const recentSentences = sentences.slice(-3).join('. ');
        const sentenceCount = sentences.length;
        
        console.log("📝 Analyzing sentences:", { total: sentenceCount, recent: recentSentences.slice(0, 100) });

        // Analyze fillers in recent speech
        const fillerCounts = Object.entries(current.fillerWords)
          .filter(([_, count]) => (count as number) > 0)
          .map(([word, count]) => `${count} ${word}${(count as number) > 1 ? "s" : ""}`)
          .join(", ");

        // Analyze speech patterns
        const lastSentence = sentences[sentences.length - 1] || "";
        const wordCount = lastSentence.split(/\s+/).length;
        const avgSentenceLength = sentences.length > 0 
          ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length 
          : 0;
        
        const isTooVerbose = wordCount > 25; // Sentence is very long
        const isBeatingAroundBush = avgSentenceLength > 20; // Average sentence is long
        const totalFillers = Object.values(current.fillerWords).reduce((a, b) => (a as number) + (b as number), 0) as number;
        const hasExcessiveFillers = totalFillers > 3;

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

        console.log("📊 Detected issues:", { 
          fillerCounts, 
          postureIssues, 
          isTooVerbose, 
          isBeatingAroundBush,
          hasExcessiveFillers,
          avgSentenceLength 
        });

        // Prioritize issues: Posture > Speech patterns > Fillers
        let focusIssue = "";
        let twoWordSummary = ""; // Two-word summary to speak
        
        if (postureIssues.length > 0) {
          // Posture is most important
          const issue = postureIssues[0];
          focusIssue = `Posture: ${issue}`;
          
          // Generate two-word summary based on posture issue
          if (issue.includes("crossed")) {
            twoWordSummary = "Crossed Arms";
          } else if (issue.includes("clasped")) {
            twoWordSummary = "Clasped Hands";
          } else if (issue.includes("shoulder")) {
            twoWordSummary = "Fix Posture";
          } else if (issue.includes("neck") || issue.includes("chin")) {
            twoWordSummary = "Neck Position";
          } else {
            twoWordSummary = "Fix Posture";
          }
        } else if (isTooVerbose) {
          focusIssue = `Speech: Last sentence was ${wordCount} words - too verbose. Recent: "${recentSentences}"`;
          twoWordSummary = "Too Verbose";
        } else if (isBeatingAroundBush) {
          focusIssue = `Speech: Average sentence length is ${avgSentenceLength.toFixed(0)} words - beating around the bush. Recent: "${recentSentences}"`;
          twoWordSummary = "Be Concise";
        } else if (hasExcessiveFillers) {
          focusIssue = `Speech: Excessive filler words detected - ${fillerCounts}. Recent: "${recentSentences}"`;
          twoWordSummary = "Filler Words";
        } else if (fillerCounts) {
          // Regular fillers
          focusIssue = `Speech: ${fillerCounts}. Recent: "${recentSentences}"`;
          twoWordSummary = "Filler Words";
        } else {
          // No issues detected
          console.log("✅ No issues detected, skipping critique");
          isSpeakingRef.current = false;
          return;
        }
        
        // Commented out: Skip if we've already given this advice (allow repeats now)
        // if (givenAdviceRef.current.has(issueKey)) {
        //   console.log("⏭️  Already gave advice for:", issueKey);
        //   isSpeakingRef.current = false;
        //   return;
        // }

        // Build critique prompt - focus on ONE thing
        const critiquePrompt = `You are a warm, supportive speech coach. The issue to address is: ${focusIssue}.

Give ONE gentle, specific instruction (max 8 words). Be kind yet clear about what to do.

Examples:
- "Open your arms to look confident"
- "Unclasp hands, try gesturing naturally"
- "Straighten your shoulders and lift chin"
- "Try pausing instead of saying like"
- "Get to the point more directly"
- "Shorten your sentences for clarity"

Your response (max 8 words):`;  

        console.log("🎯 Sending to Gemini...");
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: critiquePrompt,
        });

        const critique = response.text.trim();
        console.log("✅ Got critique:", critique);

        // givenAdviceRef.current.add(issueKey); // Commented out - allow repeats
        
        // Call callback to add full coaching tip to recommendations log
        if (propsRef.current.onCoachingGenerated) {
          propsRef.current.onCoachingGenerated(critique);
        }
        
        // Speak two-word summary immediately (no queue)
        console.log("🔊 Speaking immediately:", twoWordSummary);
        await speakTextOnce(twoWordSummary);
        console.log("✅ Finished speaking");
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
