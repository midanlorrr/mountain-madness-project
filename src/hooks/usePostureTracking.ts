/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from "react";
import { PostureFeedback } from "../types";

export function usePostureTracking() {
  const [feedback, setFeedback] = useState<PostureFeedback>({
    message: "Initializing...",
    isGood: true,
  });
  const [chinLevel, setChinLevel] = useState<number>(0);
  const [wristDist, setWristDist] = useState<number>(0);
  const [isCrossed, setIsCrossed] = useState<boolean>(false);
  const [isClasped, setIsClasped] = useState<boolean>(false);

  const analyzePosture = useCallback((results: any) => {
    if (!results.poseLandmarks) {
      setFeedback({ message: "No person detected", isGood: false });
      setChinLevel(0);
      setWristDist(0);
      setIsCrossed(false);
      setIsClasped(false);
      return;
    }

    const landmarks = results.poseLandmarks;
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];

    // Helper to calculate 2D distance
    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    // 1. Shoulder Slope (difference in Y)
    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const isShouldersLevel = shoulderDiff < 0.05;

    // 2. Head Tilt / Chin Position
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const currentChinLevel = shoulderMidY - nose.y;
    setChinLevel(currentChinLevel);
    const isChinUp = currentChinLevel > 0.15;

    // 3. Clasped Hands Detection
    // If wrists are very close together
    const currentWristDist = dist(leftWrist, rightWrist);
    setWristDist(currentWristDist);
    const currentIsClasped = currentWristDist < 0.08;
    setIsClasped(currentIsClasped);

    // 4. Crossed Arms Detection
    // In mirrored view (standard webcam):
    // Normal: Left Wrist (15) is on the right of the image (high X), Right Wrist (16) is on the left (low X).
    // Crossed: Left Wrist (15).x < Right Wrist (16).x
    // We also check if wrists are near opposite elbows to be more sure
    const currentIsCrossed = leftWrist.x < rightWrist.x && 
                     (dist(leftWrist, rightElbow) < 0.15 || dist(rightWrist, leftElbow) < 0.15);
    setIsCrossed(currentIsCrossed);

    if (currentIsCrossed) {
      setFeedback({ message: "Uncross your arms for a more open posture", isGood: false });
    } else if (currentIsClasped) {
      setFeedback({ message: "Avoid clasping your hands; keep them visible and relaxed", isGood: false });
    } else if (!isShouldersLevel) {
      setFeedback({ message: "Straighten shoulders", isGood: false });
    } else if (!isChinUp) {
      setFeedback({ message: "Lift chin", isGood: false });
    } else {
      setFeedback({ message: "Good posture", isGood: true });
    }
  }, []);

  return {
    feedback,
    chinLevel,
    wristDist,
    isCrossed,
    isClasped,
    analyzePosture,
  };
}
