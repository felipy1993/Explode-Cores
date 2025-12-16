
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, LevelConfig, BOARD_SIZE, ANIMATION_DELAY, PowerUp, TileStatus, LevelResult, RuneType, ObstacleType, TutorialType } from '../types';
import { createBoard, findMatches, handleMatches, applyGravity, resetStatus, triggerColorBomb, shuffleBoard, hasPossibleMoves } from '../utils/gameLogic';
import Rune from './Rune';
import TutorialModal from './TutorialModal';
import LevelCompleteModal from './LevelCompleteModal';
import { ArrowLeft, RefreshCw, Coins, Zap, Bomb, FlaskConical, Settings, Star, Target } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface GameProps {
  level: LevelConfig;
  onExit: (result?: LevelResult) => void;
  currentCoins: number;
  onSpendCoins: (amount: number) => void;
  seenTutorials: TutorialType[];
  onTutorialSeen: (type: TutorialType) => void;
  inventoryBoosters: { moves_5: number, bomb: number, shuffle: number };
  onConsumeBooster: (type: 'moves_5' | 'bomb' | 'shuffle') => void;
  onOpenSettings: () => void;
}

interface FloatingText {
  id: string;
  r: number;
  c: number;
  text: string;
  className: string;
}

interface Particle {
    id: string;
    r: number;
    c: number;
    color: string;
    tx: string; // Translation X CSS var
    ty: string; // Translation Y CSS var
    rot: string; // Rotation CSS var
}

interface VisualEffect {
    id: string;
    type: 'LASER_H' | 'LASER_V' | 'SHOCKWAVE' | 'NOVA';
    r: number;
    c: number;
}

// SCORE BALANCE
const POINTS_PER_MOVE = 50; 
const DRAG_THRESHOLD = 30; // Pixels to trigger a swipe

