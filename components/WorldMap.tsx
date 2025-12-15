
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { LevelConfig, PlayerInventory, MAX_LIVES } from '../types';
import { Lock, MapPin, ShoppingBag, Coins, Trophy, Heart, Star, Gift, Settings, TreePine, Cloud, Sparkles, Tent, Mountain, Maximize, Minimize } from 'lucide-react';

interface WorldMapProps {
  levels: LevelConfig[];
  currentLevel: number;
  inventory: PlayerInventory;
  onSelectLevel: (level: LevelConfig) => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onClaimStarChest: () => void;
  onOpenSettings: () => void;
}

// Visual Constants
const LEVEL_HEIGHT = 110; // Vertical distance between levels
const CURVE_AMPLITUDE = 80; // Horizontal sway distance
const CURVE_FREQUENCY = 0.6; // How tight the curves are

const WorldMap: React.FC<WorldMapProps> = ({ levels, currentLevel, inventory, onSelectLevel, onOpenShop, onOpenLeaderboard, onClaimStarChest, onOpenSettings }) => {
  const currentLevelRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-scroll to current level on mount
  useEffect(() => {
    if (currentLevelRef.current) {
       currentLevelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLevel]);

  useEffect(() => {
      const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFsChange);
      // Set initial state
      setIsFullscreen(!!document.fullscreenElement);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => console.error(err));
      } else {
          document.exitFullscreen().catch(err => console.error(err));
      }
  };

  // Helper: Rank Colors
  const getRankColor = (rank: string | null) => {
      switch (rank) {
          case 'S': return 'text-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.8)]';
          case 'A': return 'text-purple-300 drop-shadow-[0_0_3px_rgba(216,180,254,0.8)]';
          case 'B': return 'text-blue-300';
          default: return 'text-slate-500';
      }
  };

  const getRank = (score: number, target: number) => {
      if (score === 0) return null;
      if (score >= target * 1.5) return 'S';
      if (score >= target * 1.2) return 'A';
      if (score >= target) return 'B';
      return 'C';
  };

  // Generate Map Layout Data
  const mapData = useMemo(() => {
      return levels.map((level, index) => {
          // Calculate Sine Wave Position
          // We invert index so level 1 is at the bottom visually if we were building bottom-up, 
          // but for a scrolling list, top-down index 0 is fine.
          // Let's add some randomness to frequency so it's not perfectly robotic
          const xOffset = Math.sin(index * CURVE_FREQUENCY) * CURVE_AMPLITUDE;
          
          return {
              ...level,
              x: xOffset,
              y: index * LEVEL_HEIGHT
          };
      });
  }, [levels]);

  // Generate SVG Path String
  const pathString = useMemo(() => {
      if (mapData.length === 0) return "";
      
      // Start at first node
      let d = `M ${mapData[0].x + 150} ${mapData[0].y + 40}`; // Offset 150 to center in 300px wide SVG

      for (let i = 0; i < mapData.length - 1; i++) {
          const curr = mapData[i];
          const next = mapData[i+1];
          
          const startX = curr.x + 150;
          const startY = curr.y + 40; // Center of button roughly
          const endX = next.x + 150;
          const endY = next.y + 40;

          // Bezier control points for smooth curve
          const cp1x = startX;
          const cp1y = startY + (LEVEL_HEIGHT / 2);
          const cp2x = endX;
          const cp2y = endY - (LEVEL_HEIGHT / 2);

          d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
      }
      return d;
  }, [mapData]);

  // Star Chest Logic
  const starsNeeded = 20;
  const chestProgress = Math.min(inventory.starChestProgress, starsNeeded);
  const isChestReady = chestProgress >= starsNeeded;

  return (
    <div className="flex flex-col w-full h-full bg-[#1a0b2e] relative overflow-hidden">
      
      {/* --- BACKGROUND ATMOSPHERE --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Gradient Layer */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#2e1065] via-[#4c1d95] to-[#1e1b4b] opacity-80"></div>
          
          {/* Floating Particles/Clouds */}
          <div className="absolute top-10 left-10 text-white/5 animate-float"><Cloud size={120} /></div>
          <div className="absolute top-[40%] right-[-50px] text-white/5 animate-float" style={{animationDelay: '2s'}}><Cloud size={180} /></div>
          <div className="absolute bottom-20 left-[-20px] text-white/5 animate-float" style={{animationDelay: '1s'}}><Cloud size={100} /></div>
          
          {/* Light Orbs */}
          <div className="absolute top-[20%] right-[20%] w-64 h-64 bg-purple-500 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-[30%] left-[10%] w-80 h-80 bg-blue-500 rounded-full blur-[120px] opacity-20 animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* --- HUD --- */}
      <div className="absolute top-0 left-0 w-full p-2 pt-4 flex flex-col gap-2 z-50 pointer-events-none">
        {/* Row 1: Status */}
        <div className="flex justify-between items-start px-2">
            <div className="flex items-center gap-2">
                {/* Lives */}
                <div className="bg-slate-900/80 backdrop-blur-md pl-1 pr-3 py-1.5 rounded-l-full rounded-r-2xl border-2 border-slate-700 flex items-center gap-2 shadow-xl pointer-events-auto">
                    <div className="bg-red-500 p-1 rounded-full shadow-inner animate-pulse">
                        <Heart size={16} className="text-white fill-white" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-white font-black text-sm drop-shadow-md">{inventory.lives}</span>
                    </div>
                </div>

                {/* Coins */}
                <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border-2 border-slate-700 flex items-center gap-2 shadow-xl pointer-events-auto">
                    <Coins size={18} className="text-yellow-400 drop-shadow-sm" fill="currentColor" />
                    <span className="text-white font-mono font-bold text-sm drop-shadow-md">{inventory.coins}</span>
                </div>
            </div>

            {/* Settings */}
            <button onClick={onOpenSettings} className="bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border-2 border-slate-700 shadow-xl pointer-events-auto active:scale-95 hover:bg-slate-800 transition-colors">
                <Settings size={20} className="text-slate-200" />
            </button>
        </div>

        {/* Row 2: Chest & Actions */}
        <div className="flex justify-between items-end px-2 pointer-events-auto pb-4">
             {/* Star Chest */}
             <div onClick={isChestReady ? onClaimStarChest : undefined} className={`relative transition-transform duration-300 ${isChestReady ? 'cursor-pointer hover:scale-105' : ''}`}>
                 <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-1.5 border-2 border-indigo-500/50 flex items-center gap-3 pr-4 shadow-2xl">
                     <div className="relative">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isChestReady ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-bounce' : 'bg-slate-800'}`}>
                             <Gift size={20} className={isChestReady ? 'text-white' : 'text-slate-500'} />
                         </div>
                         {isChestReady && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>}
                     </div>
                     <div className="flex flex-col gap-1 w-24">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-indigo-200 uppercase">Baú</span>
                            <span className="text-[10px] text-yellow-400 font-bold">{chestProgress}/{starsNeeded}</span>
                         </div>
                         <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                             <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-600 transition-all duration-500" style={{ width: `${(chestProgress / starsNeeded) * 100}%` }}></div>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Right Buttons */}
             <div className="flex gap-2">
                <button onClick={toggleFullscreen} className="bg-slate-800 p-2.5 rounded-xl border-b-4 border-slate-950 shadow-lg active:border-b-0 active:translate-y-1 transition-all">
                    {isFullscreen ? <Minimize size={20} className="text-cyan-400" /> : <Maximize size={20} className="text-cyan-400" />}
                </button>
                <button onClick={onOpenLeaderboard} className="bg-slate-800 p-2.5 rounded-xl border-b-4 border-slate-950 shadow-lg active:border-b-0 active:translate-y-1 transition-all">
                    <Trophy size={20} className="text-indigo-400" />
                </button>
                <button onClick={onOpenShop} className="bg-amber-500 p-2.5 rounded-xl border-b-4 border-amber-700 shadow-lg active:border-b-0 active:translate-y-1 transition-all animate-[wiggle_4s_infinite]">
                    <ShoppingBag size={20} className="text-white" />
                </button>
             </div>
        </div>
      </div>

      {/* --- SCROLLABLE MAP AREA --- */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto hide-scrollbar relative z-10 pt-48 pb-32"
      >
        <div className="relative w-full max-w-md mx-auto" style={{ height: `${mapData.length * LEVEL_HEIGHT}px` }}>
            
            {/* SVG Path Layer (Behind buttons) */}
            <svg className="absolute top-0 left-1/2 -translate-x-1/2 overflow-visible pointer-events-none" width="300" height={mapData.length * LEVEL_HEIGHT}>
                {/* Outer Glow */}
                <path d={pathString} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round" />
                {/* Main Dotted Line */}
                <path d={pathString} fill="none" stroke="#fbbf24" strokeWidth="6" strokeDasharray="12 12" strokeLinecap="round" className="opacity-60" />
            </svg>

            {/* Level Nodes & Decorations */}
            {mapData.map((level, index) => {
                const isLocked = index + 1 > currentLevel;
                const isCurrent = index + 1 === currentLevel;
                const highScore = inventory.highScores[level.id] || 0;
                const rank = getRank(highScore, level.targetScore);
                
                // Random decorations based on index hash
                const showDecorLeft = index % 3 === 0;
                const showDecorRight = index % 4 === 0;
                const decorType = index % 5;

                return (
                    <div 
                        key={level.id}
                        className="absolute left-1/2 flex items-center justify-center w-0 h-0"
                        style={{ transform: `translate(${level.x}px, ${level.y}px)` }}
                    >
                        {/* --- DECORATIONS (Atmospheric Props) --- */}
                        {showDecorLeft && (
                             <div className="absolute right-20 opacity-40 hover:opacity-100 transition-opacity pointer-events-none">
                                {decorType === 0 && <TreePine size={40} className="text-emerald-700" />}
                                {decorType === 1 && <Mountain size={32} className="text-slate-600" />}
                                {decorType === 2 && <Sparkles size={24} className="text-yellow-200 animate-pulse" />}
                             </div>
                        )}
                         {showDecorRight && (
                             <div className="absolute left-20 opacity-40 hover:opacity-100 transition-opacity pointer-events-none">
                                {decorType === 3 && <Tent size={32} className="text-indigo-800" />}
                                {decorType === 4 && <Cloud size={40} className="text-slate-500" />}
                             </div>
                        )}

                        {/* --- LEVEL BUTTON --- */}
                        <div className="relative group">
                            {/* Pulse effect for current level */}
                            {isCurrent && (
                                <div className="absolute inset-0 bg-white rounded-3xl animate-ping opacity-30"></div>
                            )}

                            {/* Main Button */}
                            <button
                                ref={isCurrent ? currentLevelRef : null}
                                onClick={() => !isLocked && onSelectLevel(level)}
                                disabled={isLocked}
                                className={`
                                    relative w-20 h-20 rounded-[28px] flex items-center justify-center
                                    transition-all duration-200 z-20
                                    ${isLocked 
                                        ? 'bg-slate-700 border-b-[6px] border-slate-900 text-slate-500' 
                                        : isCurrent 
                                            ? 'bg-gradient-to-b from-amber-300 to-amber-500 border-b-[8px] border-amber-700 shadow-[0_0_30px_rgba(251,191,36,0.4)] scale-110' 
                                            : highScore > 0
                                                ? 'bg-indigo-500 border-b-[6px] border-indigo-800 hover:-translate-y-1 hover:border-b-[8px]'
                                                : 'bg-blue-500 border-b-[6px] border-blue-800 hover:-translate-y-1 hover:border-b-[8px]'
                                    }
                                    active:border-b-0 active:translate-y-2 active:shadow-none
                                `}
                            >
                                {isLocked ? (
                                    <Lock size={24} className="opacity-50" />
                                ) : (
                                    <>
                                        <span className={`text-2xl font-black drop-shadow-md ${isCurrent ? 'text-amber-900' : 'text-white'}`}>
                                            {level.id}
                                        </span>
                                        {/* Stars earned badge */}
                                        {highScore > 0 && (
                                            <div className="absolute -bottom-3 flex gap-0.5 bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 shadow-sm">
                                                {[1, 2, 3].map(s => {
                                                     const target = level.targetScore;
                                                     let earned = 1;
                                                     if (highScore >= target * 1.5) earned = 3;
                                                     else if (highScore >= target * 1.2) earned = 2;
                                                     
                                                     return (
                                                         <Star 
                                                            key={s} 
                                                            size={8} 
                                                            className={s <= earned ? "text-yellow-400 fill-yellow-400" : "text-slate-600"} 
                                                         />
                                                     )
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </button>

                            {/* Player Avatar Marker */}
                            {isCurrent && (
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-16 h-16 z-30 pointer-events-none animate-bounce">
                                    <div className="relative w-full h-full">
                                        <div className="w-14 h-14 bg-white rounded-2xl border-4 border-amber-400 overflow-hidden shadow-xl mx-auto rotate-3 bg-slate-200">
                                            <img src={inventory.avatar} alt="Hero" className="w-full h-full object-cover" />
                                        </div>
                                        <MapPin size={24} className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-amber-500 drop-shadow-md fill-amber-500" />
                                    </div>
                                </div>
                            )}

                            {/* Rank Display (Floats right) */}
                            {!isLocked && highScore > 0 && (
                                <div className="absolute left-20 top-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur rounded-xl px-3 py-1.5 border border-slate-700 flex flex-col items-start min-w-[70px] animate-[pop_0.5s_ease-out]">
                                    <span className={`text-xl font-black leading-none ${getRankColor(rank)}`}>
                                        {rank}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {highScore.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            
            {/* End of Map Placeholder */}
            <div className="absolute w-full text-center text-white/20 font-bold uppercase tracking-widest pb-10" style={{ top: `${mapData.length * LEVEL_HEIGHT + 50}px` }}>
                Mais níveis em breve...
            </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
