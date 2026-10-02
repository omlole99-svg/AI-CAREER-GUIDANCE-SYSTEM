import React from 'react';
import { Users, BookOpen, Globe, Award, Zap, ArrowRight, MousePointer2 } from 'lucide-react';
import './LandingPage.css';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const scrollToFeatures = () => {
    const featuresElement = document.getElementById('features');
    featuresElement?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-white flex items-center justify-center">
      <div className="max-w-5xl w-full px-8 grid md:grid-cols-2 gap-12 items-center">
        
        <div className="space-y-8">
          <h1 className="text-5xl font-black leading-tight tracking-tight">
            Learn Faster.<br />
            Teach Smarter.<br />
            <span className="text-indigo-500">Grow Together.</span>
          </h1>
          
          <p className="text-slate-400 text-lg max-w-lg">
            SkillSwap connects students to learn, teach and grow through real collaboration.
            Build your skills, earn reputation, and rise together.
          </p>
  
          <div className="flex gap-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 rounded-2xl bg-indigo-600 font-black text-white hover:scale-105 transition"
            >
              Get Started
            </button>
  
            <button className="px-8 py-4 rounded-2xl border border-white/20 hover:bg-white/10 transition">
              Watch Demo
            </button>
          </div>
        </div>
  
        <div className="hidden md:block">
          <div className="relative w-full h-[400px] rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl" />
        </div>
  
      </div>
    </div>
  );
  
};

export default LandingPage;