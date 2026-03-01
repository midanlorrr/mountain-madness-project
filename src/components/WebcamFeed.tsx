/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

interface WebcamFeedProps {
  onResults: (results: any) => void;
  onStreamReady?: (stream: MediaStream) => void;
  enabled?: boolean;
}

export const WebcamFeed: React.FC<WebcamFeedProps> = ({ onResults, onStreamReady, enabled = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const onResultsRef = useRef(onResults);

  // Update the ref whenever onResults changes
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    // Initialize Pose only once
    if (!poseRef.current) {
      try {
        const pose = new Pose({
          locateFile: (file) => {
            // Use the exact version from package.json for consistency
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
          },
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results) => {
          if (!results) return;
          onResultsRef.current(results);
          
          const canvasCtx = canvasRef.current?.getContext("2d");
          if (canvasCtx && canvasRef.current) {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Draw the image
            canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
            
            if (results.poseLandmarks) {
              const landmarks = results.poseLandmarks;
              const canvas = canvasRef.current!;
              
              // Define connections
              const connections = [
                [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Shoulders and arms
                [11, 23], [12, 24], [23, 24], // Torso
                [23, 25], [25, 27], [27, 29], [29, 31], [27, 31], // Left leg
                [24, 26], [26, 28], [28, 30], [30, 32], [28, 32], // Right leg
                [15, 17], [15, 19], [15, 21], [17, 19], // Left hand
                [16, 18], [16, 20], [16, 22], [18, 20], // Right hand
              ];

              // Draw connections
              canvasCtx.lineWidth = 2;
              canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
              connections.forEach(([i, j]) => {
                const p1 = landmarks[i];
                const p2 = landmarks[j];
                if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {
                  canvasCtx.beginPath();
                  canvasCtx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                  canvasCtx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                  canvasCtx.stroke();
                }
              });

              // Draw all landmarks
              landmarks.forEach((landmark: any, idx: number) => {
                if (landmark && landmark.visibility > 0.5) {
                  canvasCtx.beginPath();
                  canvasCtx.arc(
                    landmark.x * canvas.width,
                    landmark.y * canvas.height,
                    idx < 11 ? 3 : 4, // Smaller for face points
                    0,
                    2 * Math.PI
                  );
                  
                  // Color coding
                  if (idx < 11) canvasCtx.fillStyle = "#FFEB3B"; // Face: Yellow
                  else if ([11, 13, 15, 23, 25, 27, 29, 31].includes(idx)) canvasCtx.fillStyle = "#2196F3"; // Left side: Blue
                  else if ([12, 14, 16, 24, 26, 28, 30, 32].includes(idx)) canvasCtx.fillStyle = "#F44336"; // Right side: Red
                  else canvasCtx.fillStyle = "#4CAF50"; // Others: Green
                  
                  canvasCtx.fill();
                  
                  // Add a small glow
                  canvasCtx.shadowBlur = 5;
                  canvasCtx.shadowColor = canvasCtx.fillStyle as string;
                  canvasCtx.stroke();
                  canvasCtx.shadowBlur = 0;
                }
              });
            }
            canvasCtx.restore();
          }
        });

        poseRef.current = pose;
      } catch (err) {
        console.error("Failed to initialize Pose:", err);
      }
    }

    const pose = poseRef.current;

    // Initialize Camera
    if (!cameraRef.current && videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && poseRef.current && enabled) {
            // Ensure video is ready and has dimensions
            if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
              try {
                await poseRef.current.send({ image: videoRef.current });
              } catch (err) {
                // Ignore "buffer" errors if they happen during initialization
                if (err instanceof Error && !err.message.includes("buffer")) {
                  console.error("Pose detection error:", err);
                }
              }
            }
          }
        },
        width: 640,
        height: 480,
      });
      cameraRef.current = camera;
    }

    // Start/Stop camera based on enabled prop
    if (enabled) {
      cameraRef.current.start()
        .then(() => {
          if (onStreamReady && videoRef.current) {
            const stream = (videoRef.current as any).captureStream ? (videoRef.current as any).captureStream() : (videoRef.current as any).srcObject;
            if (stream) onStreamReady(stream);
          }
        })
        .catch(err => console.error("Camera start error:", err));
    } else {
      cameraRef.current.stop();
      // Clear canvas when disabled
      const canvasCtx = canvasRef.current.getContext("2d");
      canvasCtx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    return () => {
      // We don't necessarily want to close the pose instance on every re-render
      // but we should stop the camera on unmount
    };
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="w-full h-auto rounded-lg shadow-lg" width={640} height={480} />
    </div>
  );
};
