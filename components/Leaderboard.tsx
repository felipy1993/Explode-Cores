
import React, { useMemo, useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LeaderboardEntry } from '../types';
import { ArrowLeft, Trophy, Crown, Medal } from 'lucide-react';

interface LeaderboardProps {
  playerScore: number;
  onClose: () => void;
  playerAvatar: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ playerScore, onClose, playerAvatar }) => {
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Leaderboard from Firestore
  useEffect(() => {
    const fetchLeaderboard = async () => {
        try {
            const q = query(collection(db, "users"), orderBy("totalScore", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            
            const fetched: LeaderboardEntry[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                fetched.push({
                    id: doc.id,
                    name: data.displayName || "Jogador Anônimo",
                    avatar: data.inventory?.avatar || "https://api.dicebear.com/9.x/adventurer/svg?seed=Unknown",
                    score: data.totalScore || 0,
                    isPlayer: false // Checked in mapping below
                });
            });
            setTopPlayers(fetched);
        } catch (e) {
            console.error("Erro ao buscar ranking", e);
        } finally {
            setLoading(false);
        }
    };
    fetchLeaderboard();
  }, []);
  
  // Merge current player visual state (for local feedback) if not in top 10 fetch
  // Note: In a real app we'd check auth UID against fetch IDs
  const ranking = useMemo(() => {
    if (loading) return [];

    // Simple visual merge to ensure "You" appear somewhere if the logic was strict,
    // but here we just list the global top 10.
    return topPlayers.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }, [topPlayers, loading]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown size={24} className="text-yellow-400 fill-yellow-400 animate-bounce" />;
      case 2: return <Medal size={24} className="text-gray-300 fill-gray-300" />;
      case 3: return <Medal size={24} className="text-amber-600 fill-amber-600" />;
      default: return <span className="font-mono font-bold text-slate-500 w-6 text-center">{rank}</span>;
    }
  };

  return (
    <div className="absolute inset-0 z-[100] bg-slate-900 flex flex-col animate-[pop_0.3s_ease-out]">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

      {/* Header */}
      <div className="p-4 bg-slate-800 shadow-lg flex justify-between items-center z-10 border-b border-white/5">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-transform z-50">
          <ArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 flex items-center gap-2 drop-shadow-sm">
            <Trophy className="text-yellow-400" fill="currentColor" /> Ranking Global
        </h1>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </div>

      {/* Top 3 Podium (Optional Visualization, simplified here to list) */}
      <div className="bg-slate-800/50 p-4 pb-0">
        <p className="text-center text-slate-400 text-sm mb-2">Top 10 Melhores Jogadores</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
        {loading ? (
             <div className="flex justify-center pt-20 text-slate-500 animate-pulse">Carregando Ranking...</div>
        ) : (
            <div className="flex flex-col gap-3 pb-20">
                {ranking.map((entry) => (
                    <div 
                        key={entry.id}
                        className={`
                            relative flex items-center gap-4 p-3 rounded-2xl border 
                            transition-all duration-300 bg-slate-800 border-slate-700
                        `}
                    >
                        {/* Rank Position */}
                        <div className="flex flex-col items-center justify-center w-8">
                            {getRankIcon(entry.rank || 0)}
                        </div>

                        {/* Avatar */}
                        <div className="relative">
                            <img 
                                src={entry.avatar} 
                                alt={entry.name} 
                                className="w-12 h-12 rounded-full object-cover border-2 bg-slate-700 border-slate-600"
                            />
                            {entry.rank === 1 && (
                                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    #1
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h3 className="font-bold text-lg leading-none text-slate-300">
                                {entry.name}
                            </h3>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                            <span className="block font-mono font-black text-xl text-white">
                                {entry.score.toLocaleString()}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Pontos</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Footer / Player Quick Stats */}
      <div className="p-4 bg-slate-900 border-t border-white/10 z-10 text-center">
          <div className="flex justify-center items-center gap-2 text-sm text-slate-400">
             <span>Sua Pontuação Total:</span>
             <span className="text-white font-bold">{playerScore.toLocaleString()}</span>
          </div>
      </div>

    </div>
  );
};

export default Leaderboard;
