/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useRef } from "react";
import { WebcamFeed } from "./components/WebcamFeed";
import { LandingPage } from "./components/LandingPage";
import { usePostureTracking } from "./hooks/usePostureTracking";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useVideoRecorder } from "./hooks/useVideoRecorder";
import { useLiveCoachInterval } from "./hooks/useLiveCoachInterval";
import { getLiveFeedback } from "./services/geminiService";
import { speakTextOnce } from "./services/elevenLabsService";
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
  Volume2
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

  // Activate 5-second live coach critique
  useLiveCoachInterval({
    isRecording: isSpeechRecording,
    transcript,
    fillerWords,
    postureFeedback: feedback.message,
    isCrossed,
    isClasped,
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

  const handleStartAnalysis = useCallback(() => {
    if (!transcript) return;
    setView("analysis");
  }, [transcript]);

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
    if (segments.length === 0) return highlightedTranscript;

    return segments.map((segment, i) => {
      const isActive = i === activeSegmentIndex;
      const words = segment.text.split(/(\s+)/);
      const fillerWordsList = ["um", "uh", "like", "basically", "so"];
      
      return (
        <span 
          key={i} 
          className={`transition-all duration-200 ${isActive ? 'bg-indigo-100 text-indigo-900 font-bold px-1 rounded ring-2 ring-indigo-200' : 'opacity-60'}`}
        >
          {words.map((word, j) => {
            const cleanWord = word.toLowerCase().trim();
            if (fillerWordsList.includes(cleanWord)) {
              return <span key={j} className="text-red-500 underline decoration-red-300">{word}</span>;
            }
            return <span key={j}>{word}</span>;
          })}
          {" "}
        </span>
      );
    });
  }, [segments, activeSegmentIndex, highlightedTranscript]);

  if (view === "landing") {
    return <LandingPage onStart={() => setView("app")} />;
  }

  if (view === "analysis") {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
        <header className="mb-8 flex items-center gap-4 max-w-7xl mx-auto">
          <button 
            onClick={() => setView("app")}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Session Analysis</h1>
            <p className="text-gray-600 text-sm">Review your performance with synchronized playback.</p>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Side: Video Playback */}
          <section className="card-base p-6 flex flex-col h-[calc(100vh-200px)]">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-indigo-600" />
              Session Recording
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

          {/* Right Side: Synchronized Transcript */}
          <section className="card-base p-6 flex flex-col h-[calc(100vh-200px)]">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-emerald-600" />
              Synchronized Transcript
            </h2>
            <div className="flex-grow p-6 bg-gray-50 rounded-2xl border border-gray-100 overflow-y-auto custom-scrollbar mb-6">
              <div className="text-lg text-gray-800 leading-relaxed">
                {synchronizedTranscript}
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              Coach's Recommendations Log
            </h2>
            <div className="h-48 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 overflow-y-auto custom-scrollbar">
              {coachRecommendations.length > 0 ? (
                <ul className="space-y-3">
                  {coachRecommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-indigo-600">{i + 1}</span>
                      </div>
                      <p>{rec}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm italic text-center py-8">No recommendations logged during this session.</p>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView("landing")}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">StandTall AI</h1>
            <p className="text-gray-600 text-sm">Your real-time posture and speech coach.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
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
            className={`btn-icon ${cameraEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}
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
          <div className="card-base p-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />
              Live Feed
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
            <div className={`feedback-banner ${feedback.isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {cameraEnabled ? feedback.message : "Enable camera for posture feedback"}
            </div>
          </div>
        </section>

        {/* Right Column: Speech Tracking and Analysis */}
        <section className="space-y-6">
          <div className="card-base p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-emerald-600" />
              Speech Coach
            </h2>
            
            <div className="flex-grow space-y-6">
              <div className="flex gap-4">
                {!isRecording && !sessionEnded ? (
                  <button
                    onClick={handleStart}
                    disabled={!micEnabled}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Session
                  </button>
                ) : isRecording ? (
                  <button
                    onClick={handleStop}
                    className="btn-primary flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <MicOff className="w-5 h-5" />
                    Stop Session
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button
                      onClick={handleStart}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Restart
                    </button>
                    <button
                      onClick={handleStartAnalysis}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <BarChart3 className="w-5 h-5" />
                      Start Analysis
                    </button>
                  </div>
                )}
              </div>

              {displayedSttError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in duration-200">
                  {displayedSttError}
                </div>
              )}

              <div className="p-6 bg-gray-50 rounded-2xl min-h-[200px] border border-gray-100 relative overflow-y-auto max-h-[300px]">
                <p className="label-micro">Session Transcript</p>
                <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {micEnabled ? (highlightedTranscript || "Your speech will appear here...") : "Microphone is disabled"}
                </p>
                {isRecording && (
                  <div className="mt-4 flex items-center gap-2 text-gray-400 text-xs italic">
                    <Zap className="w-3 h-3 animate-pulse text-amber-400" />
                    Say "end session" to finish automatically
                  </div>
                )}
              </div>

              {/* Recommendations Log in App View */}
              <div className="flex-grow flex flex-col min-h-[150px]">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-500" />
                  Live Advice Log
                </h3>
                <div className="flex-grow p-4 bg-white rounded-2xl border border-gray-100 overflow-y-auto custom-scrollbar max-h-[200px]">
                  {coachRecommendations.length > 0 ? (
                    <ul className="space-y-3">
                      {coachRecommendations.map((rec, i) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-700 animate-in fade-in slide-in-from-left-2 duration-300">
                          <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-indigo-600">{i + 1}</span>
                          </div>
                          <p>{rec}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 text-xs italic text-center py-4">Advice will appear here as you speak.</p>
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
          <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-3xl p-6 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isAnalyzing ? 'bg-indigo-100 animate-pulse' : 'bg-indigo-600'}`}>
              {isAnalyzing ? (
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              ) : (
                <Brain className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-grow">
              <p className="label-micro text-indigo-600 font-bold mb-1">Coach's Corner</p>
              <p className="text-gray-800 font-medium leading-tight">
                {liveFeedback || "Speak a full sentence to receive live coaching advice..."}
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
  );
}
