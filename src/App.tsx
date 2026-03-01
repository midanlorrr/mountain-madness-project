/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { WebcamFeed } from "./components/WebcamFeed";
import { LandingPage } from "./components/LandingPage";
import { usePostureTracking } from "./hooks/usePostureTracking";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useVideoRecorder } from "./hooks/useVideoRecorder";
import { useLiveCoachInterval } from "./hooks/useLiveCoachInterval";
import { getLiveFeedback, getComprehensiveSpeechAnalysis } from "./services/geminiService";
import { speakTextOnce } from "./services/elevenLabsService";
import logo from "./assets/logo.svg";
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  ArrowLeft, 
  Zap, 
  Play, 
  BarChart3, 
  RefreshCw,
  Brain,
  Terminal,
  Loader2,
  CheckCircle2,
  Volume2,
  Sparkles,
  Heart,
  TrendingUp,
  User
} from "lucide-react";

export default function App() {
  const [view, setView] = useState<"landing" | "app" | "analysis">("landing");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [liveFeedback, setLiveFeedback] = useState<string | null>(null);
  const [coachRecommendations, setCoachRecommendations] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeakingPosture, setIsSpeakingPosture] = useState(false);
  const [speechAnalysis, setSpeechAnalysis] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  const { feedback, chinLevel, wristDist, isCrossed, isClasped, analyzePosture } = usePostureTracking();
  
  const onSessionEnd = useCallback(() => {
    setSessionEnded(true);
  }, []);

  const handleSentenceEnd = useCallback(async (sentence: string) => {
    setIsAnalyzing(true);
    const advice = await getLiveFeedback(sentence);
    if (advice) {
      setLiveFeedback(advice);
      setCoachRecommendations(prev => [...prev, advice]);
    }
    setIsAnalyzing(false);
  }, []);

  const { 
    isRecording: isSpeechRecording, 
    transcript,
    fillerWords,
    segments,
    sttError,
    startRecording: startSpeechRecording, 
    stopRecording: stopSpeechRecording 
  } = useSpeechRecognition(onSessionEnd, handleSentenceEnd);

  // Activate 5-second live coach critique (only on app page)
  useLiveCoachInterval({
    isRecording: view === "app" ? isSpeechRecording : false,
    transcript,
    fillerWords,
    postureFeedback: feedback.message,
    isCrossed,
    isClasped,
    onCoachingGenerated: (coaching) => {
      setCoachRecommendations(prev => [...prev, coaching]);
    },
  });

  const [displayedSttError, setDisplayedSttError] = useState<string | null>(null);

  // Auto-clear STT error banner after 5 seconds
  React.useEffect(() => {
    if (sttError) {
      setDisplayedSttError(sttError);
      const timer = setTimeout(() => {
        setDisplayedSttError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sttError]);

  const {
    isRecording: isVideoRecording,
    videoUrl,
    startRecording: startVideoRecording,
    stopRecording: stopVideoRecording
  } = useVideoRecorder();

  const isRecording = isSpeechRecording || isVideoRecording;
  const [stream, setStream] = useState<MediaStream | null>(null);
  const activeAudioStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRequestedRef = useRef(false);

  const handleStop = useCallback(() => {
    isRecordingRequestedRef.current = false;
    stopSpeechRecording();
    stopVideoRecording();
    setSessionEnded(true);
    
    // Stop only the audio tracks we manually started
    if (activeAudioStreamRef.current) {
      activeAudioStreamRef.current.getTracks().forEach(track => track.stop());
      activeAudioStreamRef.current = null;
    }
  }, [stopSpeechRecording, stopVideoRecording]);

  // Stop all processes immediately when session ends
  React.useEffect(() => {
    if (sessionEnded) {
      console.log("🛑 Session ended - stopping all processes");
      handleStop();
    }
  }, [sessionEnded, handleStop]);

  const handleStartAnalysis = useCallback(() => {
    if (!transcript) return;
    setIsLoadingAnalysis(true);
    // Call Gemini for analysis
    getComprehensiveSpeechAnalysis(transcript, fillerWords).then((analysis) => {
      setSpeechAnalysis(analysis);
      setIsLoadingAnalysis(false);
    });
    setView("analysis");
  }, [transcript, fillerWords]);

  const handleReadPosture = useCallback(async () => {
    const message = cameraEnabled ? feedback.message : "Camera is disabled. Enable camera for posture feedback.";

    setIsSpeakingPosture(true);
    try {
      await speakTextOnce(message);
    } catch (err) {
      console.error("Failed to read posture feedback:", err);
      alert("Could not play ElevenLabs audio. Check your API key and browser audio permissions.");
    } finally {
      setIsSpeakingPosture(false);
    }
  }, [cameraEnabled, feedback.message]);

  const handleStart = useCallback(async () => {
    if (!micEnabled) {
      alert("Please enable the microphone to start a speech session.");
      return;
    }
    isRecordingRequestedRef.current = true;
    setSessionEnded(false);
    setLiveFeedback(null);
    setCoachRecommendations([]);
    startSpeechRecording();
    
    if (stream) {
      try {
        // Capture audio to include in the recording
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (!isRecordingRequestedRef.current) {
          audioStream.getTracks().forEach(track => track.stop());
          return;
        }

        activeAudioStreamRef.current = audioStream;
        
        const combinedStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...audioStream.getAudioTracks()
        ]);
        startVideoRecording(combinedStream);
      } catch (err) {
        console.error("Failed to include audio in recording:", err);
        if (isRecordingRequestedRef.current) {
          startVideoRecording(stream);
        }
      }
    }
  }, [startSpeechRecording, startVideoRecording, micEnabled, stream]);

  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  const activeSegmentIndex = useMemo(() => {
    if (segments.length === 0) return -1;
    return segments.findIndex((segment, i) => {
      const nextSegment = segments[i + 1];
      return currentVideoTime >= segment.startTime && (!nextSegment || currentVideoTime < nextSegment.startTime);
    });
  }, [segments, currentVideoTime]);

  // Fix: Stop recording if camera is disabled during a session
  React.useEffect(() => {
    if (!cameraEnabled && isRecording) {
      handleStop();
    }
  }, [cameraEnabled, isRecording, handleStop]);

  const highlightedTranscript = useMemo(() => {
    if (!transcript) return null;
    
    const words = transcript.split(/(\s+)/);
    const fillerWordsList = ["um", "uh", "like", "basically", "so"];
    return words.map((word, i) => {
      const cleanWord = word.toLowerCase().trim();
      if (fillerWordsList.includes(cleanWord)) {
        return <span key={i} className="text-red-500 font-bold underline decoration-red-300">{word}</span>;
      }
      return <span key={i}>{word}</span>;
    });
  }, [transcript]);

  const synchronizedTranscript = useMemo(() => {
    if (!transcript) return null;
    
    const fillerWordsList = ["um", "uh", "like", "basically", "so"];
    
    // If segments exist, use them for timestamp-based highlighting
    if (segments.length > 0) {
      return (
        <div className="space-y-2 leading-relaxed">
          {segments.map((segment, segIdx) => (
            <div
              key={segIdx}
              className={`p-2 rounded transition-all ${
                activeSegmentIndex === segIdx
                  ? "bg-yellow-200 border-l-4 border-yellow-500 scale-105"
                  : "bg-transparent"
              }`}
            >
              <div className="flex flex-wrap">
                {segment.text.split(/\s+/).map((word, i) => {
                  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
                  if (fillerWordsList.includes(cleanWord)) {
                    return (
                      <span key={i} className="text-red-500 font-bold underline decoration-red-300 mx-1">
                        {word}
                      </span>
                    );
                  }
                  return (
                    <span key={i} className="mx-1">
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // Fallback: display full transcript without segment highlighting
    const words = transcript.split(/\s+/);
    return (
      <div className="space-y-1 leading-relaxed">
        {words.map((word, i) => {
          const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
          if (fillerWordsList.includes(cleanWord)) {
            return <span key={i} className="text-red-500 font-bold underline decoration-red-300 mx-1">{word}</span>;
          }
          return <span key={i} className="mx-1">{word}</span>;
        })}
      </div>
    );
  }, [transcript, segments, activeSegmentIndex]);

  // Mission Header Component (reusable)
  const MissionHeader = () => (
    <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* <img src={logo} alt="StageSense Logo" className="h-8 w-8" /> */}
          <h2 className="text-sm font-bold tracking-wide">StageSense</h2>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
          <User className="w-4 h-4" />
          <span className="font-medium">Default User</span>
        </div>
      </div>
    </div>
  );

  // Footer Component
  const Footer = () => (
    <footer className="bg-gray-900 text-gray-300 py-6 px-4 mt-auto text-center">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-gray-400">Made by midanlorrr</p>
      </div>
    </footer>
  );

  if (view === "landing") {
    return (
      <div className="min-h-screen flex flex-col">
        <MissionHeader />
        <LandingPage onStart={() => setView("app")} />
        <Footer />
      </div>
    );
  }

  if (view === "analysis") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 font-sans flex flex-col">
        <MissionHeader />

        <div className="p-4 md:p-8">
          <header className="mb-8 flex items-center gap-4 max-w-7xl mx-auto">
            <button 
              onClick={() => setView("app")}
              className="p-2 hover:bg-emerald-50 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-emerald-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">Session Analysis</h1>
              <p className="text-gray-600 text-sm">Review your performance with synchronized playback.</p>
            </div>
          </header>

          <main className="space-y-8 max-w-7xl mx-auto">
            {/* Top Row: Video and Transcript */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side: Video Playback */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0 }}
              >
                <section className="card-base p-6 flex flex-col h-[calc(100vh-200px)] border-2 border-blue-100 shadow-lg shadow-blue-100/50">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-blue-600" />
                    <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Session Recording</span>
                  </h2>
                  <div className="flex-grow bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center">
                    {videoUrl ? (
                      <video 
                        src={videoUrl} 
                        controls 
                        className="w-full h-full object-contain"
                        onTimeUpdate={(e) => setCurrentVideoTime((e.target as HTMLVideoElement).currentTime)}
                      />
                    ) : (
                      <div className="text-center space-y-2">
                        <Loader2 className="w-8 h-8 text-gray-600 animate-spin mx-auto" />
                        <p className="text-gray-500">Processing video...</p>
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>

              {/* Right Side: Synchronized Transcript */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                <section className="card-base p-6 flex flex-col h-[calc(100vh-200px)] border-2 border-emerald-100 shadow-lg shadow-emerald-100/50">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5 text-emerald-600" />
                    <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">Transcript</span>
                  </h2>
                  <div className="flex-grow p-6 bg-gradient-to-br from-emerald-50/30 to-blue-50/30 rounded-2xl border-2 border-emerald-100 overflow-y-auto custom-scrollbar">
                    <div className="text-base text-gray-800 leading-relaxed whitespace-normal break-words">
                      {synchronizedTranscript}
                    </div>
                  </div>
                  
                  <h2 className="text-lg font-semibold mt-4 mb-2 flex items-center gap-2 text-sm">
                    <Heart className="w-4 h-4 text-emerald-600" />
                    <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">Live Coaching</span>
                  </h2>
                  <div className="h-32 p-3 bg-gradient-to-br from-blue-50/50 to-emerald-50/50 rounded-xl border-2 border-blue-100 overflow-y-auto custom-scrollbar text-sm">
                    {coachRecommendations.length > 0 ? (
                      <ul className="space-y-2">
                        {coachRecommendations.slice(-3).map((rec, i) => (
                          <li key={i} className="text-xs text-gray-700 leading-snug">
                            • {rec}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 text-xs italic">Coaching will appear here.</p>
                    )}
                  </div>
                </section>
              </motion.div>
            </div>

            {/* Scroll Indicator - Between video/transcript and AI Analysis */}
            {!isLoadingAnalysis && speechAnalysis && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="text-center py-4"
              >
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="inline-block py-3 px-6 bg-purple-100/50 rounded-xl border-2 border-purple-200"
                >
                  <span className="text-purple-700 text-lg font-bold">↓ Scroll down for detailed AI analysis ↓</span>
                </motion.div>
              </motion.div>
            )}

            {/* Bottom: Full-width AI Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <section className="card-base p-8 flex flex-col border-2 border-purple-100 shadow-lg shadow-purple-100/50 bg-gradient-to-br from-purple-50/20 to-pink-50/20">
                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                  <Brain className="w-6 h-6 text-purple-600" />
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">AI Analysis</span>
                </h2>
                
                {isLoadingAnalysis ? (
                  <div className="flex-grow flex items-center justify-center py-20">
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-3" />
                      <p className="text-base text-gray-600">Analyzing your speech...</p>
                    </div>
                  </div>
                ) : speechAnalysis ? (
                  <div className="space-y-8">
                    {/* Overall Coaching - Most Prominent */}
                    <div className="bg-gradient-to-br from-white to-purple-50/30 p-6 rounded-2xl border-2 border-purple-200 shadow-md">
                      <h3 className="text-lg font-bold text-purple-700 mb-3">✨ Key Takeaway</h3>
                      <p className="text-base text-gray-800 leading-relaxed">
                        {speechAnalysis.overallCoaching}
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Strengths */}
                      <div className="bg-white/50 p-5 rounded-xl border-2 border-emerald-100">
                        <h3 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                          <span>💪</span> What You Did Well
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                          {speechAnalysis.strengths?.slice(0, 3).map((s: string, i: number) => (
                            <li key={i} className="leading-relaxed">✓ {s}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Improvement Areas */}
                      <div className="bg-white/50 p-5 rounded-xl border-2 border-amber-100">
                        <h3 className="text-lg font-bold text-amber-700 mb-4 flex items-center gap-2">
                          <span>🎯</span> Growth Opportunities
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                          {speechAnalysis.improvementAreas?.slice(0, 3).map((a: string, i: number) => (
                            <li key={i} className="leading-relaxed">→ {a}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Pacing */}
                      <div className="bg-white/50 p-5 rounded-xl border-2 border-blue-100">
                        <h3 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
                          <span>⏰</span> Pacing
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{speechAnalysis.pacing}</p>
                      </div>

                      {/* Clarity */}
                      <div className="bg-white/50 p-5 rounded-xl border-2 border-cyan-100">
                        <h3 className="text-lg font-bold text-cyan-700 mb-3 flex items-center gap-2">
                          <span>📢</span> Clarity
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{speechAnalysis.clarity}</p>
                      </div>
                    </div>

                    {/* Detailed Transcript Breakdown */}
                    <div className="bg-white/70 p-6 rounded-2xl border-2 border-indigo-200 shadow-md">
                      <h3 className="text-xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
                        <span>🔍</span> Detailed Breakdown
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 italic">
                        Your speech analyzed sentence by sentence. <span className="text-red-500 font-semibold">Red highlights</span> show filler words, 
                        <span className="text-emerald-600 font-semibold"> green annotations</span> show strengths, 
                        <span className="text-amber-600 font-semibold"> orange notes</span> suggest improvements.
                      </p>
                      
                      <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {transcript.split(/[.!?]+/).filter(s => s.trim()).map((sentence, idx) => {
                          const words = sentence.trim().split(/\s+/);
                          const fillerWordsList = ["um", "uh", "like", "basically", "so"];
                          const sentenceFillers = words.filter(w => 
                            fillerWordsList.includes(w.toLowerCase().replace(/[^a-z]/g, ""))
                          ).length;
                          
                          // Determine feedback based on patterns
                          const hasMultipleFillers = sentenceFillers > 1;
                          const isLongSentence = words.length > 20;
                          const isShortAndClear = words.length < 15 && sentenceFillers === 0;
                          
                          return (
                            <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="text-base text-gray-800 leading-relaxed mb-2">
                                {words.map((word, i) => {
                                  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
                                  if (fillerWordsList.includes(cleanWord)) {
                                    return <span key={i} className="text-red-500 font-bold bg-red-50 px-1 rounded mx-0.5">{word}</span>;
                                  }
                                  return <span key={i} className="mx-0.5">{word}</span>;
                                })}.
                              </div>
                              
                              {/* Inline annotations */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {isShortAndClear && (
                                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                    ✓ Clear and concise
                                  </span>
                                )}
                                {hasMultipleFillers && (
                                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                                    ⚠ Multiple fillers - try pausing instead
                                  </span>
                                )}
                                {isLongSentence && (
                                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                                    💡 Long sentence - consider breaking it up
                                  </span>
                                )}
                                {!isShortAndClear && !hasMultipleFillers && !isLongSentence && sentenceFillers === 0 && (
                                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                    ✓ Good delivery
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center py-20">
                    <p className="text-gray-400 text-center text-base">Analysis will appear here when you view the session.</p>
                  </div>
                )}
              </section>
            </motion.div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 font-sans flex flex-col">
      <MissionHeader />

      <div className="p-4 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView("landing")}
              className="p-2 hover:bg-emerald-50 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-emerald-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">StageSense</h1>
              <p className="text-gray-600 text-sm">Your compassionate real-time coach for posture and speech.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-emerald-100">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`btn-icon ${showDebug ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}
              title="Toggle Debug Info"
            >
              <Zap className="w-5 h-5" />
            </button>
            <button
              onClick={handleReadPosture}
              disabled={isSpeakingPosture}
              className={`btn-icon ${isSpeakingPosture ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-400'}`}
              title="Test ElevenLabs TTS (Read Posture)"
            >
              {isSpeakingPosture ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className={`btn-icon ${cameraEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
              title={cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
            >
              {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMicEnabled(!micEnabled)}
              className={`btn-icon ${micEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
              title={micEnabled ? "Turn Microphone Off" : "Turn Microphone On"}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left Column: Webcam and Posture Feedback */}
          <section className="space-y-6">
            <div className="card-base p-4 border-2 border-blue-100 shadow-lg shadow-blue-100/50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Live Feed</span>
              </h2>
            <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center">
              {cameraEnabled ? (
                <WebcamFeed 
                  onResults={analyzePosture} 
                  enabled={cameraEnabled} 
                  onStreamReady={setStream}
                />
              ) : (
                <div className="text-center space-y-2">
                  <CameraOff className="w-12 h-12 text-gray-700 mx-auto" />
                  <p className="text-gray-500">Camera is disabled</p>
                </div>
              )}
              
              {showDebug && cameraEnabled && (
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-white font-mono text-xs space-y-1">
                  <p className="text-amber-400 font-bold uppercase tracking-widest text-[10px]">Debug Metrics</p>
                  <div className="flex justify-between gap-4">
                    <span>Chin Level:</span>
                    <span className={chinLevel > 0.15 ? 'text-emerald-400' : 'text-red-400'}>
                      {chinLevel.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Wrist Dist:</span>
                    <span className={wristDist > 0.08 ? 'text-emerald-400' : 'text-red-400'}>
                      {wristDist.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Crossed:</span>
                    <span className={isCrossed ? 'text-red-400' : 'text-emerald-400'}>
                      {isCrossed ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Clasped:</span>
                    <span className={isClasped ? 'text-red-400' : 'text-emerald-400'}>
                      {isClasped ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 italic">Chin Target: {'>'} 0.15</p>
                  <p className="text-[9px] text-gray-400 italic">Wrist Target: {'>'} 0.08</p>
                </div>
              )}
            </div>
              <div className={`feedback-banner ${feedback.isGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                {cameraEnabled ? feedback.message : "Enable camera for posture feedback"}
              </div>
            </div>
          </section>

          {/* Right Column: Speech Tracking and Analysis */}
          <section className="space-y-6">
            <div className="card-base p-6 h-full flex flex-col border-2 border-emerald-100 shadow-lg shadow-emerald-100/50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-emerald-600" />
                <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">Speech Coach</span>
              </h2>
            
            <div className="flex-grow space-y-6">
              <div className="flex gap-4">
                {!isRecording && !sessionEnded ? (
                  <button
                    onClick={handleStart}
                    disabled={!micEnabled}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 shadow-lg shadow-emerald-200"
                  >
                    <Sparkles className="w-5 h-5" />
                    Begin Your Journey
                  </button>
                ) : isRecording ? (
                  <button
                    onClick={handleStop}
                    className="btn-primary flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
                  >
                    <MicOff className="w-5 h-5" />
                    Complete Session
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button
                      onClick={handleStart}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2 border-2 border-emerald-200 hover:bg-emerald-50"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Try Again
                    </button>
                    <button
                      onClick={handleStartAnalysis}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 shadow-lg shadow-emerald-200"
                    >
                      <BarChart3 className="w-5 h-5" />
                      View Your Growth
                    </button>
                  </div>
                )}
              </div>

              {displayedSttError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in duration-200">
                  {displayedSttError}
                </div>
              )}

              <div className="p-6 bg-gradient-to-br from-emerald-50/30 to-blue-50/30 rounded-2xl min-h-[200px] border-2 border-emerald-100 relative overflow-y-auto max-h-[300px]">
                <p className="label-micro text-emerald-700 font-bold flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Your Voice, Empowered
                </p>
                <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap mt-2">
                  {micEnabled ? (highlightedTranscript || "Share your voice and watch yourself grow...") : "Microphone is disabled"}
                </p>
              </div>

              {/* Recommendations Log in App View */}
              <div className="flex-grow flex flex-col min-h-[150px]">
                <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-emerald-500" />
                  Supportive Coaching
                </h3>
                <div className="flex-grow p-4 bg-white rounded-2xl border-2 border-blue-100 overflow-y-auto custom-scrollbar max-h-[200px]">
                  {coachRecommendations.length > 0 ? (
                    <ul className="space-y-3">
                      {coachRecommendations.map((rec, i) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-700 animate-in fade-in slide-in-from-left-2 duration-300">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">{i + 1}</span>
                          </div>
                          <p>{rec}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 text-xs italic text-center py-4">Your personalized coaching will appear here as you practice.</p>
                  )}
                </div>
              </div>
              </div>
            </div>
          </section>
        </main>

        {/* Coach's Corner: Live Feedback Bar */}
        {isRecording && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
            <div className="bg-white/90 backdrop-blur-xl border-2 border-emerald-200 shadow-2xl shadow-emerald-200/50 rounded-3xl p-6 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isAnalyzing ? 'bg-gradient-to-br from-emerald-100 to-blue-100 animate-pulse' : 'bg-gradient-to-r from-emerald-600 to-blue-600'}`}>
                {isAnalyzing ? (
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                ) : (
                  <Heart className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-grow">
                <p className="label-micro bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent font-bold mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  Your Support System
                </p>
                <p className="text-gray-800 font-medium leading-tight">
                  {liveFeedback || "We're listening and here to help you grow..."}
                </p>
              </div>
              {liveFeedback && (
                <div className="shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
