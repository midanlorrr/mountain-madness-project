/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Camera, Mic, Shield, Zap } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl w-full text-center space-y-8"
      >
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-4">
          <Zap className="w-4 h-4 mr-2" />
          Powered by Gemini AI & MediaPipe
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-6">
          STAND <span className="text-indigo-600">TALL</span>. <br />
          SPEAK <span className="text-emerald-600">CLEAR</span>.
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          The world's first AI-powered posture and speech coach. 
          Perfect your presence with real-time feedback.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="btn-secondary px-10 py-5 text-xl"
          >
            Enter Workspace
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-20">
          <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 text-left">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
              <Camera className="text-indigo-600 w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-2">Posture Tracking</h3>
            <p className="text-gray-500">Real-time skeletal analysis to keep your shoulders back and chin up.</p>
          </div>

          <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 text-left">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <Mic className="text-emerald-600 w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-2">Speech Analysis</h3>
            <p className="text-gray-500">Detect filler words and analyze your confidence with Gemini AI.</p>
          </div>

          <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 text-left">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="text-amber-600 w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-2">Privacy First</h3>
            <p className="text-gray-500">All processing happens locally in your browser. No video is ever stored.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
