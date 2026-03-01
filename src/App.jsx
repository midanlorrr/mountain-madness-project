import { useEffect, useRef, useState } from 'react'
import WebcamFeed from './components/WebcamFeed'
import ResultsPanel from './components/ResultsPanel'
import usePosture from './hooks/usePosture'
import useSpeechRecognition from './hooks/useSpeechRecognition'
import { sendToGemini } from './api/gemini'
import './App.css'

// export default function App() {
//   const webcamRef = useRef(null)
//   const [sessionActive, setSessionActive] = useState(false)
//   const [results, setResults] = useState(null)

//   // Posture tracking
//   const posture = usePosture(webcamRef, sessionActive)

//   // Speech tracking
//   const {
//     transcript,
//     interimTranscript,
//     isListening,
//     fillerCount,
//     startListening,
//     stopListening,
//     resetTranscript,
//   } = useSpeechRecognition(sessionActive)

//   // Handle session controls
//   const handleStart = () => {
//     setSessionActive(true)
//     resetTranscript()
//     setResults(null)
//     startListening()
//   }

//   const handleStop = async () => {
//     setSessionActive(false)
//     stopListening()
    
//     // Send to Gemini API
//     const geminiResults = await sendToGemini(transcript, posture, fillerCount)
//     setResults(geminiResults)
//   }

//   return (
//     <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui' }}>
//       <header style={{ marginBottom: 32, textAlign: 'center' }}>
//         <h1 style={{ margin: '0 0 8px', fontSize: 42 }}>StandTall AI</h1>
//         <p style={{ color: '#666', margin: 0 }}>Real-time posture & speech coaching</p>
//       </header>

//       <div style={{ display: 'flex', gap: 32 }}>
//         {/* Left Column: Webcam + Posture */}
//         <section style={{ flex: 1 }}>
//           <WebcamFeed webcamRef={webcamRef} />
          
//           <div style={{ marginTop: 16 }}>
//             <button 
//               onClick={handleStart} 
//               disabled={sessionActive}
//               style={{ 
//                 padding: '12px 24px', 
//                 fontSize: 16, 
//                 marginRight: 8,
//                 backgroundColor: sessionActive ? '#ccc' : '#4CAF50',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: 4,
//                 cursor: sessionActive ? 'not-allowed' : 'pointer'
//               }}
//             >
//               ▶️ Start
//             </button>
//             <button 
//               onClick={handleStop} 
//               disabled={!sessionActive}
//               style={{ 
//                 padding: '12px 24px', 
//                 fontSize: 16,
//                 backgroundColor: !sessionActive ? '#ccc' : '#F44336',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: 4,
//                 cursor: !sessionActive ? 'not-allowed' : 'pointer'
//               }}
//             >
//               ⏹️ Stop
//             </button>
//           </div>

//           <div style={{ 
//             marginTop: 16, 
//             padding: 16, 
//             backgroundColor: '#f5f5f5', 
//             borderRadius: 8,
//             border: '2px solid #ddd'
//           }}>
//             <h3 style={{ marginTop: 0 }}>📏 Posture</h3>
//             <div style={{ fontSize: 18, fontWeight: 'bold' }}>{posture.message}</div>
//           </div>
//         </section>

//         {/* Right Column: Speech + Results */}
//         <section style={{ flex: 1 }}>
//           <div style={{ 
//             padding: 16, 
//             backgroundColor: '#f5f5f5', 
//             borderRadius: 8,
//             border: '2px solid #ddd',
//             marginBottom: 24
//           }}>
//             <h3 style={{ marginTop: 0 }}>🎤 Speech</h3>
//             <div style={{ 
//               padding: 12, 
//               backgroundColor: 'white', 
//               border: '1px solid #ddd',
//               borderRadius: 4,
//               minHeight: 100,
//               marginBottom: 12,
//               fontFamily: 'monospace',
//               fontSize: 14
//             }}>
//               {transcript || <em style={{ color: '#999' }}>Your words will appear here...</em>}
//               {interimTranscript && <em style={{ color: '#666' }}> {interimTranscript}</em>}
//             </div>
//             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
//               <div>
//                 <strong>Status:</strong> {isListening ? '🔴 Listening' : '⚫ Not listening'}
//               </div>
//               <div>
//                 <strong>Filler words:</strong> {fillerCount}
//               </div>
//             </div>
//           </div>

//           {results && <ResultsPanel results={results} />}
//         </section>
//       </div>
//     </main>
//   )
// }

import { GoogleGenAI } from "@google/genai";

export default function App() {
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const ai = new GoogleGenAI({ apiKey });

    async function main() {
      try {
        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "Explain how AI works in a few words",
        });

        console.log(result.text);
      } catch (error) {
        console.error("Error calling Gemini:", error);
      }
    }

    main();
  }, []);

  return <div>Check console for response</div>;
}