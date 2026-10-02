import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User } from 'lucide-react';
import { Student, ChatMessage } from '../types';
import { chatService } from '../services/chatService';
import { rtdb } from '../services/firebase';
import { ref, onValue } from 'firebase/database';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Student | null;
  partner: Student | null;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose, currentUser, partner }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    if (isOpen && currentUser?.uid && partner?.uid) {
      const chatId = chatService.getChatId(currentUser.uid, partner.uid);
      
      const setupChat = async () => {
        try {
          // Initialize conversation idempotently to ensure Firestore rules allow the listener
          await chatService.initializeConversation(chatId, [currentUser.uid, partner.uid]);
          if (isMounted) {
            unsubscribe = chatService.subscribeToMessages(chatId, setMessages);
          }
        } catch (error) {
          console.error("Failed to initialize chat:", error);
        }
      };

      setupChat();
      
      // Listen for partner's online status
      const partnerStatusRef = ref(rtdb, `/status/${partner.uid}`);
      const unsubscribeStatus = onValue(partnerStatusRef, (snapshot) => {
        const data = snapshot.val();
        setIsPartnerOnline(data?.online || false);
      });

      return () => {
        isMounted = false;
        if (unsubscribe) unsubscribe();
        // Firebase RTDB onValue returns an unsubscribe function in modular SDK
        unsubscribeStatus();
      };
    }
  }, [isOpen, currentUser, partner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser?.uid || !partner?.uid) return;
    
    const chatId = chatService.getChatId(currentUser.uid, partner.uid);
    await chatService.sendMessage(chatId, newMessage, currentUser.uid, [currentUser.uid, partner.uid]);
    setNewMessage('');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] xl:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed xl:sticky top-0 right-0 h-[100dvh] xl:h-screen w-full sm:w-96 xl:w-96 shrink-0 bg-white dark:bg-slate-900 shadow-2xl z-[101] flex flex-col transition-all duration-300 ${isOpen ? 'translate-x-0 xl:translate-x-0 xl:border-l xl:border-slate-200 dark:xl:border-slate-800' : 'translate-x-full xl:translate-x-0 xl:w-0 xl:border-none overflow-hidden xl:opacity-0'}`}
      >
        {partner && (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
              <div className="relative">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {partner.avatar || partner.photoURL ? (
                  <img src={partner.avatar || partner.photoURL} alt={partner.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-slate-400" />
                )}
              </div>
                {isPartnerOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">{partner.name}</h3>
                <p className="text-xs text-slate-500">{isPartnerOnline ? 'Online' : 'Offline'}</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100 dark:bg-slate-950">
              {messages.map((msg) => {
                const isMine = msg.senderId === currentUser?.uid;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm shadow-sm'}`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-6 py-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
};

export default ChatDrawer;
