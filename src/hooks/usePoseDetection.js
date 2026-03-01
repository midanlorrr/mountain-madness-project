import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export function usePoseDetection(videoRef, canvasRef) {
  const [posture, setPosture] = useState({
    shoulderSlope: 0,
    headTilt: 0,
    warning: 'Initializing pose detection...',
  })
  const [isReady, setIsReady] = useState(false)
  const poseLandmarkerRef = useRef(null)
  const intervalIdRef = useRef(null)

  // Constants for visualization
  const POSE_CONNECTIONS = [
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [11, 12],
    [23, 24],
    [11, 23],
    [12, 24],
  ]

  // Draw pose on canvas
  const drawPoseOnCanvas = (ctx, landmarks, width, height) => {
    landmarks.forEach((landmark) => {
      ctx.beginPath()
      ctx.arc(landmark.x * width, landmark.y * height, 4, 0, 2 * Math.PI)
      ctx.fillStyle = '#00FF00'
      ctx.fill()
    })

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx]
      const end = landmarks[endIdx]
      if (start && end && start.visibility > 0.3 && end.visibility > 0.3) {
        ctx.beginPath()
        ctx.moveTo(start.x * width, start.y * height)
        ctx.lineTo(end.x * width, end.y * height)
        ctx.strokeStyle = '#00FFFF'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
  }

  // Calculate posture metrics
  const calculatePostureMetrics = (landmarks) => {
    const nose = landmarks[0]
    const leftShoulder = landmarks[11]
    const rightShoulder = landmarks[12]

    const shoulderSlopeDiff = (rightShoulder.y - leftShoulder.y) * 360
    const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2
    const headTilt = (nose.y - shoulderCenterY) * 360

    return { shoulderSlope: shoulderSlopeDiff, headTilt }
  }

  // Generate warning message
  const getPostureWarning = (shoulderSlope, headTilt) => {
    if (Math.abs(shoulderSlope) > 25) {
      return `📏 Level your shoulders (${Math.abs(shoulderSlope).toFixed(0)}px off)`
    }
    if (headTilt > 20) {
      return `📌 Lift your chin - head too far forward (${headTilt.toFixed(0)}px)`
    }
    return '✅ Good posture - keep it up!'
  }

  useEffect(() => {
    let isMounted = true

    const initializePose = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        )

        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        })

        if (!isMounted) return

        setIsReady(true)

        // Start detection loop
        intervalIdRef.current = setInterval(() => {
          const video = videoRef.current?.video
          if (!video || video.readyState !== 4 || !poseLandmarkerRef.current) return

          try {
            const result = poseLandmarkerRef.current.detectForVideo(video, video.currentTime * 1000)

            if (!result.landmarks || !result.landmarks[0]) return

            const landmarks = result.landmarks[0]

            // Draw on canvas
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d')
              ctx.clearRect(0, 0, 480, 360)
              drawPoseOnCanvas(ctx, landmarks, 480, 360)
            }

            // Calculate metrics
            const metrics = calculatePostureMetrics(landmarks)
            const warning = getPostureWarning(metrics.shoulderSlope, metrics.headTilt)

            setPosture({
              shoulderSlope: metrics.shoulderSlope,
              headTilt: metrics.headTilt,
              warning,
            })
          } catch (error) {
            console.error('Pose detection error:', error)
          }
        }, 100)
      } catch (error) {
        console.error('Failed to initialize pose detection:', error)
        if (isMounted) {
          setPosture((prev) => ({
            ...prev,
            warning: '❌ Failed to load pose model',
          }))
        }
      }
    }

    initializePose()

    return () => {
      isMounted = false
      if (intervalIdRef.current) clearInterval(intervalIdRef.current)
      if (poseLandmarkerRef.current) poseLandmarkerRef.current.close()
    }
  }, [])

  return { posture, isReady }
}
