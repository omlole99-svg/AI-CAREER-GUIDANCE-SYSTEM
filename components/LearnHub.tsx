import React, { useState, useEffect, useRef } from 'react';
import { Book, CheckCircle, Sparkles, BrainCircuit, Loader2, Lock, Compass, MapPin, ArrowLeft } from 'lucide-react';
import { auth } from '../services/firebase';
import { firestoreService } from '../services/firestoreService';
import { learningPathService } from '../services/learningPathService';
import { Student, LearningPath } from '../types';
import { aiService } from '../services/aiService';

const LearnHub: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isDayLoading, setIsDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);

  // Quiz State
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      return firestoreService.subscribeToUser(auth.currentUser.uid, setCurrentUser);
    }
  }, []);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const generatingRef = useRef<boolean>(false);

  const selectSkill = (skill: string) => {
    if (!currentUser || !auth.currentUser) return;
    if (activeSkill === skill) return;
    setActiveSkill(skill);
  };

  useEffect(() => {
    if (!activeSkill || !auth.currentUser) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLearningPath(null);
    setGenerationError(null);
    setIsGenerating(false);
    setSelectedDay(null);
    setDayError(null);
    generatingRef.current = false;
    let isMounted = true;

    const loadOrGenerate = async () => {
      try {
        const uid = auth.currentUser!.uid;
        const existingPath = await learningPathService.getLearningPath(uid, activeSkill);
        
        if (!isMounted || controller.signal.aborted) return;

        if (existingPath) {
          setLearningPath(existingPath);
        } else {
          if (generatingRef.current) return;
          generatingRef.current = true;
          setIsGenerating(true);

          try {
            const newPath = await learningPathService.generateAndSaveLearningPath(
              uid,
              activeSkill,
              controller.signal
            );
            if (!isMounted || controller.signal.aborted) return;
            setLearningPath(newPath);
          } catch (e: any) {
            if (e.name === 'AbortError') return;
            if (!isMounted || controller.signal.aborted) return;
            setGenerationError(
              e.message?.includes('rate limit') || e.message?.includes('429')
                ? '⚠️ Rate limit reached. Please wait ~60 seconds before retrying.'
                : e.message || 'Failed to generate roadmap. Please try again.'
            );
          } finally {
            generatingRef.current = false;
            if (isMounted && !controller.signal.aborted) {
              setIsGenerating(false);
            }
          }
        }
      } catch (e) {
        if (!isMounted || controller.signal.aborted) return;
        setGenerationError("Failed to check existing roadmap.");
      }
    };

    loadOrGenerate();

    return () => {
      isMounted = false;
    };
  }, [activeSkill]);

  const generateRoadmap = async () => {
    if (!activeSkill || !currentUser || !auth.currentUser || isGenerating) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setGenerationError(null);
    generatingRef.current = true;

    try {
      const newPath = await learningPathService.generateAndSaveLearningPath(
        auth.currentUser.uid,
        activeSkill,
        controller.signal
      );
      if (controller.signal.aborted) return;
      setLearningPath(newPath);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setGenerationError(
        e.message?.includes('rate limit') || e.message?.includes('429')
          ? '⚠️ Rate limit reached (429). Please wait ~60 seconds and try again.'
          : e.message || 'Failed to generate roadmap. Please try again.'
      );
    } finally {
      generatingRef.current = false;
      if (!controller.signal.aborted) setIsGenerating(false);
    }
  };

  const handleDayClick = async (dayNumber: number, isAvailable: boolean) => {
    if (!isAvailable || !currentUser || !auth.currentUser || !activeSkill) return;
    
    setSelectedDay(dayNumber);
    setDayError(null);
    setIsQuizMode(false);
    setQuizFinished(false);
    
    // Check if we need to load/generate content
    const currentPath = learningPath;
    if (!currentPath) return;
    
    const dayData = currentPath.roadmapDays[dayNumber - 1];
    if (dayData && dayData.content) return; // Already have content
    
    setIsDayLoading(true);
    try {
      const updatedPath = await learningPathService.getOrGenerateDayContent(
        auth.currentUser.uid,
        activeSkill,
        dayNumber
      );
      setLearningPath(updatedPath);
    } catch (e: any) {
      setDayError(e.message || "Failed to load day content.");
    } finally {
      setIsDayLoading(false);
    }
  };

  const handleCompleteDayClick = async (dayNumber: number) => {
    if (!activeSkill || !auth.currentUser || !learningPath) return;
    
    const dayData = learningPath.roadmapDays[dayNumber - 1];
    
    setIsQuizLoading(true);
    setQuizError(null);
    try {
      const questions = await aiService.generateDayQuiz(
        activeSkill,
        dayNumber,
        dayData.title,
        dayData.topics || []
      );
      
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        throw new Error("No questions returned from AI.");
      }
      
      setQuizQuestions(questions);
      setIsQuizMode(true);
      setCurrentQuizIndex(0);
      setSelectedOption(null);
      setQuizScore(0);
      setQuizFinished(false);
    } catch (e: any) {
      setQuizError(e.message || "Failed to generate quiz.");
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === quizQuestions[currentQuizIndex].correctIndex;
    if (isCorrect) setQuizScore(prev => prev + 1);
    
    setSelectedOption(null);
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    }
  };

  const handleSubmitQuiz = () => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === quizQuestions[currentQuizIndex].correctIndex;
    const finalScore = isCorrect ? quizScore + 1 : quizScore;
    
    setQuizScore(finalScore);
    handleQuizSubmitBackend(finalScore);
  };
  
  const handleQuizSubmitBackend = async (finalScore: number) => {
    setQuizFinished(true);
    if (!activeSkill || !auth.currentUser || !selectedDay) return;
    
    try {
      const result = await learningPathService.completeDay(
        auth.currentUser.uid,
        activeSkill,
        selectedDay,
        finalScore
      );
      setLearningPath(result.path);
      setXpAwarded(result.xpAwarded);
      setQuizPassed(result.passed);
    } catch (e: any) {
      console.error("Failed to submit quiz:", e);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizFinished(false);
  };

  if (!currentUser) return null;

  const targetSkills = currentUser.weakSkills || [];

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in duration-700">
      <header className="space-y-4">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white">
          Learn <span className="text-indigo-600 dark:text-cyan-400">Hub</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Master your target skills with structured AI-generated 30-day learning paths.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-1 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <Book className="text-indigo-600" /> Target Skills
          </h3>
          {targetSkills.map(skill => {
            const isActive = activeSkill === skill;
            return (
              <div 
                key={skill}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                  isActive ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                  : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 hover:border-indigo-300'
                }`}
                onClick={() => selectSkill(skill)}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xl text-slate-900 dark:text-white">
                    {skill}
                  </h4>
                  {isActive && <Compass className="text-indigo-600" size={20} />}
                </div>
              </div>
            );
          })}
          {targetSkills.length === 0 && (
            <div className="p-8 text-center text-slate-500 glass rounded-3xl">
              No target skills found. Update your profile!
            </div>
          )}
        </div>

        <div className="col-span-1 lg:col-span-2">
          {activeSkill ? (
            <div className="glass rounded-[3rem] p-8 md:p-12 border-white/20 shadow-2xl relative overflow-hidden h-full flex flex-col">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              
              <div className="mb-8 relative z-10">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                  <span className="text-indigo-600">{activeSkill}</span> Learning Path
                </h3>
                {learningPath && (
                  <p className="text-slate-500 font-medium">Your 30-Day Roadmap &bull; Progress: {learningPath.currentDay - 1} / {learningPath.generatedThroughDay}</p>
                )}
              </div>

              {!learningPath ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6 text-center z-10">
                  <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-xl">
                    <BrainCircuit size={48} className={isGenerating ? "animate-pulse" : ""} />
                  </div>
                  
                  {generationError ? (
                    <div className="space-y-4">
                       <p className="font-bold text-red-500">{generationError}</p>
                       <button 
                        onClick={generateRoadmap}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl shadow-indigo-500/30"
                      >
                        Retry Generation
                      </button>
                    </div>
                  ) : isGenerating ? (
                    <div className="space-y-2">
                      <h4 className="text-2xl font-black text-slate-900 dark:text-white">Building your {activeSkill} path...</h4>
                      <p className="text-slate-500 font-medium animate-pulse">AI is structuring a 30-day curriculum.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="text-2xl font-black text-slate-900 dark:text-white">No Roadmap Found</h4>
                      <p className="text-slate-500 font-medium max-w-sm">Generate a persistent 30-day curriculum to structure your learning journey.</p>
                      <button 
                        onClick={generateRoadmap}
                        className="mt-4 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-2 mx-auto"
                      >
                        <Sparkles size={18} /> Generate 30-Day Roadmap
                      </button>
                    </div>
                  )}
                </div>
              ) : selectedDay ? (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col space-y-6 relative z-10 animate-in slide-in-from-right-8 duration-500">
                  <button 
                    onClick={() => setSelectedDay(null)}
                    className="self-start flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-sm bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-full"
                  >
                    <ArrowLeft size={16} /> Back to Roadmap
                  </button>
                  
                  {isDayLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                       <Loader2 className="animate-spin text-indigo-600" size={48} />
                       <p className="font-bold text-slate-600 dark:text-slate-300">Generating detailed learning content...</p>
                    </div>
                  ) : dayError ? (
                    <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-medium border border-red-200 dark:border-red-900/50 text-center">
                       {dayError}
                       <button onClick={() => handleDayClick(selectedDay, true)} className="mt-4 block mx-auto px-4 py-2 bg-red-100 dark:bg-red-900/40 rounded-lg hover:bg-red-200 transition-colors font-bold text-sm">Retry</button>
                    </div>
                  ) : (
                    (() => {
                       const dayData = learningPath.roadmapDays[selectedDay - 1];
                       if (!dayData || !dayData.content) return null;
                       const { content } = dayData;
                       const isCompleted = dayData.day < learningPath.highestUnlockedDay;
                       
                       if (isQuizMode && !quizFinished) {
                         const currentQuestion = quizQuestions[currentQuizIndex];
                         return (
                           <div className="space-y-8 pb-8 animate-in zoom-in duration-300">
                             <div className="text-center space-y-4">
                               <h3 className="text-3xl font-black dark:text-white">DAY {selectedDay} QUIZ</h3>
                               <p className="text-indigo-600 font-bold uppercase tracking-widest">Question {currentQuizIndex + 1} / {quizQuestions.length}</p>
                             </div>
                             
                             <div className="p-8 bg-white dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
                               <p className="text-xl font-bold dark:text-white leading-relaxed">{currentQuestion?.question}</p>
                             </div>
                             
                             <div className="grid gap-3">
                               {currentQuestion?.options?.map((opt: string, i: number) => (
                                 <button
                                   key={i}
                                   onClick={() => setSelectedOption(i)}
                                   className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-bold ${
                                     selectedOption === i 
                                     ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                     : 'border-slate-100 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/50 dark:text-slate-200'
                                   }`}
                                 >
                                   {opt}
                                 </button>
                               ))}
                             </div>
                             
                             <div className="pt-6 flex justify-end">
                               {currentQuizIndex < quizQuestions.length - 1 ? (
                                 <button
                                   onClick={handleNextQuestion}
                                   disabled={selectedOption === null}
                                   className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                                 >
                                   Next
                                 </button>
                               ) : (
                                 <button
                                   onClick={handleSubmitQuiz}
                                   disabled={selectedOption === null}
                                   className="px-8 py-4 bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:hover:scale-100"
                                 >
                                   Submit Quiz
                                 </button>
                               )}
                             </div>
                           </div>
                         );
                       }
                       
                       if (quizFinished) {
                         const isDay30 = selectedDay === 30;
                         return (
                           <div className="space-y-8 pb-8 text-center animate-in zoom-in duration-300 flex flex-col items-center justify-center min-h-[50vh]">
                             <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-xl ${
                               quizPassed ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-red-500 text-white shadow-red-500/30'
                             }`}>
                               <CheckCircle size={48} />
                             </div>
                             
                             <div className="space-y-2">
                               <h3 className="text-4xl font-black dark:text-white">
                                 {quizPassed ? (isDay30 ? "30-Day Roadmap Completed 🎉" : "Day Completed 🎉") : "Quiz not passed"}
                               </h3>
                               <p className="text-xl font-bold text-slate-500 dark:text-slate-400">
                                 Your Score: {quizScore} / {quizQuestions.length}
                               </p>
                               <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                 {xpAwarded} XP earned
                               </p>
                             </div>
                             
                             <div className="pt-8">
                               {quizPassed ? (
                                 isDay30 ? (
                                   <button onClick={() => setSelectedDay(null)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-xl">
                                     CONTINUE LEARNING
                                   </button>
                                 ) : (
                                   <button onClick={() => setSelectedDay(selectedDay + 1)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-xl">
                                     CONTINUE TO DAY {selectedDay + 1}
                                   </button>
                                 )
                               ) : (
                                 <button onClick={handleRetakeQuiz} className="px-8 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-xl">
                                   RETAKE QUIZ
                                 </button>
                               )}
                             </div>
                           </div>
                         );
                       }
                       
                       return (
                         <div className="space-y-8 pb-8 animate-in slide-in-from-right-4 duration-300">
                           <div className="space-y-4">
                             <div className="flex items-center gap-3">
                               <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                                 {dayData.day}
                               </div>
                               <h4 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                                 {dayData.title}
                               </h4>
                             </div>
                             <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">
                               {dayData.learningObjective}
                             </p>
                           </div>
                           
                           {content.prerequisites && content.prerequisites.length > 0 && content.prerequisites.toLowerCase() !== "none" && content.prerequisites.toLowerCase() !== "none." && (
                             <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 rounded-r-2xl">
                               <h5 className="font-bold text-amber-800 dark:text-amber-500 mb-1 text-sm uppercase tracking-wider">Before you begin</h5>
                               <p className="text-slate-700 dark:text-slate-300">{content.prerequisites}</p>
                             </div>
                           )}
                           
                           <div className="space-y-4">
                             <h5 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                               <Book className="text-indigo-500" size={20} /> Explanation
                             </h5>
                             <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                               {content.explanation}
                             </div>
                           </div>
                           
                           {content.examples && content.examples.length > 0 && (
                             <div className="space-y-4">
                               <h5 className="text-xl font-bold text-slate-900 dark:text-white">Examples</h5>
                               <div className="space-y-3">
                                 {content.examples.map((ex, i) => (
                                   <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 font-mono text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                     {ex}
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                           
                           {content.keyPoints && content.keyPoints.length > 0 && (
                             <div className="space-y-4">
                               <h5 className="text-xl font-bold text-slate-900 dark:text-white">Key Takeaways</h5>
                               <ul className="space-y-2">
                                 {content.keyPoints.map((kp, i) => (
                                   <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-400 items-start">
                                     <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                                     <span>{kp}</span>
                                   </li>
                                 ))}
                               </ul>
                             </div>
                           )}
                           
                           {content.exercise && (
                             <div className="space-y-4 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-500/20">
                               <h5 className="text-xl font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                                 <BrainCircuit size={20} /> Practical Exercise
                               </h5>
                               <p className="text-indigo-800 dark:text-indigo-200/80 whitespace-pre-wrap leading-relaxed">
                                 {content.exercise}
                               </p>
                             </div>
                           )}
                           
                           <div className="pt-8 flex justify-end border-t border-slate-100 dark:border-slate-800">
                              <button 
                                onClick={() => handleCompleteDayClick(selectedDay)}
                                className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl flex items-center gap-2 ${
                                  isCompleted 
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-default' 
                                  : 'bg-green-500 text-white hover:scale-105 shadow-green-500/30'
                                }`}
                                disabled={isCompleted || isQuizLoading}
                              >
                                {isQuizLoading ? 'Loading Quiz...' : isCompleted ? 'Day Completed' : 'Complete Day'}
                                {isCompleted && <CheckCircle size={18} />}
                              </button>
                           </div>
                         </div>
                       );
                    })()
                  )}
                </div>
              ) : (
                <div className="space-y-4 relative z-10 overflow-y-auto flex-1 pr-2 custom-scrollbar max-h-[60vh]">
                  {learningPath.roadmapDays.map((dayData) => {
                    const isAvailable = dayData.day <= learningPath.highestUnlockedDay;
                    const isCompleted = dayData.day < learningPath.highestUnlockedDay;
                    
                    return (
                      <div 
                        key={dayData.day} 
                        onClick={() => handleDayClick(dayData.day, isAvailable)}
                        className={`neo-card p-6 md:p-8 rounded-[2.5rem] flex gap-6 md:gap-8 items-start relative overflow-hidden transition-all ${
                          !isAvailable ? 'opacity-70 grayscale-[30%] cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50'
                        }`}
                      >
                        {isCompleted && (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        )}
                        
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-lg ${
                          isCompleted ? 'bg-green-500 text-white' 
                          : isAvailable ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-80 -mb-1">Day</span>
                          <span className="font-black text-xl leading-none">{dayData.day}</span>
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                            <h5 className={`font-black text-xl tracking-tight ${!isAvailable ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                              {dayData.title}
                            </h5>
                            
                            <div className="flex items-center gap-2">
                              {isCompleted ? (
                                <span className="flex items-center gap-1.5 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  <CheckCircle size={12} /> Completed
                                </span>
                              ) : isAvailable ? (
                                <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  <MapPin size={12} /> Available
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  <Lock size={12} /> Locked
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className={`text-sm font-medium leading-relaxed mb-4 ${!isAvailable ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-300'}`}>
                            {dayData.learningObjective}
                          </p>
                          
                          <div className="flex flex-wrap gap-2">
                            {dayData.topics.map((t, i) => (
                              <span key={i} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${
                                isAvailable 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500'
                              }`}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
             <div className="h-full min-h-[400px] glass rounded-[3rem] flex flex-col items-center justify-center text-center p-12 text-slate-400">
               <Compass size={64} className="mb-6 opacity-50" />
               <h3 className="text-2xl font-bold mb-2">Select a Skill</h3>
               <p className="max-w-xs">Choose a target skill to view or generate its persistent 30-day learning roadmap.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearnHub;
