/**
 * Quick utility to list available Gemini models
 */
import { GoogleGenAI } from "@google/genai";

export async function listAvailableModels() {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
  
  try {
    const modelsPager = await ai.models.list();
    const models: any[] = [];
    
    // Iterate through pager
    for await (const model of modelsPager) {
      models.push(model);
    }
    
    console.log("📋 Available Gemini Models:");
    console.log(models);
    
    // Filter for generative models
    const genModels = models.filter((m: any) => m.name && m.name.includes("gemini"));
    console.log("\n✅ Supported Gemini Models:");
    genModels.forEach((m: any) => {
      console.log(`- ${m.name}: ${m.displayName || m.name}`);
    });
    
    return genModels;
  } catch (error) {
    console.error("Failed to list models:", error);
  }
}

// Call this from browser console: await listAvailableModels()
(window as any).listAvailableModels = listAvailableModels;
