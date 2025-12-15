
import React, { useEffect, useState } from 'react';
import { LevelResult } from '../types';
import { Star, RefreshCw, ArrowRight, Home, Coins } from 'lucide-react';

interface LevelCompleteModalProps {
  result: LevelResult;
  onAction: (action: 'NEXT' | 'RETRY' | 'EXIT') => void;
}

const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({ result, onAction }) => {
  const [displayedStars, setDisplayedStars] = useState(0);

  useEffect(() => {
    if (result.won) {
      // Animate stars one by one
      let current = 0;
      const interval = setInterval(() => {
        if (current < result.stars) {
          current++;
          setDisplayedStars(current);
        } else {
          clearInterval(interval);
        }
      }, 400); // Delay between stars
      return () => clearInterval(interval);
    }
  }, [result.won, result.stars]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fade-in_0.3s]">
      {/* Confetti Effect for Win */}
      {result.won && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           {[...Array(20)].map((_, i) => (
               <div key={i} className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-float-up" 
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: '110%',
                        animationDelay: `${Math.random() * 2}s`,
                        backgroundColor: ['#fbbf24', '#f472b6', '#60a5fa', '#a78bfa'][Math.floor(Math.random() * 4)]
                    }} 
               />
           ))}
        </div>
      )}

      <div className={`
        relative w-full max-w-sm rounded-3xl p-1 shadow-2xl transform transition-all
        ${result.won ? 'bg-gradient-to-b from-amber-400 via-orange-500 to-amber-700' : 'bg-gradient-to-b from-slate-500 via-slate-700 to-slate-800'}
        animate-[pop_0.5s_cubic-bezier(0.34,1.56,0.64,1)]
      `}>
         {/* Inner Card */}
         <div className="bg-slate-900 rounded-[22px] p-6 text-center flex flex-col items-center border-4 border-slate-800/50 relative overflow-hidden">
            
            {/* Header Deco Bar (Gold Glow) */}
            {result.won && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-2 bg-yellow-400 blur-md rounded-full opacity-50"></div>
            )}
            
            {/* Title / Header */}
             <div className="mb-4">
                 {/* Gold Bar Graphic */}
                 {result.won && <div className="w-24 h-1.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mb-2"></div>}
                 
                 <h2 className={`text-3xl font-black uppercase tracking-wider drop-shadow-md ${result.won ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-500' : 'text-slate-400'}`}>
                    {result.won ? 'Vitória!' : 'Falhou'}
                </h2>
             </div>

            {/* Stars */}
            {result.won ? (
                <div className="flex gap-1 mb-8 justify-center">
                    {[1, 2, 3].map((starIdx) => (
                        <div key={starIdx} className="relative w-14 h-14">
                            {/* Empty Star Background */}
                            <Star className="absolute inset-0 text-slate-800" fill="currentColor" size={56} strokeWidth={0} />
                            
                            {/* Filled Star Animated */}
                            <div className={`transition-all duration-500 transform ${starIdx <= displayedStars ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-180'}`}>
                                <Star 
                                    className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" 
                                    fill="currentColor" 
                                    size={56} 
                                    strokeWidth={0}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mb-8 opacity-50">
                     <RefreshCw size={64} className="text-slate-500 animate-spin-slow" />
                </div>
            )}

            {/* Stats Box */}
            <div className="w-full flex flex-col gap-3 mb-8">
                {/* Score */}
                <div className="bg-slate-800/80 rounded-xl p-3 flex justify-between items-center border border-white/5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pontuação</span>
                    <span className="text-xl font-mono font-bold text-white">{result.score.toLocaleString()}</span>
                </div>
                
                {/* Coins */}
                <div className="bg-amber-900/20 rounded-xl p-3 flex justify-between items-center border border-amber-500/20">
                    <div className="flex items-center gap-2">
                        <Coins size={16} className="text-amber-400" fill="currentColor" />
                        <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">Ganhou</span>
                    </div>
                    <span className="text-xl font-mono font-bold text-amber-400">+{result.coinsEarned}</span>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex w-full gap-3">
                <button 
                    onClick={() => onAction('EXIT')}
                    className="p-4 rounded-2xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700 active:scale-95 transition-all"
                >
                    <Home size={24} />
                </button>
                
                {result.won ? (
                    <button 
                        onClick={() => onAction('NEXT')}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                        Próxima <ArrowRight size={20} strokeWidth={3} />
                    </button>
                ) : (
                    <button 
                        onClick={() => onAction('RETRY')}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-[0_4px_0_rgb(30,58,138)] active:shadow-none active:translate-y-1 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                        Tentar De Novo <RefreshCw size={20} strokeWidth={3} />
                    </button>
                )}
            </div>

         </div>
      </div>
    </div>
  );
};

export default LevelCompleteModal;
