
import { Grid, Tile, RuneType, TileStatus, PowerUp, ObstacleType, BOARD_SIZE } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const getRandomRune = (): RuneType => {
  const types = [RuneType.FIRE, RuneType.WATER, RuneType.NATURE, RuneType.LIGHT, RuneType.VOID];
  return types[Math.floor(Math.random() * types.length)];
};

// --- BOARD CREATION WITH LAYOUTS ---
export const createBoard = (layout?: string[]): Grid => {
  const grid: Grid = [];
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: Tile[] = [];
    const layoutRow = layout && layout[r] ? layout[r] : "########"; 

    for (let c = 0; c < BOARD_SIZE; c++) {
      const char = layoutRow[c] || '#';
      
      let type = getRandomRune();
      let obstacle = ObstacleType.NONE;
      let obstacleHealth = 0;
      let isEmpty = false;

      if (char === '.') {
          isEmpty = true;
          type = RuneType.VOID; 
      } else if (char === 'S') {
          obstacle = ObstacleType.STONE;
          obstacleHealth = 2; 
          type = RuneType.VOID; 
      } else if (char === 'I') {
          obstacle = ObstacleType.ICE;
          obstacleHealth = 1;
      } else if (char === 'C') {
          obstacle = ObstacleType.CHAINS;
          obstacleHealth = 1;
      } else if (char === 'P') {
          type = RuneType.POTION;
      }

      row.push({
        id: generateId(),
        type,
        status: TileStatus.NORMAL,
        powerUp: PowerUp.NONE,
        obstacle,
        obstacleHealth,
        isEmpty,
        row: r,
        col: c,
      });
    }
    grid.push(row);
  }
  return grid;
};

// Helper to check if a point is within bounds
const isValid = (r: number, c: number) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

export const shuffleBoard = (grid: Grid): Grid => {
  const movableTiles: {type: RuneType, powerUp: PowerUp}[] = [];
  const slots: {r: number, c: number}[] = [];

  for(let r=0; r<BOARD_SIZE; r++){
      for(let c=0; c<BOARD_SIZE; c++){
          const t = grid[r][c];
          if(!t.isEmpty && t.obstacle === ObstacleType.NONE && t.status !== TileStatus.MATCHED && t.type !== RuneType.POTION) {
              movableTiles.push({type: t.type, powerUp: t.powerUp});
              slots.push({r, c});
          }
      }
  }

  for (let i = movableTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [movableTiles[i], movableTiles[j]] = [movableTiles[j], movableTiles[i]];
  }

  const newGrid = grid.map(row => row.map(t => ({...t})));
  
  slots.forEach((slot, index) => {
      newGrid[slot.r][slot.c] = {
          ...newGrid[slot.r][slot.c],
          id: generateId(),
          type: movableTiles[index].type,
          powerUp: movableTiles[index].powerUp,
          status: TileStatus.NEW
      };
  });

  return newGrid;
};

// --- CHECK FOR POSSIBLE MOVES ---
export const hasPossibleMoves = (grid: Grid): boolean => {
    // Clone grid minimalistically to simulate swaps
    const tempGrid = grid.map(row => row.map(t => ({...t})));

    const check = (r: number, c: number) => {
        // Can we swap right?
        if (isValid(r, c+1)) {
            const t1 = tempGrid[r][c];
            const t2 = tempGrid[r][c+1];
            if (!t1.isEmpty && !t2.isEmpty && t1.obstacle !== ObstacleType.STONE && t2.obstacle !== ObstacleType.STONE && t1.obstacle !== ObstacleType.CHAINS && t2.obstacle !== ObstacleType.CHAINS) {
                const type1 = t1.type;
                const type2 = t2.type;
                t1.type = type2;
                t2.type = type1;
                const { matches } = findMatches(tempGrid);
                t1.type = type1;
                t2.type = type2;
                if (matches.length > 0) return true;
            }
        }
        // Can we swap down?
        if (isValid(r+1, c)) {
            const t1 = tempGrid[r][c];
            const t2 = tempGrid[r+1][c];
             if (!t1.isEmpty && !t2.isEmpty && t1.obstacle !== ObstacleType.STONE && t2.obstacle !== ObstacleType.STONE && t1.obstacle !== ObstacleType.CHAINS && t2.obstacle !== ObstacleType.CHAINS) {
                const type1 = t1.type;
                const type2 = t2.type;
                t1.type = type2;
                t2.type = type1;
                const { matches } = findMatches(tempGrid);
                t1.type = type1;
                t2.type = type2;
                if (matches.length > 0) return true;
            }
        }
        return false;
    };

    for(let r=0; r<BOARD_SIZE; r++) {
        for(let c=0; c<BOARD_SIZE; c++) {
            if (check(r,c)) return true;
        }
    }
    return false;
};

