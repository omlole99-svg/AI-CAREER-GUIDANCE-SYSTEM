import React, { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { apiService } from '../services/apiService';
import { firestoreService } from '../services/firestoreService';
import { Student } from '../types';

interface RequestsProps {
  onStartSession?: (partner: Student, skill: string, sessionId?: string) => void;
}

const Requests: React.FC<RequestsProps> = ({ onStartSession }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequestIds, setProcessingRequestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsMounted(true);
    let unsubUsers: (() => void) | undefined;
    
    const fetchRealData = async () => {
      try {
        const reqs = await apiService.getSwapRequests();
        const sess = await apiService.getSessions();
        setIncomingRequests(reqs.filter((r: any) => r.status === 'PENDING' && r.receiverUid === auth.currentUser?.uid));
        setSessions(sess);
      } catch (e) {
        console.error("Failed to fetch requests data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchRealData();
      unsubUsers = firestoreService.subscribeToUsers((allUsers) => {
        setStudents(allUsers.filter(s => s.uid !== auth.currentUser?.uid));
      });
    }

    return () => {
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const handleAccept = async (reqId: string) => {
    if (processingRequestIds.has(reqId)) return;
    setProcessingRequestIds(prev => new Set(prev).add(reqId));
    try {
      await apiService.respondToSwapRequest(reqId, 'accept');
      // Update local state smoothly
      setIncomingRequests(prev => prev.filter(r => r.id !== reqId));
      
      // Refetch sessions immediately to show the newly created one
      const sess = await apiService.getSessions();
      setSessions(sess);
      
    } catch (e: any) {
      if (e.message?.includes('already processed')) {
        // Optimistically remove it if it was already processed
        setIncomingRequests(prev => prev.filter(r => r.id !== reqId));
        const sess = await apiService.getSessions();
        setSessions(sess);
      } else {
        alert("Failed to accept request.");
      }
    } finally {
      setProcessingRequestIds(prev => {
        const next = new Set(prev);
        next.delete(reqId);
        return next;
      });
    }
  };

  const handleReject = async (reqId: string) => {
    if (processingRequestIds.has(reqId)) return;
    setProcessingRequestIds(prev => new Set(prev).add(reqId));
    try {
      await apiService.respondToSwapRequest(reqId, 'reject');
      setIncomingRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (e) {
      alert("Failed to reject request.");
    } finally {
      setProcessingRequestIds(prev => {
        const next = new Set(prev);
        next.delete(reqId);
        return next;
      });
    }
  };

  if (!isMounted) return null;

  return (
    <div className="p-6 md:p-10 lg:p-16 space-y-12 animate-in fade-in duration-1000">
      <header className="flex flex-col gap-4">
        <h1 className="text-6xl md:text-8xl font-black font-heading tracking-tighter text-slate-900 dark:text-white leading-[0.85]">
          <span className="text-indigo-600 dark:text-cyan-400">Requests</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-md">
          Manage your incoming skill swap requests and track your active learning sessions.
        </p>
      </header>

      {isLoading ? (
        <div className="text-slate-500 animate-pulse font-bold">Loading records...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="neo-card p-8 rounded-[3rem] h-fit">
             <h3 className="text-xl font-black mb-6 dark:text-white">Incoming Requests</h3>
             {incomingRequests.length === 0 ? (
               <p className="text-slate-500 font-medium">No pending requests.</p>
             ) : (
               <div className="space-y-4">
                 {incomingRequests.map(req => {
                   const sender = students.find(s => s.uid === req.senderUid);
                   return (
                     <div key={req.id} className="p-4 glass border-indigo-100 rounded-2xl flex justify-between items-center">
                       <div>
                         <p className="font-bold dark:text-white">{sender?.name || req.senderUid} wants to learn <span className="text-indigo-600">{req.skillWanted}</span></p>
                       </div>
                       <div className="flex gap-2">
                         <button 
                           onClick={() => handleAccept(req.id)} 
                           disabled={processingRequestIds.has(req.id)}
                           className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                           {processingRequestIds.has(req.id) ? 'Processing...' : 'Accept'}
                         </button>
                         <button 
                           onClick={() => handleReject(req.id)} 
                           disabled={processingRequestIds.has(req.id)}
                           className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                           Reject
                         </button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </div>

           <div className="neo-card p-8 rounded-[3rem] h-fit">
             <h3 className="text-xl font-black mb-6 dark:text-white">Active Sessions</h3>
             {sessions.filter(s => s.status === 'SCHEDULED').length === 0 ? (
               <p className="text-slate-500 font-medium">No active sessions.</p>
             ) : (
               <div className="space-y-4">
                 {sessions.filter(s => s.status === 'SCHEDULED').map(sess => {
                   const partnerUid = sess.tutorUid === auth.currentUser?.uid ? sess.learnerUid : sess.tutorUid;
                   const partner = students.find(s => s.uid === partnerUid);
                   return (
                     <div key={sess.id} className="p-4 glass border-indigo-100 rounded-2xl flex justify-between items-center">
                       <div>
                         <p className="font-bold dark:text-white">Session with {partner?.name || partnerUid}</p>
                       </div>
                       <button onClick={() => {
                         if (partner) {
                           onStartSession?.(partner, sess.request?.skillOffered || 'Skill', sess.id);
                         }
                       }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">Start</button>
                     </div>
                   );
                 })}
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
