import { useEffect, useState } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

/**
 * Custom hook for real-time posture tracking using MediaPipe Pose
 * Tracks nose, left shoulder, and right shoulder to calculate posture metrics
 */
export default function usePosture(webcamRef, active) {
  const [message, setMessage] = useState('Initializing...')
  const [metrics, setMetrics] = useState({ shoulderSlope: 0, headTilt: 0 })

  useEffect(() => {
    if (!active) {
      setMessage('Start session to track posture')
      return
    }

    let poseLandmarker = null
    let vision = null
    let intervalId = null
    let isMounted = true

    async function loadModel() {
      try {
        // Load MediaPipe vision tasks
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        )

        // Create pose landmarker
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        })

        if (!isMounted) return

        // Start detection loop (every 150ms for performance)
        intervalId = setInterval(() => {
          const video = webcamRef.current?.video
          if (!video || video.readyState !== 4) return

          try {
            // Run pose detection on current video frame
            const result = poseLandmarker.detectForVideo(video, video.currentTime * 1000)
            const landmarks = result.landmarks?.[0]
            
            if (!landmarks) return

            // Extract key landmarks (MediaPipe pose indices)
            // 0 = nose, 11 = left shoulder, 12 = right shoulder
            const nose = landmarks[0]
            const leftShoulder = landmarks[11]
            const rightShoulder = landmarks[12]

            // Calculate shoulder slope (vertical difference scaled to pixels)
            // Positive = right shoulder higher, Negative = left shoulder higher
            const shoulderSlope = (rightShoulder.y - leftShoulder.y) * 360

            // Calculate head tilt (how far forward the nose is from shoulder center)
            const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2
            const headTilt = (nose.y - shoulderCenterY) * 360

            // Update metrics for Gemini API
            setMetrics({ shoulderSlope, headTilt })

            // Determine posture message based on thresholds
            let postureMessage = '✅ Good posture'
            if (Math.abs(shoulderSlope) > 25) {
              postureMessage = '⚠️ Straighten shoulders'
            } else if (headTilt > 20) {
              postureMessage = '⚠️ Lift chin'
            }

            if (isMounted) setMessage(postureMessage)
          } catch (error) {
            console.error('Pose detection error:', error)
          }
        }, 150)
      } catch (error) {
        console.error('Failed to load pose model:', error)
        if (isMounted) setMessage('❌ Failed to load pose model')
      }
    }

    loadModel()

    // Cleanup on unmount or when active changes
    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
      if (poseLandmarker) poseLandmarker.close()
      if (vision) vision.close()
    }
  }, [active, webcamRef])

  return { message, metrics }
}
