import React, { useEffect, useState } from 'react';
import { firestoreService } from '../services/firestoreService';
import { auth } from '../services/firebase';
import { apiService } from '../services/apiService';
import { Student } from '../types';
import { Award, Crown, User } from 'lucide-react';

const Leaderboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentUser, setCurrentUser] = useState<Student | null>(null);

  useEffect(() => {

    if (auth.currentUser) {
      const unsubUser = firestoreService.subscribeToUser(auth.currentUser.uid, setCurrentUser);
      const unsubUsers = firestoreService.subscribeToUsers((allUsers) => {
        setStudents(allUsers);
      });
      return () => {
        unsubUser();
        unsubUsers();
      };
    }
  }, []);

  // Firebase is the authoritative source for XP, Rank, and Streaks
  const rankedStudents = [...students].sort((a, b) => (b.points || 0) - (a.points || 0));

  return (
    <div className="p-5 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Hall of Fame</h2>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">Top contributors across the learning ecosystem.</p>
      </header>

      {/* Podium - Responsive Stack */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 md:mb-12 pt-4">
        {rankedStudents.slice(0, 3).map((student, i) => (
          <div key={student.id} className={`glass p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden transition-transform hover:scale-105 ${i === 0 ? 'ring-4 ring-yellow-400 ring-offset-4 md:ring-offset-8 md:-translate-y-4' : 'order-last md:order-none'}`}>
            {i === 0 && <Crown className="absolute top-4 right-4 text-yellow-400" size={28} />}
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl shadow-lg ring-4 ring-white dark:ring-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden">
                  {student.avatar || student.photoURL ? (
                    <img src={student.avatar || student.photoURL} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-slate-400" />
                  )}
                </div>
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg text-sm ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-300' : 'bg-amber-600'}`}>
                  {i + 1}
                </div>
              </div>
              <h4 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{student.name}</h4>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mb-4">{student.college}</p>
              <div className="px-5 py-2 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-xl shadow-indigo-100 dark:shadow-none">
                {student.points || 0} XP
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* List Table - Scrollable on mobile */}
      <div className="glass rounded-2xl md:rounded-3xl overflow-hidden border-white/20 dark:border-white/5 relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] md:text-xs tracking-widest">Rank</th>
                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] md:text-xs tracking-widest">Student</th>
                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] md:text-xs tracking-widest text-center">Taught</th>
                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] md:text-xs tracking-widest text-right">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {rankedStudents.map((student, i) => (
                <tr key={student.id} className={`hover:bg-indigo-50/30 dark:hover:bg-white/5 transition-colors ${currentUser && student.id === currentUser.id ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : ''}`}>
                  <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">#{i + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
                        {student.avatar || student.photoURL ? (
                          <img src={student.avatar || student.photoURL} className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} className="text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{student.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{student.college}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1 text-orange-500 font-bold text-xs">
                      <Award size={14} />
                      {student.teachingScore || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-indigo-600 dark:text-cyan-400 text-sm">{student.points || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
