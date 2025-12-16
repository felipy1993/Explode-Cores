
import React, { useState, useEffect } from 'react';
import { Package, Coins, Zap, Bomb, RefreshCw, Check, Hammer } from 'lucide-react';
import { PlayerInventory } from '../types';

interface ChestReward {
  coins: number;
  booster?: 'moves_5' | 'bomb' | 'shuffle' | 'hammer';
}

interface ChestRewardModalProps {
  onClaim: (reward: ChestReward) => void;
}

const ChestRewardModal: React.FC<ChestRewardModalProps> = ({ onClaim }) => {
  const [rewards, setRewards] = useState<ChestReward[]>([]);
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // Generate rewards on mount
  useEffect(() => {
    const generateReward = (): ChestReward => {
      // Coins: Min 50, Max 500
      const coins = Math.floor(Math.random() * (500 - 50 + 1)) + 50;
      
      // Booster: 40% chance
      let booster: ChestReward['booster'] | undefined;
      const roll = Math.random();
      if (roll < 0.4) {
        const types: ('moves_5' | 'bomb' | 'shuffle' | 'hammer')[] = ['moves_5', 'bomb', 'shuffle', 'hammer'];
        booster = types[Math.floor(Math.random() * types.length)];
      }

      return { coins, booster };
    };

    setRewards([generateReward(), generateReward(), generateReward()]);
  }, []);

  const handleSelect = (index: number) => {
    if (selectedChest !== null) return;
    setSelectedChest(index);
    setIsRevealed(true);

    // Auto claim after animation
    setTimeout(() => {
        onClaim(rewards[index]);
    }, 2500);
  };

  const getBoosterIcon = (type: string) => {
    switch (type) {
      case 'moves_5': return <Zap className="text-yellow-400" size={24} />;
      case 'bomb': return <Bomb className="text-red-400" size={24} />;
      case 'shuffle': return <RefreshCw className="text-blue-400" size={24} />;
      case 'hammer': return <Hammer className="text-slate-300" size={24} />;
      default: return null;
    }
  };

  if (rewards.length === 0) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-[pop_0.3s_ease-out]">
      <div className="bg-slate-900 border-4 border-amber-500 rounded-3xl p-8 w-full max-w-lg text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] relative overflow-hidden">
        
        {/* Background Rays */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(251,191,36,0.1)_20deg,transparent_40deg)] animate-[spin_10s_linear_infinite] pointer-events-none"></div>

        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-300 mb-2 uppercase drop-shadow-sm relative z-10">
          Recompensa Épica!
        </h2>
        <p className="text-slate-300 mb-8 font-medium relative z-10">
          Você completou um marco! Escolha um baú:
        </p>

        <div className="flex justify-center gap-4 relative z-10">
          {rewards.map((reward, index) => {
            const isSelected = selectedChest === index;
            const isOther = selectedChest !== null && !isSelected;

            return (
              <div 
                key={index}
                onClick={() => handleSelect(index)}
                className={`
                  relative flex-1 aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-500
                  ${isSelected 
                    ? 'bg-amber-900/50 border-amber-400 scale-110 shadow-[0_0_30px_rgba(245,158,11,0.5)]' 
                    : isOther 
                      ? 'bg-slate-800/50 border-slate-700 opacity-50 grayscale scale-90' 
                      : 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:scale-105 hover:border-amber-200'
                  }
                `}
              >
                {/* Chest Closed State */}
                <div className={`transition-all duration-300 ${isRevealed ? 'opacity-0 scale-0 absolute' : 'opacity-100 scale-100'}`}>
                    <Package size={48} className={`text-amber-400 drop-shadow-lg ${!isRevealed && 'animate-bounce'}`} style={{ animationDelay: `${index * 0.1}s` }} />
                    <p className="mt-2 text-xs font-bold text-amber-200 uppercase tracking-widest">Abrir</p>
                </div>

                {/* Chest Open / Revealed State */}
                <div className={`flex flex-col items-center gap-2 transition-all duration-500 transform ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                   <div className="text-yellow-400 font-black text-2xl drop-shadow-md flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <Coins size={20} fill="currentColor" />
                        {reward.coins}
                      </div>
                   </div>
                   
                   {reward.booster && (
                     <div className="bg-white/10 p-2 rounded-full border border-white/20 animate-[pop_0.5s_0.2s_backwards]">
                        {getBoosterIcon(reward.booster)}
                     </div>
                   )}
                   
                   {isSelected && (
                       <div className="mt-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                           <Check size={10} /> RESGATADO
                       </div>
                   )}
                </div>
              </div>
            );
          })}
        </div>
        
        {isRevealed && (
            <p className="mt-8 text-sm text-slate-400 animate-pulse">Resgatando prêmios...</p>
        )}
      </div>
    </div>
  );
};

export default ChestRewardModal;
