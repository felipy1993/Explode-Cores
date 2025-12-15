
import React from 'react';
import { Calendar, Check, Coins, Zap, Bomb, RefreshCw, Gift } from 'lucide-react';

interface DailyBonusModalProps {
  streak: number;
  onClaim: () => void;
}

const REWARDS = [
  { day: 1, label: '100 Moedas', icon: <Coins className="text-yellow-400" /> },
  { day: 2, label: 'Booster Movimentos', icon: <Zap className="text-blue-400" /> },
  { day: 3, label: '200 Moedas', icon: <Coins className="text-yellow-400" /> },
  { day: 4, label: 'Booster Embaralhar', icon: <RefreshCw className="text-green-400" /> },
  { day: 5, label: '300 Moedas', icon: <Coins className="text-yellow-400" /> },
  { day: 6, label: 'Booster Bomba', icon: <Bomb className="text-red-400" /> },
  { day: 7, label: 'BAÚ MÁGICO', icon: <Gift className="text-purple-400 animate-bounce" size={32} /> },
];

const DailyBonusModal: React.FC<DailyBonusModalProps> = ({ streak, onClaim }) => {
  // Normalize streak to 1-7 range (looping)
  const currentDay = (streak % 7) + 1; 

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-[pop_0.4s_ease-out]">
      <div className="bg-gradient-to-b from-indigo-900 to-slate-900 border-2 border-indigo-500 rounded-3xl p-6 w-full max-w-2xl text-center shadow-[0_0_50px_rgba(99,102,241,0.4)]">
        
        <h2 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
           <Calendar className="text-indigo-400" /> Recompensa Diária
        </h2>
        <p className="text-indigo-200 mb-8">Volte todos os dias para ganhar prêmios melhores!</p>

        <div className="grid grid-cols-4 md:grid-cols-7 gap-3 mb-8">
          {REWARDS.map((reward, idx) => {
            const dayNum = idx + 1;
            const isPast = dayNum < currentDay;
            const isToday = dayNum === currentDay;
            
            return (
              <div 
                key={dayNum}
                className={`
                  relative flex flex-col items-center justify-center p-2 rounded-xl border-2 aspect-[3/4]
                  ${isToday 
                    ? 'bg-indigo-600 border-indigo-300 scale-110 shadow-lg z-10' 
                    : isPast 
                      ? 'bg-slate-800/50 border-slate-700 opacity-60' 
                      : 'bg-slate-800 border-slate-600'
                  }
                `}
              >
                <span className="text-xs font-bold text-slate-400 mb-2">Dia {dayNum}</span>
                <div className="flex-1 flex items-center justify-center">
                    {reward.icon}
                </div>
                {isPast && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Check className="text-green-400 font-bold" size={32} strokeWidth={3} />
                    </div>
                )}
                {isToday && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                )}
              </div>
            );
          })}
        </div>

        <button 
          onClick={onClaim}
          className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full font-black text-xl text-white shadow-xl hover:scale-105 active:scale-95 transition-all animate-pulse"
        >
          RESGATAR
        </button>

      </div>
    </div>
  );
};

export default DailyBonusModal;
