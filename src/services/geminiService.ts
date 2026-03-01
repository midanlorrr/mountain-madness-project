/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || "" });

export async function getLiveFeedback(sentence: string) {
  if (!process.env.VITE_GEMINI_API_KEY) {
    console.warn("VITE_GEMINI_API_KEY not found. Live feedback disabled.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a speech coach. Analyze this sentence for vocal variety, pacing, and clarity. Provide a single, concise sentence of advice (max 15 words) that is encouraging and actionable. Sentence: "${sentence}"`,
      config: {
        systemInstruction: "You are a world-class public speaking coach. Your feedback is always brief, professional, and focuses on immediate improvement.",
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Live Feedback Error:", error);
    return null;
  }
}

export async function getComprehensiveSpeechAnalysis(transcript: string, fillerWordCounts: Record<string, number>) {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("VITE_GEMINI_API_KEY not found. Analysis disabled.");
    return null;
  }

  try {
    const fillerSummary = Object.entries(fillerWordCounts)
      .filter(([_, count]) => (count as number) > 0)
      .map(([word, count]) => `${word}: ${count}`)
      .join(", ") || "None detected";

    const analysisPrompt = `You are an expert speech coach. Analyze this transcript and filler word usage, then provide a comprehensive speech improvement analysis.

Transcript:
"${transcript}"

Filler Words Detected: ${fillerSummary}

Provide your analysis in the following JSON format:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvementAreas": ["area 1", "area 2", "area 3"],
  "pacing": "description of pacing and rhythm",
  "clarity": "assessment of message clarity",
  "engagement": "assessment of how engaging the delivery would be",
  "overallCoaching": "2-3 sentence overall recommendation"
}

Be encouraging and constructive. Focus on actionable improvements.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: analysisPrompt,
    });

    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Comprehensive Speech Analysis Error:", error);
    return null;
  }
}