// --- OBSTACLE DAMAGE LOGIC (ADJACENT) ---
const damageAdjacentObstacles = (grid: Grid, matches: Tile[]): { grid: Grid, score: number } => {
    const newGrid = grid.map(row => row.map(t => ({...t})));
    let extraScore = 0;
    const damagedIds = new Set<string>();

    const hit = (r: number, c: number) => {
        if (!isValid(r, c)) return;
        const tile = newGrid[r][c];
        
        if (tile.isEmpty || damagedIds.has(tile.id)) return;

        // Break Overlay Obstacles (Ice/Chains) that are adjacent? 
        // Typically Ice/Chains break when the tile INSIDE is matched, handled in main logic.
        // But Stones break on adjacent matches.
        if (tile.obstacle === ObstacleType.STONE && tile.status !== TileStatus.MATCHED) {
            tile.obstacleHealth -= 1;
            damagedIds.add(tile.id);
            extraScore += 20; 
            tile.status = TileStatus.NEW; // Trigger shake/pop animation

            if (tile.obstacleHealth <= 0) {
                tile.obstacle = ObstacleType.NONE;
                tile.type = getRandomRune(); 
                tile.status = TileStatus.NEW;
                extraScore += 40;
            }
        }
    };

    matches.forEach(t => {
        hit(t.row - 1, t.col);
        hit(t.row + 1, t.col);
        hit(t.row, t.col - 1);
        hit(t.row, t.col + 1);

        // Also check if the matched tile itself had an overlay
        const gridTile = newGrid[t.row][t.col];
        if (gridTile.obstacle === ObstacleType.ICE || gridTile.obstacle === ObstacleType.CHAINS) {
             gridTile.obstacle = ObstacleType.NONE;
             extraScore += 30;
        }
    });

    return { grid: newGrid, score: extraScore };
};


// --- RECURSIVE EXPLOSION LOGIC ---
const collectExplosions = (
  grid: Grid, 
  startTiles: Tile[], 
  visitedIds: Set<string> = new Set()
): { tiles: Tile[], score: number } => {
  const tilesToProcess: Tile[] = [];
  const queue = [...startTiles];
  let totalScore = 0;

  while (queue.length > 0) {
    const tile = queue.shift()!;
    
    if (visitedIds.has(tile.id)) continue;
    visitedIds.add(tile.id);
    
    tilesToProcess.push(tile);
    totalScore += 10; 

    if (tile.powerUp !== PowerUp.NONE) {
      totalScore += 20; 
      let targets: {r: number, c: number}[] = [];

      if (tile.powerUp === PowerUp.HORIZONTAL) {
        for (let c = 0; c < BOARD_SIZE; c++) targets.push({ r: tile.row, c });
      } 
      else if (tile.powerUp === PowerUp.VERTICAL) {
        for (let r = 0; r < BOARD_SIZE; r++) targets.push({ r, c: tile.col });
      } 
      else if (tile.powerUp === PowerUp.COLOR_BOMB) {
        const targetType = tile.type === RuneType.WILD ? getRandomRune() : tile.type;
         for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (grid[r][c].type === targetType && grid[r][c].status !== TileStatus.MATCHED && !grid[r][c].isEmpty && grid[r][c].obstacle !== ObstacleType.STONE) {
                    targets.push({r, c});
                }
            }
         }
      } 
      else if (tile.powerUp === PowerUp.NOVA) {
        for (let r = tile.row - 2; r <= tile.row + 2; r++) {
            for (let c = tile.col - 2; c <= tile.col + 2; c++) {
                if (isValid(r, c)) targets.push({ r, c });
            }
        }
      }

      targets.forEach(({r, c}) => {
        const targetTile = grid[r][c];
        // CRITICAL FIX: Ensure Potions are NEVER targeted by explosions
        if (!visitedIds.has(targetTile.id) && 
            targetTile.status !== TileStatus.MATCHED && 
            !targetTile.isEmpty && 
            targetTile.type !== RuneType.POTION) { 
            queue.push(targetTile);
        }
      });
    }
  }

  return { tiles: tilesToProcess, score: totalScore };
};

