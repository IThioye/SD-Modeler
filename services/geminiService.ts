
import { GoogleGenAI, Type } from "@google/genai";
import { SDModel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function modifyModel(currentModel: SDModel, instruction: string, focusId?: string): Promise<SDModel> {
  const focusElement = focusId 
    ? [...currentModel.stocks, ...currentModel.flows, ...currentModel.parameters].find(e => e.id === focusId)
    : null;

  const focusContext = focusId 
    ? `IMPORTANT: The user has SELECTED the element with ID "${focusId}" (Name: ${focusElement?.name}). Apply modifications SPECIFICALLY to its logic.`
    : "Modify the general system dynamics logic.";
  
  const prompt = `
    You are an expert Lead Systems Engineer at EuroMotion Automotive. 
    EuroMotion produces high-end ECUs.
    
    Current Model JSON:
    ${JSON.stringify(currentModel, null, 2)}
    
    User Request: "${instruction}"
    ${focusContext}
    
    Rules for Structural Integrity:
    1. SEPARATE MECHANISMS: If a formula becomes complex, break it into multiple 'converters'. 
    2. VISUAL LINKS: Every mathematical dependency MUST have an entry in the 'links' array with correct 'polarity' (+ or -).
    3. UNIT CONSISTENCY: Ensure flows use units/mo and converters use sensible ratios.
    4. RETURN FULL JSON: Return the complete updated SDModel object.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  try {
    const text = response.text?.trim() || "{}";
    return JSON.parse(text) as SDModel;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("AI generated invalid logic structure. Please refine your instruction.");
  }
}
