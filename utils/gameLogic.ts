
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
    // We only need types and obstacles
    const tempGrid = grid.map(row => row.map(t => ({...t})));

    const check = (r: number, c: number) => {
        // Can we swap right?
        if (isValid(r, c+1)) {
            const t1 = tempGrid[r][c];
            const t2 = tempGrid[r][c+1];
            if (!t1.isEmpty && !t2.isEmpty && t1.obstacle !== ObstacleType.STONE && t2.obstacle !== ObstacleType.STONE && t1.obstacle !== ObstacleType.CHAINS && t2.obstacle !== ObstacleType.CHAINS) {
                // Swap types
                const type1 = t1.type;
                const type2 = t2.type;
                t1.type = type2;
                t2.type = type1;
                
                // Check match
                const { matches } = findMatches(tempGrid);
                
                // Swap back
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
                // Swap types
                const type1 = t1.type;
                const type2 = t2.type;
                t1.type = type2;
                t2.type = type1;
                
                // Check match
                const { matches } = findMatches(tempGrid);
                
                // Swap back
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

// --- OBSTACLE DAMAGE LOGIC ---
const damageObstacles = (grid: Grid, matches: Tile[]): { grid: Grid, score: number } => {
    const newGrid = grid.map(row => row.map(t => ({...t})));
    let extraScore = 0;
    const damagedIds = new Set<string>();

    const hit = (r: number, c: number) => {
        if (!isValid(r, c)) return;
        const tile = newGrid[r][c];
        
        if (tile.isEmpty || damagedIds.has(tile.id)) return;

        if (tile.obstacle === ObstacleType.STONE && tile.status !== TileStatus.MATCHED) {
            tile.obstacleHealth -= 1;
            damagedIds.add(tile.id);
            extraScore += 20; // SCORE BALANCE: Moderate points for hitting obstacles
            tile.status = TileStatus.NEW; 

            if (tile.obstacleHealth <= 0) {
                tile.obstacle = ObstacleType.NONE;
                tile.type = getRandomRune(); 
                tile.status = TileStatus.NEW;
                extraScore += 40; // SCORE BALANCE: Bonus for destroying
            }
        }
    };

    matches.forEach(t => {
        hit(t.row - 1, t.col);
        hit(t.row + 1, t.col);
        hit(t.row, t.col - 1);
        hit(t.row, t.col + 1);

        const gridTile = newGrid[t.row][t.col];
        if (gridTile.obstacle === ObstacleType.ICE || gridTile.obstacle === ObstacleType.CHAINS) {
             gridTile.obstacle = ObstacleType.NONE;
             extraScore += 30; // SCORE BALANCE
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
  const tilesToDestroy: Tile[] = [];
  const queue = [...startTiles];
  let totalScore = 0;

  while (queue.length > 0) {
    const tile = queue.shift()!;
    
    if (visitedIds.has(tile.id)) continue;
    visitedIds.add(tile.id);
    
    tilesToDestroy.push(tile);
    // SCORE BALANCE: Base score per tile. 
    // 10 points is standard. A match-3 = 30 pts.
    totalScore += 10; 

    if (tile.powerUp !== PowerUp.NONE) {
      totalScore += 20; // Bonus for destroying a powerup itself
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
        // Nova is 5x5 area (Radius 2)
        for (let r = tile.row - 2; r <= tile.row + 2; r++) {
            for (let c = tile.col - 2; c <= tile.col + 2; c++) {
                if (isValid(r, c)) targets.push({ r, c });
            }
        }
      }

      targets.forEach(({r, c}) => {
        const targetTile = grid[r][c];
        if (!visitedIds.has(targetTile.id) && targetTile.status !== TileStatus.MATCHED && !targetTile.isEmpty) {
            queue.push(targetTile);
        }
      });
    }
  }

  return { tiles: tilesToDestroy, score: totalScore };
};

export const triggerColorBomb = (grid: Grid, bomb: Tile, targetType: RuneType): { grid: Grid, score: number, count: number } => {
    const newGrid = grid.map(row => row.map(tile => ({ ...tile })));
    let score = 0;
    let count = 0;
    
    if (newGrid[bomb.row][bomb.col].status !== TileStatus.MATCHED) {
        newGrid[bomb.row][bomb.col].status = TileStatus.MATCHED;
        newGrid[bomb.row][bomb.col].type = RuneType.WILD;
        score += 200; // Big bonus, but not game-breaking
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const tile = newGrid[r][c];
            if (!tile.isEmpty && tile.obstacle === ObstacleType.NONE && tile.type === targetType && tile.status !== TileStatus.MATCHED) {
                newGrid[r][c].status = TileStatus.MATCHED;
                newGrid[r][c].type = RuneType.WILD;
                score += 10; 
                count++;
            }
        }
    }

    return { grid: newGrid, score, count };
};

// --- ADVANCED CLUSTER MATCHING SYSTEM ---

// Identify matchable tiles
const isMatchable = (t: Tile) => !t.isEmpty && t.obstacle !== ObstacleType.STONE && t.type !== RuneType.POTION && t.status !== TileStatus.MATCHED;

// BFS to find connected component of same-colored tiles
const getCluster = (startTile: Tile, grid: Grid, visited: Set<string>): Tile[] => {
    const cluster: Tile[] = [];
    const queue: Tile[] = [startTile];
    const type = startTile.type;
    visited.add(startTile.id);
    cluster.push(startTile);

    while(queue.length > 0) {
        const t = queue.shift()!;
        const neighbors = [
            {r: t.row - 1, c: t.col}, {r: t.row + 1, c: t.col},
            {r: t.row, c: t.col - 1}, {r: t.row, c: t.col + 1}
        ];

        for(const n of neighbors) {
            if(isValid(n.r, n.c)) {
                const neighbor = grid[n.r][n.c];
                // Check if matchable, same type, not visited, and IS PART OF A MATCH (pre-flagged by basic scan)
                // Actually, we should just check type similarity for now, but to ensure we only group actual matches,
                // we'll rely on the input 'matches' set to filter initially.
                if(isMatchable(neighbor) && neighbor.type === type && !visited.has(neighbor.id)) {
                    visited.add(neighbor.id);
                    cluster.push(neighbor);
                    queue.push(neighbor);
                }
            }
        }
    }
    return cluster;
};

// Determine geometric properties of a cluster
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

    // A cluster is a "line" if it has thickness 1 in either dimension
    const isLine = (width === 1) || (height === 1);

    // Find Intersection (Pivot)
    // The tile with the most neighbors in the cluster is likely the intersection/center
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

  // 1. Basic Scan: Identify tiles that form at least a 3-match
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

  // 2. Cluster Analysis (BFS)
  // Group all matched tiles into connected components
  const visited = new Set<string>();
  const newPowerUps: {r: number, c: number, type: PowerUp}[] = [];
  const allInitialMatches = Array.from(matchSet);
  const matchedIds = new Set(allInitialMatches.map(t => t.id));

  // We need to run BFS only on tiles that are in 'matchSet'
  const clusterVisited = new Set<string>();
  
  for (const tile of allInitialMatches) {
      if (clusterVisited.has(tile.id)) continue;

      // Custom BFS that only traverses neighbors if they are ALSO in matchSet
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

      // 3. Determine PowerUp Logic based on Cluster Geometry
      const count = cluster.length;
      const { width, height, isLine, intersectionTile } = analyzeCluster(cluster);
      
      let powerType = PowerUp.NONE;

      // RULES IMPLEMENTATION
      
      // Rule 1: Match 6+ (Any Shape) -> Supreme Power (Nova/Area)
      if (count >= 6) {
          powerType = PowerUp.NOVA;
      }
      // Rule 2: Match 5 (L, T, Cross) -> Area Power (Nova)
      else if (count >= 5 && !isLine) {
          powerType = PowerUp.NOVA;
      }
      // Rule 3: Match 5 (Linear) -> Color Bomb
      else if (count === 5 && isLine) {
          powerType = PowerUp.COLOR_BOMB;
      }
      // Rule 4: Match 4 (Linear) -> Directional
      else if (count === 4 && isLine) {
          // Determine orientation
          // Horizontal match creates VERTICAL blaster usually (mechanic choice)
          powerType = (width > height) ? PowerUp.HORIZONTAL : PowerUp.VERTICAL; 
      }

      if (powerType !== PowerUp.NONE && intersectionTile) {
          newPowerUps.push({ r: intersectionTile.row, c: intersectionTile.col, type: powerType });
      }
  }

  const { tiles: finalTilesToClear, score } = collectExplosions(grid, allInitialMatches);
  
  // Filter out tiles that will become powerups so they don't get destroyed by the explosion logic immediately
  const powerUpLocs = new Set(newPowerUps.map(p => `${p.r},${p.c}`));
  const cleanTilesToClear = finalTilesToClear.filter(t => !powerUpLocs.has(`${t.row},${t.col}`));

  return { matches: cleanTilesToClear, score, newPowerUps };
};

export const handleMatches = (
    grid: Grid, 
    matches: Tile[], 
    newPowerUps: {r: number, c: number, type: PowerUp}[]
): { grid: Grid, scoreBonus: number } => {
  let activeGrid = grid.map(row => row.map(tile => ({ ...tile })));
  
  // 1. Mark matched tiles
  matches.forEach(tile => {
    activeGrid[tile.row][tile.col].status = TileStatus.MATCHED;
    activeGrid[tile.row][tile.col].type = RuneType.WILD;
  });

  // 2. Create PowerUps
  newPowerUps.forEach(p => {
    activeGrid[p.r][p.c].status = TileStatus.NEW; 
    activeGrid[p.r][p.c].powerUp = p.type;
    activeGrid[p.r][p.c].type = grid[p.r][p.c].type; 
  });

  // 3. Damage Obstacles adjacent to matches
  const { grid: damagedGrid, score: obstacleScore } = damageObstacles(activeGrid, matches);
  activeGrid = damagedGrid;

  return { grid: activeGrid, scoreBonus: obstacleScore };
};

export const applyGravity = (
    grid: Grid, 
    potionCountCb?: (r: number, c: number) => void,
    shouldSpawnPotion?: boolean
): { grid: Grid, collectedCount: number } => {
  const finalGrid = grid.map(row => row.map(t => ({...t})));
  let collectedCount = 0;
  
  for (let c = 0; c < BOARD_SIZE; c++) {
      const colTiles: Tile[] = [];
      const structure: ('EMPTY' | 'STONE' | 'SLOT')[] = []; 

      for(let r=0; r<BOARD_SIZE; r++) {
          if (grid[r][c].isEmpty) structure.push('EMPTY');
          else if (grid[r][c].obstacle === ObstacleType.STONE) structure.push('STONE');
          else structure.push('SLOT');

          if (!grid[r][c].isEmpty && grid[r][c].obstacle !== ObstacleType.STONE && grid[r][c].status !== TileStatus.MATCHED) {
              colTiles.push(grid[r][c]);
          }
      }

      let tileIdx = colTiles.length - 1;
      let potionsSpawnedInColumn = 0;
      
      for (let r = BOARD_SIZE - 1; r >= 0; r--) {
          if (structure[r] === 'EMPTY') {
              finalGrid[r][c] = { ...grid[r][c] };
          } else if (structure[r] === 'STONE') {
              finalGrid[r][c] = { ...grid[r][c] };
          } else {
              if (tileIdx >= 0) {
                  const tile = colTiles[tileIdx];
                  const isBottom = (r === BOARD_SIZE - 1) || (structure[r+1] === 'EMPTY');
                  
                  if (tile.type === RuneType.POTION && isBottom) {
                      collectedCount++;
                      if (potionCountCb) potionCountCb(r, c);
                      tileIdx--; 
                      if (tileIdx >= 0) {
                          const nextTile = colTiles[tileIdx];
                          finalGrid[r][c] = { ...nextTile, row: r, col: c, status: TileStatus.DROPPING };
                          tileIdx--;
                      } else {
                          finalGrid[r][c] = {
                            id: generateId(),
                            type: getRandomRune(),
                            status: TileStatus.NEW,
                            powerUp: PowerUp.NONE,
                            obstacle: ObstacleType.NONE,
                            obstacleHealth: 0,
                            isEmpty: false,
                            row: r,
                            col: c
                        };
                      }
                  } else {
                      finalGrid[r][c] = { ...tile, row: r, col: c, status: TileStatus.DROPPING };
                      tileIdx--;
                  }
              } else {
                  let type = getRandomRune();
                  if (shouldSpawnPotion && potionsSpawnedInColumn === 0 && Math.random() < 0.25) {
                      type = RuneType.POTION;
                      potionsSpawnedInColumn++;
                  }

                  finalGrid[r][c] = {
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
              }
          }
      }
  }

  return { grid: finalGrid, collectedCount };
};

export const resetStatus = (grid: Grid): Grid => {
    return grid.map(row => row.map(tile => ({
        ...tile,
        status: TileStatus.NORMAL
    })));
};