export const triggerColorBomb = (grid: Grid, bomb: Tile, targetType: RuneType): { grid: Grid, score: number, count: number } => {
    const newGrid = grid.map(row => row.map(tile => ({ ...tile })));
    let score = 0;
    let count = 0;
    
    // Explode the bomb itself
    if (newGrid[bomb.row][bomb.col].status !== TileStatus.MATCHED) {
        newGrid[bomb.row][bomb.col].status = TileStatus.MATCHED;
        newGrid[bomb.row][bomb.col].type = RuneType.WILD;
        score += 200; 
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const tile = newGrid[r][c];
            // Target all runes of type, but NOT stones directly
            // Also explicitly excluding POTION here as a safety measure, though the UI prevents swapping Bomb+Potion
            if (!tile.isEmpty && 
                tile.obstacle === ObstacleType.NONE && 
                tile.type === targetType && 
                tile.type !== RuneType.POTION && 
                tile.status !== TileStatus.MATCHED) {
                newGrid[r][c].status = TileStatus.MATCHED;
                newGrid[r][c].type = RuneType.WILD;
                score += 10; 
                count++;
            }
        }
    }

    return { grid: newGrid, score, count };
};

// --- CLUSTER ANALYSIS ---
const isMatchable = (t: Tile) => !t.isEmpty && t.obstacle !== ObstacleType.STONE && t.type !== RuneType.POTION && t.status !== TileStatus.MATCHED;

const analyzeCluster = (cluster: Tile[]): { 
    width: number, 
    height: number, 
    isLine: boolean, 
    intersectionTile: Tile | null 
} => {
    if (cluster.length === 0) return { width: 0, height: 0, isLine: false, intersectionTile: null };

    const rows = cluster.map(t => t.row);
    const cols = cluster.map(t => t.col);
    const minR = Math.min(...rows);
    const maxR = Math.max(...rows);
    const minC = Math.min(...cols);
    const maxC = Math.max(...cols);

    const width = maxC - minC + 1;
    const height = maxR - minR + 1;
    const isLine = (width === 1) || (height === 1);

    let maxNeighbors = -1;
    let intersectionTile = cluster[0];

    cluster.forEach(t => {
        let n = 0;
        cluster.forEach(other => {
            if (t.id === other.id) return;
            if (Math.abs(t.row - other.row) + Math.abs(t.col - other.col) === 1) n++;
        });
        if (n > maxNeighbors) {
            maxNeighbors = n;
            intersectionTile = t;
        }
    });

    return { width, height, isLine, intersectionTile };
};

