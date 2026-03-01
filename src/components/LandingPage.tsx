/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Camera, Mic, Heart, Sparkles, TrendingUp } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="flex-1 bg-gradient-to-b from-white via-emerald-50/20 to-blue-50/20 text-gray-900 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-emerald-100 to-blue-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full blur-3xl opacity-40" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl w-full text-center space-y-8 mt-20 pb-12"
      >
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-6 pt-8">
          <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">StageSense</span> <br />
          <span className="text-5xl md:text-7xl flex items-center justify-center gap-3 mt-4">
            FIND YOUR <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent"> VOICE</span>
            <Sparkles className="w-12 h-12 text-emerald-500" />
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          An AI-powered coach dedicated to helping you overcome public speaking fears. 
          Build confidence, inspire others, and create meaningful impact through your voice.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="btn-secondary px-10 py-5 text-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-lg shadow-emerald-200 flex items-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            Begin Your Journey
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-20">
          <div className="p-6 rounded-3xl bg-white border-2 border-blue-100 shadow-lg shadow-blue-100/50 text-left hover:shadow-xl hover:shadow-blue-200/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <Camera className="text-blue-600 w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-2 bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Posture Empowerment</h3>
            <p className="text-gray-600">Stand tall and confident. Real-time guidance helps you embody the leader within.</p>
          </div>

          <div className="p-6 rounded-3xl bg-white border-2 border-emerald-100 shadow-lg shadow-emerald-100/50 text-left hover:shadow-xl hover:shadow-emerald-200/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-blue-100 rounded-2xl flex items-center justify-center mb-4">
              <Mic className="text-emerald-600 w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-2 bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">Voice Coaching</h3>
            <p className="text-gray-600">Transform nervous energy into powerful communication. We help you speak with clarity and purpose.</p>
          </div>

          <div className="p-6 rounded-3xl bg-white border-2 border-blue-100 shadow-lg shadow-blue-100/50 text-left hover:shadow-xl hover:shadow-blue-200/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <Heart className="text-emerald-600 w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl mb-2 bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">Supportive & Safe</h3>
            <p className="text-gray-600">Practice in a judgment-free space. All processing happens privately in your browser.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
