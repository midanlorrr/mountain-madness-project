/**
 * Send session data to Gemini API and receive coaching feedback
 * @param {string} transcript - Full speech transcript
 * @param {object} posture - Posture metrics object
 * @param {number} fillerCount - Count of filler words detected
 * @returns {Promise<object>} Gemini analysis results
 */
export async function sendToGemini(transcript, posture, fillerCount) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  // If no API key, return placeholder results
  if (!apiKey) {
    console.warn('No Gemini API key found. Using placeholder results.')
    return {
      confidenceSummary: 'You spoke clearly and maintained reasonable posture. (Note: Connect Gemini API for real analysis)',
      speechTips: [
        'Try to reduce filler words for clearer communication.',
        'Vary your intonation to emphasize key points.',
      ],
      postureTips: [
        'Keep your shoulders level throughout your presentation.',
        'Maintain eye contact with your audience.',
      ],
      score: 7,
    }
  }

  try {
    // Prepare the prompt for Gemini
    const prompt = `You are a public speaking coach. Analyze this presentation session and provide feedback.

Transcript: "${transcript || 'No speech detected'}"

Metrics:
- Filler words (um, uh, like, basically, so): ${fillerCount}
- Shoulder slope: ${posture.metrics?.shoulderSlope?.toFixed(1) || 'N/A'}px
- Head tilt: ${posture.metrics?.headTilt?.toFixed(1) || 'N/A'}px

Provide your response in JSON format with:
{
  "confidenceSummary": "A brief 1-2 sentence summary of their performance",
  "speechTips": ["tip 1", "tip 2"],
  "postureTips": ["tip 1", "tip 2"],
  "score": 7
}

Be encouraging but constructive. Score should be 1-10.`

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error('No response from Gemini')
    }

    // Parse JSON from response (Gemini sometimes wraps in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Gemini response')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Gemini API error:', error)
    // Return fallback results on error
    return {
      confidenceSummary: 'Analysis unavailable. Please check your API connection.',
      speechTips: ['Enable Gemini API for detailed speech feedback.'],
      postureTips: ['Enable Gemini API for detailed posture feedback.'],
      score: 5,
    }
  }
}