export const findMatches = (grid: Grid): { matches: Tile[], score: number, newPowerUps: {r: number, c: number, type: PowerUp}[] } => {
  const matchSet = new Set<Tile>();

  // 1. Basic Scan
  // Horizontal
  for (let r = 0; r < BOARD_SIZE; r++) {
    let run: Tile[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
        const t = grid[r][c];
        if (isMatchable(t)) {
            if (run.length === 0 || run[0].type === t.type) run.push(t);
            else {
                if (run.length >= 3) run.forEach(rt => matchSet.add(rt));
                run = [t];
            }
        } else {
            if (run.length >= 3) run.forEach(rt => matchSet.add(rt));
            run = [];
        }
    }
    if (run.length >= 3) run.forEach(rt => matchSet.add(rt));
  }

  // Vertical
  for (let c = 0; c < BOARD_SIZE; c++) {
    let run: Tile[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        const t = grid[r][c];
        if (isMatchable(t)) {
            if (run.length === 0 || run[0].type === t.type) run.push(t);
            else {
                if (run.length >= 3) run.forEach(rt => matchSet.add(rt));
                run = [t];
            }
        } else {
            if (run.length >= 3) run.forEach(rt => matchSet.add(rt));
            run = [];
        }
    }
    if (run.length >= 3) run.forEach(rt => matchSet.add(rt));
  }

  // 2. Cluster Analysis & PowerUp Creation
  const visited = new Set<string>();
  const newPowerUps: {r: number, c: number, type: PowerUp}[] = [];
  const allInitialMatches = Array.from(matchSet);
  const matchedIds = new Set(allInitialMatches.map(t => t.id));
  const clusterVisited = new Set<string>();
  
  for (const tile of allInitialMatches) {
      if (clusterVisited.has(tile.id)) continue;

      const cluster: Tile[] = [];
      const queue: Tile[] = [tile];
      clusterVisited.add(tile.id);
      cluster.push(tile);

      while (queue.length > 0) {
          const t = queue.shift()!;
          const neighbors = [
              {r: t.row - 1, c: t.col}, {r: t.row + 1, c: t.col},
              {r: t.row, c: t.col - 1}, {r: t.row, c: t.col + 1}
          ];
          for(const n of neighbors) {
              if (isValid(n.r, n.c)) {
                  const neighbor = grid[n.r][n.c];
                  if (matchedIds.has(neighbor.id) && neighbor.type === t.type && !clusterVisited.has(neighbor.id)) {
                      clusterVisited.add(neighbor.id);
                      cluster.push(neighbor);
                      queue.push(neighbor);
                  }
              }
          }
      }

      const count = cluster.length;
      const { width, height, isLine, intersectionTile } = analyzeCluster(cluster);
      let powerType = PowerUp.NONE;

      if (count >= 6) powerType = PowerUp.NOVA;
      else if (count >= 5 && !isLine) powerType = PowerUp.NOVA;
      else if (count === 5 && isLine) powerType = PowerUp.COLOR_BOMB;
      else if (count === 4 && isLine) powerType = (width > height) ? PowerUp.HORIZONTAL : PowerUp.VERTICAL;

      if (powerType !== PowerUp.NONE && intersectionTile) {
          newPowerUps.push({ r: intersectionTile.row, c: intersectionTile.col, type: powerType });
      }
  }

  // 3. Explosion Propagation (handles blast radius of matched powerups)
  const { tiles: finalTilesToClear, score } = collectExplosions(grid, allInitialMatches);
  
  const powerUpLocs = new Set(newPowerUps.map(p => `${p.r},${p.c}`));
  // Exclude new powerup locations from being destroyed this turn
  const cleanTilesToClear = finalTilesToClear.filter(t => !powerUpLocs.has(`${t.row},${t.col}`));

  return { matches: cleanTilesToClear, score, newPowerUps };
};

export const handleMatches = (
    grid: Grid, 
    matches: Tile[], 
    newPowerUps: {r: number, c: number, type: PowerUp}[]
): { grid: Grid, scoreBonus: number } => {
  let activeGrid = grid.map(row => row.map(tile => ({ ...tile })));
  let scoreBonus = 0;

  // 1. Process "Hits" on Tiles
  matches.forEach(tile => {
    const currentTile = activeGrid[tile.row][tile.col];

    // CRITICAL FIX: If it's a stone, damage it instead of destroying it
    // Unless it's already marked as matched (to avoid double processing)
    if (currentTile.obstacle === ObstacleType.STONE) {
        if (currentTile.status !== TileStatus.MATCHED) {
            currentTile.obstacleHealth -= 1;
            currentTile.status = TileStatus.NEW; // Trigger shake
            scoreBonus += 20;

            if (currentTile.obstacleHealth <= 0) {
                currentTile.obstacle = ObstacleType.NONE;
                currentTile.type = getRandomRune(); 
                currentTile.status = TileStatus.MATCHED; // Mark for clearing
                currentTile.type = RuneType.WILD;
                scoreBonus += 40;
            }
        }
    } else {
        // Normal tile or Ice/Chains (which are overlays and break instantly on match)
        currentTile.status = TileStatus.MATCHED;
        currentTile.type = RuneType.WILD;
        
        // Break overlays if they exist on the matched tile
        if (currentTile.obstacle === ObstacleType.ICE || currentTile.obstacle === ObstacleType.CHAINS) {
            currentTile.obstacle = ObstacleType.NONE;
            scoreBonus += 30;
        }
    }
  });

  // 2. Create PowerUps (Overrides any destruction status)
  newPowerUps.forEach(p => {
    activeGrid[p.r][p.c].status = TileStatus.NEW; 
    activeGrid[p.r][p.c].powerUp = p.type;
    activeGrid[p.r][p.c].type = grid[p.r][p.c].type; 
    activeGrid[p.r][p.c].obstacle = ObstacleType.NONE; // Powerup replaces obstacles if created there
  });

  // 3. Damage Neighbors (Chain Reaction for adjacent stones)
  // We only pass tiles that were ACTUALLY effectively matched/destroyed to damage neighbors
  // If a stone took damage but survived, it doesn't trigger neighbor damage (usually)
  const effectivelyMatched = matches.filter(t => {
      const gT = activeGrid[t.row][t.col];
      return gT.status === TileStatus.MATCHED || gT.powerUp !== PowerUp.NONE; 
  });

  const { grid: damagedGrid, score: obstacleScore } = damageAdjacentObstacles(activeGrid, effectivelyMatched);
  activeGrid = damagedGrid;
  scoreBonus += obstacleScore;

  return { grid: activeGrid, scoreBonus };
};

