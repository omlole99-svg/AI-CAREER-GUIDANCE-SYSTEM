
import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { NAV_ITEMS } from '../constants';
import { LogOut, Zap, Moon, Sun, X } from 'lucide-react';

interface SidebarProps {
  isDark: boolean;
  toggleDark: () => void;
  onLogout: () => void;
  onClose?: () => void;
}

const routeMap: Record<string, string> = {
  dashboard: '/dashboard',
  matching: '/matches',
  learnhub: '/learn',
  sessions: '/sessions',
  leaderboard: '/leaderboard',
  marketplace: '/marketplace',
  assistant: '/assistant',
};

const Sidebar: React.FC<SidebarProps> = ({ isDark, toggleDark, onLogout, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="w-64 glass m-4 rounded-[2.5rem] h-[calc(100vh-2rem)] flex flex-col p-5 border-white/20 dark:border-white/5 relative">
      <div className="flex items-center justify-between mb-10 mt-2 px-1">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
          aria-label="SkillSwap Home"
          onClick={() => {
            if (onClose) onClose();
          }}
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-xl shadow-lg flex items-center justify-center shrink-0">
            <Zap size={20} className="text-white fill-current" />
          </div>
          <h1 className="text-xl font-black tracking-tighter flex items-center select-none">
            <span className="text-slate-900 dark:text-white">Skill</span>
            <span className="text-indigo-600 dark:text-cyan-400 ml-0.5">Swap</span>
          </h1>
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-indigo-600 transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const path = routeMap[item.id] || `/${item.id}`;
          const isActive = location.pathname.startsWith(path);
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(path);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 relative group/btn ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-white/10 hover:text-indigo-700 dark:hover:text-cyan-400'
              } hover:scale-[1.03] active:scale-95`}
            >
              <div className="shrink-0"><Icon size={18} /></div>
              <span className="font-bold text-sm tracking-wide whitespace-nowrap">{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
            </button>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-slate-200 dark:border-white/5 space-y-2">
        <button onClick={toggleDark} className="w-full flex items-center gap-4 p-4 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-all hover:scale-105">
          <div className="shrink-0">{isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}</div>
          <span className="font-bold text-xs uppercase tracking-widest">{isDark ? 'Daylight' : 'Night Mode'}</span>
        </button>
        <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500/70 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all hover:scale-105">
          <div className="shrink-0"><LogOut size={18} /></div>
          <span className="font-bold text-xs uppercase tracking-widest">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
