
import React from 'react';
import { RuneType, Tile, TileStatus, PowerUp, ObstacleType } from '../types';
import { Flame, Droplets, Leaf, Sun, Sparkles, MoveHorizontal, MoveVertical, Orbit, Zap, Star, FlaskConical, Snowflake, Lock } from 'lucide-react';

interface RuneProps {
  tile: Tile;
  onClick: () => void;
  isSelected: boolean;
  isHint?: boolean;
}

const Rune: React.FC<RuneProps> = ({ tile, onClick, isSelected, isHint }) => {
  if (tile.isEmpty) {
      return <div className="w-full h-full" />; // Invisible hole
  }

  // Stone rendering (Blocker)
  if (tile.obstacle === ObstacleType.STONE) {
      return (
        <div className="w-full h-full p-0.5">
            <div className={`w-full h-full rounded-xl bg-slate-600 border-b-4 border-slate-800 shadow-lg flex items-center justify-center relative ${tile.status === TileStatus.NEW ? 'animate-pop' : ''}`}>
                 {/* Cracks based on health */}
                 {tile.obstacleHealth === 1 && (
                     <div className="absolute inset-0 opacity-60">
                         <svg viewBox="0 0 100 100" className="w-full h-full stroke-slate-900" strokeWidth="4">
                             <path d="M20,20 L50,50 L80,20 M50,50 L50,80" fill="none" />
                         </svg>
                     </div>
                 )}
                 <div className="w-3/4 h-3/4 rounded-lg bg-slate-500/50"></div>
            </div>
        </div>
      );
  }

  const getStyle = (type: RuneType) => {
    switch (type) {
      case RuneType.FIRE:
        return { 
            bg: 'bg-gradient-to-br from-orange-400 to-red-600', 
            icon: <Flame className="text-white w-3/4 h-3/4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" fill="#fcd34d" strokeWidth={1.5} />, 
            border: 'border-red-900 shadow-red-500/50' 
        };
      case RuneType.WATER:
        return { 
            bg: 'bg-gradient-to-br from-cyan-400 to-blue-600', 
            icon: <Droplets className="text-white w-3/4 h-3/4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" fill="#bae6fd" strokeWidth={1.5} />, 
            border: 'border-blue-900 shadow-blue-500/50' 
        };
      case RuneType.NATURE:
        return { 
            bg: 'bg-gradient-to-br from-lime-400 to-green-700', 
            icon: <Leaf className="text-white w-3/4 h-3/4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" fill="#bef264" strokeWidth={1.5} />, 
            border: 'border-green-900 shadow-green-500/50' 
        };
      case RuneType.LIGHT:
        return { 
            bg: 'bg-gradient-to-br from-yellow-300 to-amber-500', 
            icon: <Sun className="text-white w-3/4 h-3/4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" fill="#fef08a" strokeWidth={1.5} />, 
            border: 'border-amber-700 shadow-yellow-500/50' 
        };
      case RuneType.VOID:
        return { 
            bg: 'bg-gradient-to-br from-purple-400 to-indigo-800', 
            icon: <Sparkles className="text-white w-3/4 h-3/4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" fill="#e9d5ff" strokeWidth={1.5} />, 
            border: 'border-indigo-950 shadow-purple-500/50' 
        };
      case RuneType.POTION:
         return {
            bg: 'bg-gradient-to-br from-pink-400 to-rose-600',
            icon: <FlaskConical className="text-white w-3/4 h-3/4 drop-shadow-md animate-bounce" fill="#fbcfe8" />,
            border: 'border-rose-900 shadow-pink-500/50 ring-2 ring-white/50'
         };
      default:
        // Wild/Generic
        return { 
            bg: 'bg-gradient-to-br from-slate-700 to-slate-900', 
            icon: <Star className="text-white w-3/4 h-3/4" />, 
            border: 'border-slate-900' 
        };
    }
  };

  const style = getStyle(tile.type);
  
  // Animation classes
  let animClass = "";
  if (tile.status === TileStatus.NEW) animClass = "animate-pop";
  if (tile.status === TileStatus.MATCHED) animClass = "scale-0 opacity-0 rotate-180 duration-300";
  if (isSelected) animClass += " z-20 scale-110";
  if (tile.powerUp !== PowerUp.NONE) animClass += " z-10";
  if (isHint && !isSelected && tile.status === TileStatus.NORMAL) animClass += " animate-wiggle brightness-125 z-10";

  // Overlays
  const renderObstacleOverlay = () => {
      if (tile.obstacle === ObstacleType.ICE) {
          return (
              <div className="absolute inset-0 bg-blue-200/40 backdrop-blur-[1px] rounded-2xl border-2 border-white/60 flex items-center justify-center z-20">
                  <Snowflake className="text-white opacity-80" size={24} />
              </div>
          );
      }
      if (tile.obstacle === ObstacleType.CHAINS) {
           return (
              <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center z-20">
                  <div className="absolute inset-x-0 top-1/2 h-2 bg-gray-700 border-y border-gray-500 -translate-y-1/2"></div>
                  <div className="absolute inset-y-0 left-1/2 w-2 bg-gray-700 border-x border-gray-500 -translate-x-1/2"></div>
                  <Lock className="text-gray-300 bg-gray-800 p-1 rounded-full relative z-10" size={20} />
              </div>
          );
      }
      return null;
  };

  const renderPowerUpOverlay = () => {
    switch (tile.powerUp) {
      case PowerUp.HORIZONTAL:
        return (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-full h-1/2 bg-white/20 blur-sm absolute"></div>
            <MoveHorizontal className="text-white w-[90%] h-[90%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse" strokeWidth={3} />
          </div>
        );
      case PowerUp.VERTICAL:
        return (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="h-full w-1/2 bg-white/20 blur-sm absolute"></div>
            <MoveVertical className="text-white w-[90%] h-[90%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse" strokeWidth={3} />
          </div>
        );
      case PowerUp.COLOR_BOMB:
        return (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl z-10">
             <div className="absolute inset-0 bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 opacity-80 animate-[spin_2s_linear_infinite]" />
             <div className="absolute inset-1 bg-black/40 rounded-xl" />
            <Orbit className="relative text-white w-full h-full p-1 drop-shadow-lg" strokeWidth={2.5} />
          </div>
        );
      case PowerUp.NOVA:
        return (
           <div className="absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden border-2 border-white/50 z-10">
             <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
             <Zap className="absolute text-yellow-200 w-full h-full p-1 drop-shadow-[0_0_8px_rgba(255,255,0,0.8)] animate-[bounce_0.5s_infinite]" fill="currentColor" strokeWidth={1} />
           </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`
        relative w-full h-full transition-all duration-300 ease-out cursor-pointer
        ${animClass}
      `}
    >
      {/* Selected Indicator Ring */}
      {isSelected && (
        <div className="absolute inset-0 bg-white rounded-2xl blur-md animate-pulse"></div>
      )}

      <div className={`
        w-full h-full rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.4)]
        flex items-center justify-center relative overflow-hidden
        ${style.bg} border-b-[5px] ${style.border}
        ${!isSelected && 'hover:brightness-110 hover:-translate-y-0.5'}
        active:border-b-0 active:translate-y-1 active:shadow-none
        transition-all duration-100
      `}>
        {/* Highlight Glare */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>

        {/* Base Icon */}
        <div className={`transition-all duration-300 ${tile.powerUp !== PowerUp.NONE ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}>
          {style.icon}
        </div>

        {renderPowerUpOverlay()}
        {renderObstacleOverlay()}
      </div>
    </div>
  );
};

export default Rune;
