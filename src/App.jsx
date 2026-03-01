import { useState, useRef } from 'react'
import { usePoseDetection } from './hooks/usePoseDetection'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { PoseVisualization } from './components/PoseVisualization'
import { SpeechTranscript } from './components/SpeechTranscript'
import { Controls } from './components/Controls'
//import './App.css'

function App() {
  const webcamRef = useRef(null)
  const canvasRef = useRef(null)
  const [sessionActive, setSessionActive] = useState(false)

  // Hooks
  const { posture } = usePoseDetection(webcamRef, canvasRef)
  const {
    transcript,
    interimTranscript,
    isListening,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  // Session handlers
  const handleStart = () => {
    setSessionActive(true)
    startListening()
  }

  const handleStop = () => {
    setSessionActive(false)
    stopListening()
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 32 }}>🎤 Pitch Coach Live</h1>
        <p style={{ color: '#666', margin: 0 }}>Real-time posture & speech analysis for public speaking</p>
      </header>

      <Controls
        sessionActive={sessionActive}
        onStart={handleStart}
        onStop={handleStop}
        onReset={resetTranscript}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginBottom: 24,
        }}
      >
        <PoseVisualization webcamRef={webcamRef} canvasRef={canvasRef} posture={posture} />

        <SpeechTranscript
          transcript={transcript}
          interimTranscript={interimTranscript}
          isListening={isListening}
          error={error}
          isSupported={isSupported}
        />
      </div>
    </main>
  )
}

export default App
