
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import WorldMap from './components/WorldMap';
import Game from './components/Game';
import Shop from './components/Shop';
import Leaderboard from './components/Leaderboard';
import ChestRewardModal from './components/ChestRewardModal';
import DailyBonusModal from './components/DailyBonusModal';
import SettingsModal from './components/SettingsModal';
import AuthScreen from './components/AuthScreen';
import { LevelConfig, PlayerInventory, ShopItem, LevelResult, LevelObjective, TutorialType, MAX_LIVES, LIFE_REGEN_MS } from './types';
import { audioManager } from './utils/audioManager';

// --- LAYOUT TEMPLATES (ASCII MAPS) ---
const TEMPLATES = {
    FULL: [
        "########", "########", "########", "########", "########", "########", "########", "########"
    ],
    CROSS: [
        "..####..", "..####..", "########", "########", "########", "########", "..####..", "..####.."
    ],
    DONUT: [
        "########", "########", "##....##", "##....##", "##....##", "##....##", "########", "########"
    ],
    HOURGLASS: [
        "########", ".######.", "..####..", "...##...", "...##...", "..####..", ".######.", "########"
    ],
    DIVIDED: [
        "###..###", "###..###", "###..###", "########", "########", "###..###", "###..###", "###..###"
    ],
    CASTLE: [
        "#.#..#.#", "########", "########", "########", "########", "########", "########", "########"
    ]
};

const BIOMES = [
  { name: "Clareira", bg: "bg-gradient-to-b from-green-600 to-teal-900" },
  { name: "Gelo", bg: "bg-gradient-to-b from-cyan-600 to-slate-800" },
  { name: "Vulcão", bg: "bg-gradient-to-b from-red-600 to-orange-900" },
  { name: "Deserto", bg: "bg-gradient-to-b from-yellow-500 to-amber-800" },
  { name: "Sombrio", bg: "bg-gradient-to-b from-emerald-800 to-black" },
];

