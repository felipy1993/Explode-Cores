
import React from 'react';
import { MousePointerClick, Snowflake, Box, Lock, FlaskConical, Check } from 'lucide-react';
import { TutorialType } from '../types';

interface TutorialModalProps {
  type: TutorialType;
  onDismiss: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ type, onDismiss }) => {
  
  const getContent = () => {
    switch (type) {
      case 'STONE':
        return {
          title: "Obstáculo: Pedras",
          desc: "Pedras bloqueiam o caminho! Combine peças ao lado delas para quebrá-las.",
          icon: <Box size={64} className="text-slate-400" strokeWidth={1.5} />,
          color: "from-slate-600 to-slate-800"
        };
      case 'ICE':
        return {
          title: "Obstáculo: Gelo",
          desc: "O gelo congela suas peças. Faça uma combinação com a peça congelada para libertá-la!",
          icon: <Snowflake size={64} className="text-cyan-300 animate-pulse" strokeWidth={1.5} />,
          color: "from-cyan-600 to-blue-800"
        };
      case 'CHAINS':
        return {
          title: "Obstáculo: Correntes",
          desc: "Peças acorrentadas não podem ser movidas. Combine-as no lugar para quebrar a corrente.",
          icon: <Lock size={64} className="text-gray-300" strokeWidth={1.5} />,
          color: "from-gray-700 to-black"
        };
      case 'POTION':
        return {
          title: "Missão: Poções",
          desc: "Leve as poções até a parte inferior do tabuleiro para coletá-las!",
          icon: <FlaskConical size={64} className="text-pink-300 animate-bounce" strokeWidth={1.5} />,
          color: "from-pink-600 to-rose-900"
        };
      default:
        return {
          title: "Como Jogar",
          desc: "Combine 3 ou mais peças da mesma cor para marcar pontos e vencer!",
          icon: <MousePointerClick size={64} className="text-white" strokeWidth={1.5} />,
          color: "from-indigo-600 to-purple-800"
        };
    }
  };

  const content = getContent();

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-[pop_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]">
      <div className={`
        relative w-full max-w-sm bg-gradient-to-br ${content.color} 
        rounded-3xl p-1 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-white/20
      `}>
        {/* Inner Card */}
        <div className="bg-black/20 rounded-[20px] p-6 flex flex-col items-center text-center backdrop-blur-md">
            
            {/* Icon Halo */}
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-white/10 p-4 rounded-full border border-white/10 shadow-xl">
                    {content.icon}
                </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md">{content.title}</h2>
            <p className="text-white/80 font-medium leading-relaxed mb-8">{content.desc}</p>

            <button 
                onClick={onDismiss}
                className="w-full py-3 bg-white text-slate-900 rounded-xl font-black text-lg shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <Check size={20} strokeWidth={3} />
                ENTENDI
            </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
