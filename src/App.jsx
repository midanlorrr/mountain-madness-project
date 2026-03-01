import { useState, useEffect, useRef } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import Webcam from 'react-webcam'
import './App.css'

const POSE_CONNECTIONS = [
  [11, 13], // left shoulder to left elbow
  [13, 15], // left elbow to left wrist
  [12, 14], // right shoulder to right elbow
  [14, 16], // right elbow to right wrist
  [11, 12], // left shoulder to right shoulder
  [23, 24], // left hip to right hip
  [11, 23], // left shoulder to left hip
  [12, 24], // right shoulder to right hip
  // Add more if you want full skeleton
]

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(()=>{
    let poseLandmarker = null;
    let vision = null;
    let intervalId;

    async function loadModel() {
      vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm');
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      })

      function tracking() {
        const video = webcamRef.current && webcamRef.current.video;
        if (video && video.readyState === 4) {
          const result = poseLandmarker.detectForVideo(video, video.currentTime * 1000);
          console.log('Pose result: ', result);
          if (canvasRef.current && result.landmarks && result.landmarks[0]) {
            const ctx = canvasRef.current.getContext('2d')
            ctx.clearRect(0, 0, 480, 360) // Clear previous frame

            // Draw each landmark as a small circle
            result.landmarks[0].forEach((landmark) => {
              ctx.beginPath()
              ctx.arc(landmark.x * 480, landmark.y * 360, 5, 0, 2 * Math.PI)
              ctx.fillStyle = 'lime'
              ctx.fill()
            })

            // Draw skeleton lines
            POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
              const start = result.landmarks[0][startIdx]
              const end = result.landmarks[0][endIdx]
              if (start && end) {
                ctx.beginPath()
                ctx.moveTo(start.x * 480, start.y * 360)
                ctx.lineTo(end.x * 480, end.y * 360)
                ctx.strokeStyle = 'cyan'
                ctx.lineWidth = 2
                ctx.stroke()
              }
            })
          }
        }
      }

      //intervalId = setInterval(tracking, 200)
      console.log('PoseLandmarker loaded!', poseLandmarker);
    }
    loadModel();

    return ()=> {
      clearInterval(intervalId);
      if (poseLandmarker) poseLandmarker.close();
      if (vision) vision.close();
    }

  }, []);

  return (
    <>
      <div style={{ position: 'relative', width: 480, height: 360 }}>
        <h1>Webcam Test</h1>
        <Webcam 
          ref={webcamRef}
          width = { 480 }
          height={360}
          videoConstraints={{facingMode: 'user'}}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />
      </div>
    </>
  )
}

export default App