const generateLevels = (count: number): LevelConfig[] => {
  return Array.from({ length: count }, (_, i) => {
    const id = i + 1;
    const biome = BIOMES[Math.floor((id - 1) / 20) % BIOMES.length];
    
    // Difficulty
    let difficulty: 'Fácil' | 'Médio' | 'Difícil' = 'Fácil';
    if (id % 10 > 5) difficulty = 'Médio';
    if (id % 10 === 0 || id % 10 === 9) difficulty = 'Difícil';
    
    // Layout Selection
    let layout = [...TEMPLATES.FULL];
    if (id > 10) layout = [...TEMPLATES.CASTLE];
    if (id > 20) layout = [...TEMPLATES.HOURGLASS];
    if (id > 40) layout = [...TEMPLATES.DONUT];
    if (id > 60) layout = [...TEMPLATES.CROSS];
    
    // Add Obstacles based on difficulty/progress
    if (id > 5) {
        // Add Random Stones
        layout = layout.map(row => {
            if (Math.random() > 0.8) return row.replace(/#/g, (m) => Math.random() > 0.8 ? 'S' : '#');
            return row;
        });
    }
    if (id > 15) {
         // Add Random Ice
         layout = layout.map(row => {
            if (Math.random() > 0.7) return row.replace(/#/g, (m) => Math.random() > 0.9 ? 'I' : '#');
            return row;
        });
    }

    // Objective
    let objective: LevelObjective = 'SCORE';
    let objectiveTarget = 1000 + (id * 100);
    
    if (id % 3 === 0 && id > 5) {
        objective = 'COLLECT_POTIONS';
        objectiveTarget = 2 + Math.floor(id / 20); // Scale potion count
    }

    return {
      id,
      name: `${biome.name} ${id}`,
      moves: 20 + (difficulty === 'Difícil' ? 5 : 0),
      targetScore: Math.floor(objectiveTarget),
      background: biome.bg,
      difficulty,
      layout,
      objective,
      objectiveTarget
    };
  });
};

const LEVELS = generateLevels(1000);

// --- TRANSITION COMPONENT ---
const ScreenTransition = ({ children, isVisible }: { children?: React.ReactNode, isVisible: boolean }) => {
    return (
        <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            {children}
        </div>
    );
};

const DEFAULT_INVENTORY: PlayerInventory = {
    coins: 500,
    lives: MAX_LIVES,
    lastLifeRegen: Date.now(),
    lastLoginDate: new Date().toISOString().split('T')[0],
    loginStreak: 1,
    starChestProgress: 0,
    highScores: {},
    boosters: { moves_5: 1, bomb: 1, shuffle: 1 },
    skins: ['skin_classic'],
    activeSkin: 'skin_classic',
    themes: ['theme_default'],
    activeTheme: 'theme_default',
    seenTutorials: [],
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix'
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [currentScreen, setCurrentScreen] = useState<'MAP' | 'GAME'>('MAP');
  const [activeLevel, setActiveLevel] = useState<LevelConfig | null>(null);
  const [unlockedLevel, setUnlockedLevel] = useState(1); 
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [showChestModal, setShowChestModal] = useState(false);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [inventory, setInventory] = useState<PlayerInventory>(DEFAULT_INVENTORY);

  // --- AUDIO INITIALIZATION LISTENER ---
  useEffect(() => {
    const initAudio = () => {
      audioManager.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };

    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // --- FIREBASE AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            // Load Data from Firestore
            try {
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setInventory(data.inventory);
                    setUnlockedLevel(data.unlockedLevel || 1);
                } else {
                    // New user handled in SignUp component, but fallback here if needed
                }
            } catch (error) {
                console.error("Error loading user data:", error);
            }
        }
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- SAVE TO FIRESTORE HELPER ---
  const saveUserData = useCallback(async (newInventory: PlayerInventory, newUnlockedLevel?: number) => {
      if (!user) return;
      try {
          const totalScore = Object.values(newInventory.highScores).reduce((a, b) => a + b, 0);
          await updateDoc(doc(db, "users", user.uid), {
              inventory: newInventory,
              unlockedLevel: newUnlockedLevel || unlockedLevel,
              totalScore: totalScore,
              displayName: user.displayName // Update name just in case
          });
      } catch (error) {
          console.error("Error saving data:", error);
      }
  }, [user, unlockedLevel]);

  // --- LIVES REGENERATION LOGIC ---
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
        setInventory(prev => {
            if (prev.lives >= MAX_LIVES) return prev;
            
            const now = Date.now();
            const lastRegen = prev.lastLifeRegen || now;
            const diff = now - lastRegen;

            if (diff >= LIFE_REGEN_MS) {
                const livesRecovered = Math.floor(diff / LIFE_REGEN_MS);
                const newLives = Math.min(MAX_LIVES, prev.lives + livesRecovered);
                const newLastRegen = now - (diff % LIFE_REGEN_MS);
                const newInv = { ...prev, lives: newLives, lastLifeRegen: newLastRegen };
                
                // We don't save to DB on every tick, only when lives actually change significantly or app closes
                // But for simplicity/correctness, let's trigger a save if we recover lives
                if (livesRecovered > 0) saveUserData(newInv);
                
                return newInv;
            }
            return prev;
        });
    }, 1000); 

    return () => clearInterval(timer);
  }, [user, saveUserData]);

  // --- DAILY BONUS CHECK ---
  useEffect(() => {
      if (!user || authLoading) return;
      
      const today = new Date().toISOString().split('T')[0];
      if (inventory.lastLoginDate !== today) {
          setShowDailyBonus(true);
          setInventory(prev => {
              const newInv = {
                ...prev,
                lastLoginDate: today,
                loginStreak: (prev.loginStreak % 7) + 1 
              };
              saveUserData(newInv);
              return newInv;
          });
      }
  }, [user, authLoading]); // Removed inventory dep to avoid loop, handled by check inside

  const handleClaimDaily = () => {
      audioManager.playSfx('ui');
      const day = inventory.loginStreak;
      setInventory(prev => {
          const inv = { ...prev };
          if (day === 1 || day === 3 || day === 5) inv.coins += 100 * Math.ceil(day/2);
          if (day === 2) inv.boosters.moves_5 += 1;
          if (day === 4) inv.boosters.shuffle += 1;
          if (day === 6) inv.boosters.bomb += 1;
          if (day === 7) { inv.coins += 1000; inv.boosters.bomb += 1; }
          saveUserData(inv);
          return inv;
      });
      setShowDailyBonus(false);
  };

  const handleSelectLevel = (level: LevelConfig) => {
    audioManager.playSfx('select');
    if (inventory.lives <= 0) {
        audioManager.playSfx('lose');
        alert("Sem vidas! Aguarde recarregar ou compre na loja.");
        setIsShopOpen(true);
        return;
    }

    // Transition Logic
    setIsTransitioning(true);
    setTimeout(() => {
        setActiveLevel(level);
        setCurrentScreen('GAME');
        setIsTransitioning(false);
    }, 500); // Wait for fade out
  };

  const handleExitGame = (result?: LevelResult) => {
    
    const finalizeExit = () => {
        setCurrentScreen('MAP');
        setActiveLevel(null);
        setIsTransitioning(false);
    };

    if (result) {
        setInventory(prev => {
            let newCoins = prev.coins + result.coinsEarned;
            let newLives = prev.lives;
            let newStarProgress = prev.starChestProgress;
            
            if (!result.won) {
                newLives = Math.max(0, prev.lives - 1);
            } else {
                newStarProgress += result.stars;
            }

            const currentHigh = prev.highScores[activeLevel?.id || 0] || 0;
            const newHighScores = { ...prev.highScores };
            if (result.won && activeLevel && result.score > currentHigh) {
                newHighScores[activeLevel.id] = result.score;
            }

            const newInv = { 
                ...prev, 
                coins: newCoins, 
                lives: newLives,
                highScores: newHighScores,
                starChestProgress: newStarProgress,
                lastLifeRegen: (prev.lives === MAX_LIVES && newLives < MAX_LIVES) ? Date.now() : prev.lastLifeRegen
            };
            
            let nextLevel = unlockedLevel;
            if (result.won && activeLevel && activeLevel.id === unlockedLevel && unlockedLevel < LEVELS.length) {
                nextLevel = unlockedLevel + 1;
                setUnlockedLevel(nextLevel);
            }

            // Save to Firebase
            saveUserData(newInv, nextLevel);

            return newInv;
        });
    }

    setIsTransitioning(true);
    setTimeout(finalizeExit, 500);
  };

  const handleClaimChestReward = (reward: { coins: number; booster?: 'moves_5' | 'bomb' | 'shuffle' }) => {
      audioManager.playSfx('win');
      setInventory(prev => {
          const newInv = { ...prev };
          newInv.coins += reward.coins;
          if (reward.booster) {
              if (reward.booster === 'moves_5') newInv.boosters.moves_5++;
              if (reward.booster === 'bomb') newInv.boosters.bomb++;
              if (reward.booster === 'shuffle') newInv.boosters.shuffle++;
          }
          saveUserData(newInv);
          return newInv;
      });
      setShowChestModal(false);
  };

  const handleClaimStarChest = () => {
      if (inventory.starChestProgress < 20) return;
      audioManager.playSfx('select');
      setInventory(prev => ({...prev, starChestProgress: prev.starChestProgress - 20 }));
      setShowChestModal(true);
  };

  const handleSpendCoins = (amount: number) => {
    audioManager.playSfx('ui');
    setInventory(prev => {
        const newInv = { ...prev, coins: Math.max(0, prev.coins - amount) };
        saveUserData(newInv);
        return newInv;
    });
  };

  const handleConsumeBooster = (type: 'moves_5' | 'bomb' | 'shuffle') => {
      setInventory(prev => {
          const newBoosters = { ...prev.boosters };
          if (newBoosters[type] > 0) {
              newBoosters[type]--;
          }
          const newInv = { ...prev, boosters: newBoosters };
          saveUserData(newInv);
          return newInv;
      });
  };

  const handleBuyItem = (item: ShopItem): boolean => {
    if (inventory.coins >= item.price) {
        audioManager.playSfx('win'); 
        setInventory(prev => {
            const newInv = { ...prev, coins: prev.coins - item.price };
            if (item.category === 'BOOSTER') {
                if (item.id === 'booster_moves') newInv.boosters.moves_5++;
                if (item.id === 'booster_bomb') newInv.boosters.bomb++;
                if (item.id === 'booster_shuffle') newInv.boosters.shuffle++;
            } else if (item.category === 'SKIN') newInv.skins = [...newInv.skins, item.id];
            else if (item.category === 'THEME') newInv.themes = [...newInv.themes, item.id];
            
            saveUserData(newInv);
            return newInv;
        });
        return true;
    }
    audioManager.playSfx('lose'); 
    return false;
  };

  const handleEquipItem = (type: 'SKIN' | 'THEME', id: string) => {
      audioManager.playSfx('ui');
      setInventory(prev => {
          const newInv = {
            ...prev,
            activeSkin: type === 'SKIN' ? id : prev.activeSkin,
            activeTheme: type === 'THEME' ? id : prev.activeTheme
          };
          saveUserData(newInv);
          return newInv;
      });
  };

  const handleTutorialSeen = (type: TutorialType) => {
      setInventory(prev => {
          if (prev.seenTutorials.includes(type)) return prev;
          const newInv = { ...prev, seenTutorials: [...prev.seenTutorials, type] };
          saveUserData(newInv);
          return newInv;
      });
  };

  const handleUpdateAvatar = (url: string) => {
      audioManager.playSfx('ui');
      setInventory(prev => {
          const newInv = { ...prev, avatar: url };
          saveUserData(newInv);
          return newInv;
      });
  };

  const totalPlayerScore = Object.values(inventory.highScores).reduce((a: number, b: number) => a + b, 0);

  if (authLoading) return <div className="w-full h-screen bg-black flex items-center justify-center text-white">Carregando...</div>;

  if (!user) {
      return <AuthScreen defaultInventory={DEFAULT_INVENTORY} />;
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-black select-none relative">
      {/* 1. Base Game Screens - Wrapped in Transition Logic */}
      
      {/* MAP SCREEN */}
      <ScreenTransition isVisible={currentScreen === 'MAP' && !isTransitioning}>
        <WorldMap 
          levels={LEVELS} 
          currentLevel={unlockedLevel} 
          inventory={inventory}
          onSelectLevel={handleSelectLevel} 
          onOpenShop={() => { audioManager.playSfx('ui'); setIsShopOpen(true); }}
          onOpenLeaderboard={() => { audioManager.playSfx('ui'); setIsLeaderboardOpen(true); }}
          onClaimStarChest={handleClaimStarChest}
          onOpenSettings={() => { audioManager.playSfx('ui'); setShowSettings(true); }}
        />
      </ScreenTransition>
      
      {/* GAME SCREEN */}
      {activeLevel && (
        <ScreenTransition isVisible={currentScreen === 'GAME' && !isTransitioning}>
            <Game 
              level={activeLevel} 
              onExit={handleExitGame} 
              currentCoins={inventory.coins}
              onSpendCoins={handleSpendCoins}
              seenTutorials={inventory.seenTutorials}
              onTutorialSeen={handleTutorialSeen}
              inventoryBoosters={inventory.boosters}
              onConsumeBooster={handleConsumeBooster}
              onOpenSettings={() => { audioManager.playSfx('ui'); setShowSettings(true); }}
            />
        </ScreenTransition>
      )}

      {/* Loading/Transition Curtain */}
      <div className={`absolute inset-0 z-40 bg-black flex items-center justify-center transition-opacity duration-500 pointer-events-none ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-amber-400 font-black text-2xl animate-pulse">EXPLODE CORES</div>
      </div>

      {/* 2. Overlays / Modals */}
      
      {showDailyBonus && <DailyBonusModal streak={inventory.loginStreak} onClaim={handleClaimDaily} />}
      {showChestModal && <ChestRewardModal onClaim={handleClaimChestReward} />}
      
      {showSettings && (
        <SettingsModal 
            onClose={() => setShowSettings(false)} 
            currentAvatar={inventory.avatar}
            onUpdateAvatar={handleUpdateAvatar}
        />
      )}
      
      {isShopOpen && <Shop inventory={inventory} onBuy={handleBuyItem} onClose={() => setIsShopOpen(false)} onEquip={handleEquipItem} />}
      
      {isLeaderboardOpen && (
          <Leaderboard 
            playerScore={totalPlayerScore} 
            onClose={() => setIsLeaderboardOpen(false)} 
            playerAvatar={inventory.avatar}
          />
      )}
    </div>
  );
}
