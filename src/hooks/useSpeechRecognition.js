import { useEffect, useRef, useState } from 'react'

// Common filler words to track
const FILLER_WORDS = ['um', 'uh', 'like', 'basically', 'so']

/**
 * Custom hook for real-time speech recognition using Web Speech API
 * Tracks transcript and counts filler words
 */
export default function useSpeechRecognition(active) {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [fillerCount, setFillerCount] = useState(0)
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser')
      return
    }

    // Create recognition instance
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    // Handle speech results
    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      // Process all results from this event
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          final += ` ${text}`
        } else {
          interim += text
        }
      }

      // Update final transcript
      if (final) {
        setTranscript((prev) => {
          const updated = `${prev} ${final}`.trim()
          
          // Count filler words in the full transcript
          const lowerText = updated.toLowerCase()
          const count = FILLER_WORDS.reduce((sum, word) => {
            // Use word boundaries to match whole words only
            const regex = new RegExp(`\\b${word}\\b`, 'g')
            const matches = lowerText.match(regex)
            return sum + (matches ? matches.length : 0)
          }, 0)
          
          setFillerCount(count)
          return updated
        })
      }

      // Update interim transcript
      setInterimTranscript(interim.trim())
    }

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onend = () => {
      setIsListening(false)
      // Auto-restart if still active
      if (active && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (error) {
          // Ignore if already started
        }
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'no-speech') {
        // This is normal, just continue
        return
      }
      setIsListening(false)
    }

    recognitionRef.current = recognition

    // Auto-start if active
    if (active) {
      try {
        recognition.start()
      } catch (error) {
        console.error('Failed to start recognition:', error)
      }
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [active])

  // Manual control functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error('Failed to start:', error)
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setInterimTranscript('')
    }
  }

  const resetTranscript = () => {
    setTranscript('')
    setInterimTranscript('')
    setFillerCount(0)
  }

  return {
    transcript,
    interimTranscript,
    isListening,
    fillerCount,
    startListening,
    stopListening,
    resetTranscript,
  }
}
