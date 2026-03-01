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
