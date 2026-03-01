/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PostureData {
  nose: { x: number; y: number };
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
}

export interface PostureFeedback {
  message: string;
  isGood: boolean;
}

export interface SpeechAnalysis {
  confidenceSummary: string;
  speechTips: string[];
  postureTips: string[];
  score: number;
}

export interface TranscriptSegment {
  text: string;
  startTime: number; // Seconds from start of recording
  endTime: number;
}

export interface SpeechStats {
  transcript: string;
  segments: TranscriptSegment[];
  fillerWords: Record<string, number>;
}
