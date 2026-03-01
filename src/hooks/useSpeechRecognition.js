import { useEffect, useRef, useState } from 'react'

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState('')
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setIsSupported(false)
      setError('Speech recognition not supported in this browser. Use Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setError('')
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = (event) => {
      setError(`Speech error: ${event.error}`)
    }

    recognition.onresult = (event) => {
      let interim = ''
      let committed = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          committed += ` ${text}`
        } else {
          interim += text
        }
      }

      if (committed) {
        setTranscript((prev) => `${prev} ${committed}`.trim())
      }

      setInterimTranscript(interim.trim())
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
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
  }

  return {
    transcript,
    interimTranscript,
    isListening,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  }
}