export const applyGravity = (
    grid: Grid, 
    potionCountCb?: (r: number, c: number) => void,
    shouldSpawnPotion?: boolean
): { grid: Grid, collectedCount: number } => {
  const finalGrid = grid.map(row => row.map(t => ({...t})));
  let collectedCount = 0;
  
  // Track if we have already spawned a potion this turn to prevent "Potion Floods"
  let hasSpawnedPotionThisTurn = false;

  for (let c = 0; c < BOARD_SIZE; c++) {
      const colTiles: Tile[] = [];
      const structure: ('EMPTY' | 'STONE' | 'SLOT')[] = []; 

      for(let r=0; r<BOARD_SIZE; r++) {
          if (grid[r][c].isEmpty) structure.push('EMPTY');
          else if (grid[r][c].obstacle === ObstacleType.STONE) structure.push('STONE');
          else structure.push('SLOT');

          // Collect falling tiles
          if (!grid[r][c].isEmpty && grid[r][c].obstacle !== ObstacleType.STONE && grid[r][c].status !== TileStatus.MATCHED) {
              colTiles.push(grid[r][c]);
          }
      }

      let tileIdx = colTiles.length - 1;
      
      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
          if (structure[r] === 'EMPTY' || structure[r] === 'STONE') {
              finalGrid[r][c] = { ...grid[r][c] };
          } else {
              // We need to fill this slot
              if (tileIdx >= 0) {
                  // Existing tile falling down
                  const tile = colTiles[tileIdx];
                  const isBottom = (r === BOARD_SIZE - 1) || (structure[r+1] === 'EMPTY'); // Simple bottom check
                  
                  // Potion Collection Logic
                  if (tile.type === RuneType.POTION && r === BOARD_SIZE - 1) { // Only collect at very bottom row for simplicity
                      collectedCount++;
                      if (potionCountCb) potionCountCb(r, c);
                      // Don't place this tile, consume it.
                      tileIdx--; 
                      
                      // We need to fill THIS slot `r` now with the next available or new
                      if (tileIdx >= 0) {
                           // Pull next
                           const nextTile = colTiles[tileIdx];
                           finalGrid[r][c] = { ...nextTile, row: r, col: c, status: TileStatus.DROPPING };
                           tileIdx--;
                      } else {
                           // Generate new
                           finalGrid[r][c] = generateNewTile(r, c, shouldSpawnPotion && !hasSpawnedPotionThisTurn);
                           if (finalGrid[r][c].type === RuneType.POTION) hasSpawnedPotionThisTurn = true;
                      }
                  } else {
                      finalGrid[r][c] = { ...tile, row: r, col: c, status: TileStatus.DROPPING };
                      tileIdx--;
                  }
              } else {
                  // Generate New Tile
                  finalGrid[r][c] = generateNewTile(r, c, shouldSpawnPotion && !hasSpawnedPotionThisTurn);
                  if (finalGrid[r][c].type === RuneType.POTION) hasSpawnedPotionThisTurn = true;
              }
          }
      }
  }

  return { grid: finalGrid, collectedCount };
};

const generateNewTile = (r: number, c: number, allowPotion: boolean | undefined): Tile => {
    let type = getRandomRune();
    // 25% chance to spawn potion IF allowed and not already spawned this frame
    if (allowPotion && Math.random() < 0.25) {
        type = RuneType.POTION;
    }

    return {
        id: generateId(),
        type,
        status: TileStatus.NEW,
        powerUp: PowerUp.NONE,
        obstacle: ObstacleType.NONE,
        obstacleHealth: 0,
        isEmpty: false,
        row: r,
        col: c
    };
};

export const resetStatus = (grid: Grid): Grid => {
    return grid.map(row => row.map(tile => ({
        ...tile,
        status: TileStatus.NORMAL
    })));
};