const Game: React.FC<GameProps> = ({ level, onExit, currentCoins, onSpendCoins, seenTutorials, onTutorialSeen, inventoryBoosters, onConsumeBooster, onOpenSettings }) => {
  const [grid, setGrid] = useState<Grid>([]);
  const [isGridReady, setIsGridReady] = useState(false);
  
  const [selectedTile, setSelectedTile] = useState<{ r: number, c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(level.moves);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameResult, setGameResult] = useState<LevelResult | null>(null);
  
  const [activeTutorial, setActiveTutorial] = useState<TutorialType | null>(null);
  const [potionsCollected, setPotionsCollected] = useState(0);
  
  const isEndingRef = useRef(false);
  const isMountedRef = useRef(true); 

  // Dragging State Refs (Better than state to avoid re-renders during rapid movement)
  const dragStartRef = useRef<{ r: number, c: number, x: number, y: number } | null>(null);

  const [abilityPrices, setAbilityPrices] = useState({
      shuffle: 50,
      bomb: 150,
      moves: 200
  });

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeEffects, setActiveEffects] = useState<VisualEffect[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [scorePulse, setScorePulse] = useState(false);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [comboMessage, setComboMessage] = useState<{text: string, scale: number} | null>(null);

  const [hintTile, setHintTile] = useState<{r: number, c: number} | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isAutoShuffling, setIsAutoShuffling] = useState(false);

  const star1Score = level.targetScore;
  const star2Score = Math.floor(level.targetScore * 1.2); 
  const star3Score = Math.floor(level.targetScore * 1.5);

  // --- INITIALIZATION ---
  useEffect(() => {
    isMountedRef.current = true;
    let tutorialToShow: TutorialType | null = null;
    const hasStones = level.layout.some(row => row.includes('S'));
    if (hasStones && !seenTutorials.includes('STONE')) tutorialToShow = 'STONE';
    const hasIce = level.layout.some(row => row.includes('I'));
    if (hasIce && !seenTutorials.includes('ICE') && !tutorialToShow) tutorialToShow = 'ICE';
    const hasChains = level.layout.some(row => row.includes('C'));
    if (hasChains && !seenTutorials.includes('CHAINS') && !tutorialToShow) tutorialToShow = 'CHAINS';
    if (level.objective === 'COLLECT_POTIONS' && !seenTutorials.includes('POTION') && !tutorialToShow) tutorialToShow = 'POTION';

    if (tutorialToShow) {
        setActiveTutorial(tutorialToShow);
    } else {
        initializeGame();
    }
    return () => { isMountedRef.current = false; };
  }, [level, seenTutorials]);

  const initializeGame = () => {
      let initialGrid = createBoard(level.layout);
    
      if (level.objective === 'COLLECT_POTIONS') {
          let potionsPlaced = 0;
          let attempts = 0;
          const existing = initialGrid.flat().filter(t => t.type === RuneType.POTION).length;
          potionsPlaced = existing;

          while (potionsPlaced < 2 && attempts < 100) {
              const r = Math.floor(Math.random() * (BOARD_SIZE / 2)); 
              const c = Math.floor(Math.random() * BOARD_SIZE);
              const tile = initialGrid[r][c];
              if (tile.obstacle === ObstacleType.NONE && !tile.isEmpty && tile.type !== RuneType.POTION) {
                  initialGrid[r][c] = { ...tile, type: RuneType.POTION };
                  potionsPlaced++;
              }
              attempts++;
          }
      }
      if (isMountedRef.current) {
          setGrid(initialGrid);
          setIsGridReady(true);
      }
  };

  const handleDismissTutorial = () => {
      audioManager.playSfx('ui');
      if (activeTutorial) {
          onTutorialSeen(activeTutorial);
          setActiveTutorial(null);
          initializeGame();
      }
  };

  const resetHintTimer = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHintTile(null);
    if (isProcessing || gameResult || activeTutorial) return;

    hintTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      const r = Math.floor(Math.random() * BOARD_SIZE);
      const c = Math.floor(Math.random() * BOARD_SIZE);
      setHintTile({r, c});
    }, 5000); 
  }, [grid, isProcessing, gameResult, activeTutorial]);

  // --- AUTO SHUFFLE CHECK ---
  useEffect(() => {
      if (!isGridReady || isProcessing || gameResult || activeTutorial || isAutoShuffling || isEndingRef.current) return;

      const checkMoves = async () => {
          const hasMoves = hasPossibleMoves(grid);
          if (!hasMoves) {
              setIsAutoShuffling(true);
              setComboMessage({ text: "Sem Movimentos!", scale: 1.2 });
              
              await new Promise(r => setTimeout(r, 1500));
              if (!isMountedRef.current) return;

              audioManager.playSfx('special');
              const newGrid = shuffleBoard(grid);
              setGrid(newGrid);
              setComboMessage({ text: "Embaralhando...", scale: 1.2 });
              
              await new Promise(r => setTimeout(r, 800));
              if (!isMountedRef.current) return;

              setComboMessage(null);
              setIsAutoShuffling(false);
          }
      };
      
      const t = setTimeout(checkMoves, 1000); // Check after stable state
      return () => clearTimeout(t);
  }, [grid, isGridReady, isProcessing, gameResult, activeTutorial, isAutoShuffling]);


  useEffect(() => {
    if (isGridReady) resetHintTimer();
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, [grid, isProcessing, resetHintTimer, isGridReady]);

  const triggerShake = (intensity: 'low' | 'high' = 'low') => {
    setIsShaking(true);
    setTimeout(() => {
        if(isMountedRef.current) setIsShaking(false);
    }, intensity === 'high' ? 500 : 300);
  };

  const triggerVisualEffect = (type: VisualEffect['type'], r: number, c: number) => {
      const id = Math.random().toString();
      setActiveEffects(prev => [...prev, { id, type, r, c }]);
      setTimeout(() => {
          if (isMountedRef.current) setActiveEffects(prev => prev.filter(e => e.id !== id));
      }, 700);
  };

  const triggerScorePulse = () => {
      setScorePulse(true);
      setTimeout(() => {
          if(isMountedRef.current) setScorePulse(false);
      }, 200);
  };

  const spawnParticles = (r: number, c: number, color: string) => {
      const newParticles: Particle[] = [];
      const count = 6;
      for(let i=0; i<count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          const dist = 50 + Math.random() * 50;
          const tx = Math.cos(angle) * dist + 'px';
          const ty = Math.sin(angle) * dist + 'px';
          const rot = Math.random() * 360 + 'deg';

          newParticles.push({
              id: Math.random().toString(),
              r, c, color, tx, ty, rot
          });
      }
      setParticles(prev => [...prev, ...newParticles]);
      setTimeout(() => {
          if(isMountedRef.current) setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
      }, 700);
  };

  const getRuneColor = (type: RuneType): string => {
      switch(type) {
          case RuneType.FIRE: return '#f87171'; 
          case RuneType.WATER: return '#60a5fa'; 
          case RuneType.NATURE: return '#a3e635';
          case RuneType.LIGHT: return '#facc15'; 
          case RuneType.VOID: return '#a78bfa'; 
          case RuneType.POTION: return '#f472b6'; 
          default: return '#cbd5e1'; 
      }
  };

  const addFloatingText = (r: number, c: number, scoreVal: number | string, combo: number) => {
    const id = Math.random().toString();
    
    let text = typeof scoreVal === 'string' ? scoreVal : `+${scoreVal}`;
    let className = 'text-white text-xl font-bold drop-shadow-md';

    if (combo > 1) {
        if (combo <= 2) {
            className = 'text-yellow-300 text-2xl font-black drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]';
        } else if (combo <= 4) {
             className = 'text-orange-400 text-3xl font-black drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]';
        } else {
             className = 'text-rainbow text-4xl font-black drop-shadow-[0_4px_0_rgba(0,0,0,0.8)] z-50';
        }
    }

    setFloatingTexts(prev => [...prev, { id, r, c, text, className }]);
    setTimeout(() => {
      if(isMountedRef.current) setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 1000); 
  };

  const handlePotionCollected = useCallback((r: number, c: number) => {
      setPotionsCollected(prev => prev + 1);
      triggerShake('high');
      audioManager.playSfx('win');
      addFloatingText(r, c, "COLETADO!", 5); 
      spawnParticles(r, c, '#f472b6');
  }, []);

  const getComboPraise = (combo: number) => {
      if (combo === 2) return "Bom!";
      if (combo === 3) return "Ótimo!";
      if (combo === 4) return "Incrível!";
      if (combo === 5) return "Espetacular!";
      if (combo >= 6) return "LENDÁRIO!";
      return "";
  };

  const processBoard = useCallback(async (currentGrid: Grid) => {
    if (!isMountedRef.current) return;
    setIsProcessing(true);
    let activeGrid = currentGrid;
    let keepProcessing = true;
    let comboMultiplier = 1;
    let safetyCounter = 0; 

    setCurrentCombo(0);
    setComboMessage(null);

    await new Promise(r => setTimeout(r, 200));
    if (!isMountedRef.current) return;

    while (keepProcessing && safetyCounter < 15 && isMountedRef.current) {
      safetyCounter++;
      const { matches, score: matchScore, newPowerUps } = findMatches(activeGrid);
      
      let collectedPotionsCount = 0;

      if (matches.length > 0) {
        const actualMultiplier = comboMultiplier + (comboMultiplier > 1 ? 1 : 0);
        
        matches.forEach(m => {
             spawnParticles(m.row, m.col, getRuneColor(m.type));
             if (m.powerUp === PowerUp.HORIZONTAL) triggerVisualEffect('LASER_H', m.row, m.col);
             if (m.powerUp === PowerUp.VERTICAL) triggerVisualEffect('LASER_V', m.row, m.col);
             if (m.powerUp === PowerUp.COLOR_BOMB) triggerVisualEffect('SHOCKWAVE', m.row, m.col);
             if (m.powerUp === PowerUp.NOVA) triggerVisualEffect('NOVA', m.row, m.col);
        });

        const centerTile = matches[Math.floor(matches.length / 2)];
        const scoreGain = Math.floor(matchScore * 2 * actualMultiplier);
        addFloatingText(centerTile.row, centerTile.col, scoreGain, comboMultiplier);
        
        const createdNova = newPowerUps.some(p => p.type === PowerUp.NOVA);
        const createdBomb = newPowerUps.some(p => p.type === PowerUp.COLOR_BOMB);
        
        if (createdNova) {
            triggerShake('high');
            audioManager.playSfx('special');
            addFloatingText(centerTile.row, centerTile.col, "SUPREMO!", 6);
        } else if (createdBomb) {
            triggerShake('low');
            audioManager.playSfx('special');
        } else if (comboMultiplier > 1) {
            audioManager.playSfx('combo');
        } else {
            audioManager.playSfx('match');
        }

        if (comboMultiplier > 1) {
            setCurrentCombo(comboMultiplier);
            const praise = getComboPraise(comboMultiplier);
            if (praise) {
                setComboMessage({ text: praise, scale: 1 + (comboMultiplier * 0.1) });
                setTimeout(() => {
                    if (isMountedRef.current) setComboMessage(null);
                }, 800);
            }
        }

        setScore(prev => prev + scoreGain);
        triggerScorePulse();

        const { grid: afterMatchGrid, scoreBonus } = handleMatches(activeGrid, matches, newPowerUps);
        activeGrid = afterMatchGrid;
        if (scoreBonus > 0) setScore(prev => prev + scoreBonus);
        
        setGrid([...activeGrid]);
        await new Promise(r => setTimeout(r, ANIMATION_DELAY));
        if (!isMountedRef.current) return;
      }

      // Always apply gravity
      const currentPotionsOnBoard = activeGrid.flat().filter(t => t.type === RuneType.POTION).length;
      // CRITICAL FIX: Only try to spawn if we actually need one, applyGravity prevents overflow internally
      const shouldSpawn = level.objective === 'COLLECT_POTIONS' && currentPotionsOnBoard < 2;

      const { grid: gravityGrid, collectedCount } = applyGravity(activeGrid, handlePotionCollected, shouldSpawn);
      activeGrid = gravityGrid;
      collectedPotionsCount = collectedCount;
      
      if (matches.length > 0 || collectedCount > 0) {
          setGrid([...activeGrid]);
          await new Promise(r => setTimeout(r, ANIMATION_DELAY));
          if (!isMountedRef.current) return;

          activeGrid = resetStatus(activeGrid);
          setGrid([...activeGrid]);
          
          if (matches.length > 0) comboMultiplier++;
      }

      keepProcessing = matches.length > 0 || collectedPotionsCount > 0;
    }
    
    setTimeout(() => {
        if(isMountedRef.current) {
            setCurrentCombo(0);
            setComboMessage(null);
            setIsProcessing(false); // Unlock
        }
    }, 500);
  }, [handlePotionCollected, gameResult, level.objective]); 

  // --- WIN/LOSE ---
  useEffect(() => {
    if (gameResult || !isGridReady || isEndingRef.current || isProcessing || isAutoShuffling) return;

    let hasWon = false;
    if (level.objective === 'SCORE' && score >= level.targetScore) hasWon = true;
    else if (level.objective === 'COLLECT_POTIONS' && potionsCollected >= level.objectiveTarget) hasWon = true;

    if (hasWon || movesLeft <= 0) {
        let actualWin = false;
        if (level.objective === 'SCORE' && score >= level.targetScore) actualWin = true;
        if (level.objective === 'COLLECT_POTIONS' && potionsCollected >= level.objectiveTarget) actualWin = true;
        
        if (actualWin) {
            isEndingRef.current = true; 
            audioManager.playSfx('win');
            const moveBonus = movesLeft * POINTS_PER_MOVE;
            const finalScore = score + moveBonus;
            triggerShake('high'); 

            const stars = finalScore >= star3Score ? 3 : finalScore >= star2Score ? 2 : 1;
            const baseCoins = 50; 
            const starBonus = stars * 25; 
            const movesCoinBonus = movesLeft * 2;
            const totalCoins = baseCoins + starBonus + movesCoinBonus;
            
            setTimeout(() => {
                if (isMountedRef.current) {
                    setScore(finalScore);
                    setGameResult({ won: true, score: finalScore, stars, coinsEarned: totalCoins });
                }
            }, 500);
        } else if (movesLeft <= 0) {
            isEndingRef.current = true;
            audioManager.playSfx('lose');
            setTimeout(() => {
                if (isMountedRef.current) {
                    setGameResult({ won: false, score, stars: 0, coinsEarned: 10 });
                }
            }, 500);
        }
    }
  }, [score, potionsCollected, movesLeft, isProcessing, level, gameResult, isGridReady, isAutoShuffling, star2Score, star3Score]);


  const handleTileClick = async (r: number, c: number) => {
    if (isProcessing || gameResult || !isGridReady || isEndingRef.current || isAutoShuffling) return;
    setHintTile(null);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);

    if (!selectedTile) {
      if (!grid[r][c].isEmpty && grid[r][c].obstacle !== ObstacleType.STONE) {
          audioManager.playSfx('select');
          setSelectedTile({ r, c });
      }
      return;
    }

    const { r: r1, c: c1 } = selectedTile;
    const isAdjacent = Math.abs(r1 - r) + Math.abs(c1 - c) === 1;
    const t1 = grid[r1][c1];
    const t2 = grid[r][c];

    if (t1.obstacle === ObstacleType.CHAINS || t2.obstacle === ObstacleType.CHAINS || t1.obstacle === ObstacleType.STONE || t2.obstacle === ObstacleType.STONE || t2.isEmpty) {
         setSelectedTile(null);
         triggerShake();
         return;
    }

    if (isAdjacent) {
      const tileA = grid[r1][c1];
      const tileB = grid[r][c];
      const isBombA = tileA.powerUp === PowerUp.COLOR_BOMB;
      const isBombB = tileB.powerUp === PowerUp.COLOR_BOMB;

      if (isBombA || isBombB) {
        audioManager.playSfx('special');
        const bombTile = isBombA ? tileA : tileB;
        const targetTile = isBombA ? tileB : tileA;
        if (targetTile.type !== RuneType.WILD && targetTile.type !== RuneType.POTION) {
            setSelectedTile(null);
            setMovesLeft(prev => prev - 1);
            setIsProcessing(true);
            triggerShake('high');

            const swappedGrid = [...grid.map(row => [...row])];
            swappedGrid[r1][c1] = { ...tileB, row: r1, col: c1 };
            swappedGrid[r][c] = { ...tileA, row: r, col: c };
            setGrid(swappedGrid);
            
            await new Promise(r => setTimeout(r, 200));
            if(!isMountedRef.current) return;

            const { grid: explodedGrid, score: bombScore } = triggerColorBomb(swappedGrid, isBombA ? swappedGrid[r][c] : swappedGrid[r1][c1], targetTile.type);
            addFloatingText(r, c, bombScore, 1);
            setScore(prev => prev + bombScore);
            triggerVisualEffect('SHOCKWAVE', r, c);
            setGrid(explodedGrid);
            await new Promise(r => setTimeout(r, ANIMATION_DELAY));
            if(!isMountedRef.current) return;
            
            const currentPotions = explodedGrid.flat().filter(t => t.type === RuneType.POTION).length;
            const shouldSpawn = level.objective === 'COLLECT_POTIONS' && currentPotions < 2;

            let { grid: finalGrid } = applyGravity(explodedGrid, handlePotionCollected, shouldSpawn);
            setGrid([...finalGrid]);
            await new Promise(r => setTimeout(r, ANIMATION_DELAY));
            if(!isMountedRef.current) return;

            finalGrid = resetStatus(finalGrid);
            setGrid([...finalGrid]);
            processBoard(finalGrid);
            return;
        }
      }

      audioManager.playSfx('swap');
      const newGrid = [...grid.map(row => [...row])];
      newGrid[r1][c1] = { ...tileB, row: r1, col: c1 };
      newGrid[r][c] = { ...tileA, row: r, col: c };

      setGrid(newGrid);
      setSelectedTile(null);
      // Optimistic decrement
      setMovesLeft(prev => prev - 1);
      
      // Block interaction immediately
      setIsProcessing(true);

      const { matches } = findMatches(newGrid);
      if (matches.length > 0) {
        processBoard(newGrid);
      } else {
        await new Promise(r => setTimeout(r, 300));
        if(!isMountedRef.current) return;

        audioManager.playSfx('swap');
        newGrid[r1][c1] = { ...tileA, row: r1, col: c1 };
        newGrid[r][c] = { ...tileB, row: r, col: c };
        setGrid([...newGrid]);
        setMovesLeft(prev => prev + 1); // Revert moves
        setIsProcessing(false);
      }

    } else {
      if (r1 === r && c1 === c) setSelectedTile(null);
      else {
          audioManager.playSfx('select');
          setSelectedTile({ r, c });
      }
    }
  };

  // --- DRAG / SWIPE HANDLERS ---
  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (isProcessing || !isGridReady || gameResult) return;
    
    // Start tracking drag
    dragStartRef.current = { r, c, x: e.clientX, y: e.clientY };
    
    // Select the tile visually (mimic click)
    // We only select if not already engaged in a swap, handled by handleTileClick
    handleTileClick(r, c);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || isProcessing) return;

    const { r: startR, c: startC, x: startX, y: startY } = dragStartRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Check if moved enough to count as a swipe
    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
        let targetR = startR;
        let targetC = startC;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal Swipe
            targetC += deltaX > 0 ? 1 : -1;
        } else {
            // Vertical Swipe
            targetR += deltaY > 0 ? 1 : -1;
        }

        // Validate bounds
        if (targetR >= 0 && targetR < BOARD_SIZE && targetC >= 0 && targetC < BOARD_SIZE) {
            // If we swiped to a valid neighbor, simulate a click on that neighbor
            // This works because 'handleTileClick' handles the logic: 
            // 1. We already selected startR/startC on PointerDown
            // 2. Clicking targetR/targetC now triggers the swap logic
            handleTileClick(targetR, targetC);
        }

        // Stop tracking this drag immediately so we don't trigger multiple swaps
        dragStartRef.current = null;
    }
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const handleResultAction = (action: 'NEXT' | 'RETRY' | 'EXIT') => {
      audioManager.playSfx('ui');
      if (!gameResult) return;
      if (action === 'NEXT' && gameResult.won) {
          onExit(gameResult);
      } else if (action === 'RETRY') {
          setScore(0);
          setMovesLeft(level.moves);
          setPotionsCollected(0);
          setGameResult(null);
          isEndingRef.current = false;
          initializeGame();
      } else {
          onExit(gameResult); 
      }
  };

  const handleUseAbility = async (type: 'shuffle' | 'bomb' | 'moves') => {
      if (isProcessing || gameResult) return;

      const inventoryKey = type === 'moves' ? 'moves_5' : type;
      const hasStock = inventoryBoosters[inventoryKey] > 0;
      const price = abilityPrices[type];

      if (!hasStock && currentCoins < price) {
          audioManager.playSfx('lose');
          return;
      }
      
      audioManager.playSfx('special');

      if (type === 'shuffle') {
          setIsProcessing(true);
          const newGrid = shuffleBoard(grid);
          setGrid(newGrid);
          await new Promise(r => setTimeout(r, 300));
          if(isMountedRef.current) {
              setIsProcessing(false);
              processBoard(newGrid);
          }
      } else if (type === 'moves') {
          setMovesLeft(prev => prev + 5);
      } else if (type === 'bomb') {
          setIsProcessing(true);
          const newGrid = grid.map(row => row.map(t => ({...t})));
          const candidates: {r: number, c: number}[] = [];
          for(let r=0; r<BOARD_SIZE; r++){
              for(let c=0; c<BOARD_SIZE; c++){
                   const t = newGrid[r][c];
                   if(!t.isEmpty && t.obstacle === ObstacleType.NONE && t.powerUp === PowerUp.NONE && t.status !== TileStatus.MATCHED && t.type !== RuneType.POTION) {
                       candidates.push({r, c});
                   }
              }
          }
          if(candidates.length > 0){
             const cand = candidates[Math.floor(Math.random() * candidates.length)];
             newGrid[cand.r][cand.c].powerUp = PowerUp.COLOR_BOMB;
             newGrid[cand.r][cand.c].status = TileStatus.NEW;
             setGrid(newGrid);
             triggerShake();
          }
          await new Promise(r => setTimeout(r, 500));
          if(isMountedRef.current) setIsProcessing(false);
      }

      if (hasStock) {
          onConsumeBooster(inventoryKey);
      } else {
          onSpendCoins(price);
          setAbilityPrices(prev => ({ ...prev, [type]: prev[type] + 50 }));
      }
  };

  const CELL_SIZE_PCT = 100 / BOARD_SIZE;

  const renderAbilityButton = (type: 'shuffle' | 'bomb' | 'moves', icon: React.ReactNode) => {
      const inventoryKey = type === 'moves' ? 'moves_5' : type;
      const count = inventoryBoosters[inventoryKey];
      const price = abilityPrices[type];

      return (
        <button onClick={() => handleUseAbility(type)} className="flex flex-col items-center gap-1 group active:scale-95 transition-transform">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-slate-500 relative ${count > 0 ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-700'}`}>
                {icon}
                {count > 0 && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white">
                        {count}
                    </div>
                )}
            </div>
            {count > 0 ? (
                <span className="text-xs font-bold text-green-400">USAR</span>
            ) : (
                <span className="text-xs font-bold bg-black/60 px-2 rounded-full text-white flex items-center gap-1">
                    {price} <Coins size={8} />
                </span>
            )}
        </button>
      );
  };

  const barMax = star3Score;
  const barFill = Math.min(100, (score / barMax) * 100);
  
  const star1Pos = (star1Score / barMax) * 100;
  const star2Pos = (star2Score / barMax) * 100;

  return (
    <div className={`flex flex-col h-full w-full ${level.background} text-white relative overflow-hidden`}>
      {activeTutorial && (
          <TutorialModal type={activeTutorial} onDismiss={handleDismissTutorial} />
      )}
      {gameResult && (
          <LevelCompleteModal result={gameResult} onAction={handleResultAction} />
      )}

      {/* --- HUD --- */}
      <div className="px-4 py-2 pt-8 bg-black/20 backdrop-blur-sm flex justify-between items-center z-20 shadow-lg">
        <button onClick={() => { audioManager.playSfx('ui'); onExit(); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
            <span className="text-xs font-bold tracking-widest opacity-80 uppercase">Movimentos</span>
            <span className={`text-4xl font-black font-mono drop-shadow-md leading-none ${movesLeft < 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{movesLeft}</span>
        </div>
        
        <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                <Coins size={16} className="text-yellow-400" fill="currentColor"/>
                <span className="font-bold">{currentCoins}</span>
            </div>
            <button 
                onClick={onOpenSettings} 
                className="bg-black/60 p-2 rounded-full border border-white/20 hover:bg-black/80 active:scale-95"
            >
                <Settings size={20} />
            </button>
        </div>
      </div>

      <div className="px-6 py-3 z-20 flex flex-col gap-2 relative w-full max-w-md mx-auto mt-2">
         <div className="flex justify-between items-end px-2">
             <div className="flex items-center gap-2 text-amber-300 drop-shadow-md">
                 <Target size={18} />
                 <span className="font-bold uppercase text-sm tracking-wide">Meta:</span>
                 <span className="font-mono font-black text-lg">{level.targetScore}</span>
             </div>
             <div className="text-xs font-bold text-slate-300">
                {score < star1Score ? 'Próxima: ★' : score < star2Score ? 'Próxima: ★★' : score < star3Score ? 'Próxima: ★★★' : 'Máximo!'}
             </div>
         </div>

        <div className="relative h-6 bg-slate-900/80 rounded-full border-2 border-slate-600 shadow-inner">
            <div
                className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-green-400 to-emerald-600 shadow-[0_0_10px_rgba(74,222,128,0.5)] relative overflow-hidden"
                style={{ width: `${barFill}%` }}
            >
                <div className="absolute top-0 bottom-0 -right-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-[wiggle_2s_infinite]"></div>
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300" style={{ left: `${star1Pos}%`, transform: 'translate(-50%, -50%)' }}>
                <div className={`p-1 rounded-full border-2 transition-all ${score >= star1Score ? 'bg-amber-400 border-white scale-125 shadow-lg' : 'bg-slate-800 border-slate-500'}`}>
                    <Star size={12} className={score >= star1Score ? 'text-white fill-white' : 'text-slate-500'} />
                </div>
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300" style={{ left: `${star2Pos}%`, transform: 'translate(-50%, -50%)' }}>
                <div className={`p-1 rounded-full border-2 transition-all ${score >= star2Score ? 'bg-amber-400 border-white scale-125 shadow-lg' : 'bg-slate-800 border-slate-500'}`}>
                    <Star size={14} className={score >= star2Score ? 'text-white fill-white' : 'text-slate-500'} />
                </div>
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300" style={{ right: '-10px', transform: 'translate(0, -50%)' }}>
                <div className={`p-1.5 rounded-full border-2 transition-all ${score >= star3Score ? 'bg-amber-400 border-white scale-125 shadow-lg' : 'bg-slate-800 border-slate-500'}`}>
                    <Star size={16} className={score >= star3Score ? 'text-white fill-white animate-spin-slow' : 'text-slate-500'} />
                </div>
            </div>

             <div className="absolute -bottom-6 w-full text-center">
                 <span className="text-xs font-bold text-white drop-shadow-md font-mono bg-black/30 px-2 rounded-md">
                     {score} pts
                 </span>
             </div>
        </div>
        {level.objective === 'COLLECT_POTIONS' && (
             <div className="flex justify-center mt-4 animate-[float-up_0.5s_ease-out]">
                 <div className="flex items-center gap-2 text-sm font-bold bg-pink-500/20 px-4 py-1.5 rounded-full border border-pink-500/50 shadow-md">
                    <FlaskConical size={18} className="text-pink-300 animate-bounce" />
                    <span className="text-pink-100 font-mono tracking-wider">{potionsCollected} / {level.objectiveTarget}</span>
                 </div>
             </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative pb-24">
        {currentCombo > 2 && (
             <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-orange-500/10 via-transparent to-red-500/10 animate-pulse transition-opacity duration-500"></div>
        )}

        {(currentCombo > 1 || comboMessage) && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center">
                {currentCombo > 1 && (
                     <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-500 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] animate-bounce tracking-tighter" style={{ textShadow: '0 0 20px rgba(255,200,0,0.5)' }}>
                         COMBO x{currentCombo}
                     </div>
                )}
                {comboMessage && (
                    <div className="text-3xl font-black text-white italic animate-impact mt-2 text-rainbow drop-shadow-lg uppercase whitespace-nowrap">
                        {comboMessage.text}
                    </div>
                )}
            </div>
        )}

        {isGridReady ? (
            <div 
                className={`relative bg-slate-950/80 p-3 rounded-3xl border-4 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.6)] transition-all duration-300 ${isShaking ? 'animate-shake' : ''} ${currentCombo > 2 ? 'fever-mode border-amber-500' : 'border-slate-700/50'} ${isProcessing ? 'pointer-events-none cursor-wait' : ''}`}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{ touchAction: 'none' }} // Prevents scrolling while swiping
            >
                <div className="relative" style={{ width: 'min(90vw, 400px)', height: 'min(90vw, 400px)' }}>
                {grid.flat().map((tile) => (
                    <div
                        key={tile.id}
                        className="absolute transition-all duration-300 ease-in-out p-1"
                        style={{
                            width: `${CELL_SIZE_PCT}%`,
                            height: `${CELL_SIZE_PCT}%`,
                            top: `${tile.row * CELL_SIZE_PCT}%`,
                            left: `${tile.col * CELL_SIZE_PCT}%`,
                            zIndex: tile.status === TileStatus.DROPPING ? 20 : 10
                        }}
                        onPointerDown={(e) => handlePointerDown(e, tile.row, tile.col)}
                    >
                        <Rune 
                            tile={tile}
                            isSelected={selectedTile?.r === tile.row && selectedTile?.c === tile.col}
                            isHint={hintTile?.r === tile.row && hintTile?.c === tile.col}
                            onClick={() => {}} // Click is handled by PointerDown now
                        />
                    </div>
                ))}
                
                {activeEffects.map(fx => (
                     <div key={fx.id}>
                         {fx.type === 'LASER_H' && <div className="fx-laser-h" style={{ top: `${fx.r * CELL_SIZE_PCT + 2}%` }}></div>}
                         {fx.type === 'LASER_V' && <div className="fx-laser-v" style={{ left: `${fx.c * CELL_SIZE_PCT + 2}%` }}></div>}
                         {fx.type === 'SHOCKWAVE' && (
                             <div className="absolute pointer-events-none" style={{ 
                                 width: `${CELL_SIZE_PCT}%`, height: `${CELL_SIZE_PCT}%`, 
                                 top: `${fx.r * CELL_SIZE_PCT}%`, left: `${fx.c * CELL_SIZE_PCT}%`,
                                 zIndex: 40 
                             }}>
                                 <div className="fx-shockwave"></div>
                             </div>
                         )}
                         {fx.type === 'NOVA' && <div className="fx-nova-overlay"></div>}
                     </div>
                ))}

                {particles.map(p => (
                    <div 
                        key={p.id}
                        className="particle z-40"
                        style={{
                            top: `calc(${p.r * CELL_SIZE_PCT}% + 6%)`, 
                            left: `calc(${p.c * CELL_SIZE_PCT}% + 6%)`,
                            backgroundColor: p.color,
                            '--tx': p.tx,
                            '--ty': p.ty,
                            '--rot': p.rot
                        } as React.CSSProperties}
                    />
                ))}

                {floatingTexts.map(ft => (
                    <div key={ft.id} className={`absolute pointer-events-none animate-float-up whitespace-nowrap z-50 ${ft.className}`} style={{ top: `${ft.r * CELL_SIZE_PCT}%`, left: `${ft.c * CELL_SIZE_PCT}%` }}>{ft.text}</div>
                ))}
                </div>
            </div>
        ) : (
            <div className="text-white animate-pulse">Carregando Fase...</div>
        )}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-6 z-30">
            {renderAbilityButton('shuffle', <RefreshCw size={24} className="text-white"/>)}
            {renderAbilityButton('bomb', <Bomb size={24} className="text-white"/>)}
            {renderAbilityButton('moves', <Zap size={24} className="text-white"/>)}
        </div>
      </div>
    </div>
  );
};

export default Game;
