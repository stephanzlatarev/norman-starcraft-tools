
const TRACE = false;
const SPAN = 8;

// TODO: Optimize the function and make it a method on Corridor to create a wall blueprint
export function createWalls(board, base) {
  const blueprint = {
    left: null,
    center: null,
    right: null,
    pylon: null,
    battery: null,
  };

  // There must be exactly one corridor out of the base, leading to the natural
  if (TRACE) console.log("base:", !!base.depot);
  if (!base.depot || !base.depot.corridors || (base.depot.corridors.length !== 1)) return;

  const corridorToNatural = base.depot.corridors[0];

  // The corridor to the natural must connect exactly two zones, leading to the natural
  if (TRACE) console.log("corridor to natural:", !!corridorToNatural);
  if (!corridorToNatural || !corridorToNatural.zones || (corridorToNatural.zones.length !== 2)) return;

  const natural = corridorToNatural.zones.find(zone => (zone !== base.depot));

  // There must be exactly two corridors out of the natural, one from the natural and one to be walled
  if (TRACE) console.log("natural:", !!natural);
  if (!natural || !natural.corridors || (natural.corridors.length !== 2)) return;

  const corridorToWall = natural.corridors.find(corridor => (corridor !== corridorToNatural));

  if (TRACE) console.log("corridor to wall:", !!corridorToWall);
  if (!corridorToWall) return;

  const grid = createGrid(board, corridorToWall);
  const direction = calculateDirection(natural, corridorToWall);

  if (TRACE) showGrid(grid);

  // Extract the border positions for a building of size 3
  const borderLine = [];
  for (let direction = 0; direction <= 3; direction++) {
    populateBorderLine(grid, borderLine, 3, direction);
  }

  // Split the border positions into two curves
  const split = splitBorderLine(borderLine);

  if (TRACE) { fillGrid(grid, "L", split.left); fillGrid(grid, "R", split.right); showGrid(grid); fillGrid(grid, " ", split.left); fillGrid(grid, " ", split.right); }

  // Find one position from each curve where the distance between them is the shortest distance
  populateWallWings(blueprint, split.left, split.right);

  if (!blueprint.left || !blueprint.right) return;
  if (TRACE) { fillGrid(grid, "L", [blueprint.left], 1); fillGrid(grid, "R", [blueprint.right], 1); showGrid(grid); }

  // Find one position where distance from left and right wings is 3 and 4
  blueprint.center = selectCenterWing(blueprint.left, blueprint.right);
  if (!blueprint.center) {
    blueprint.center = selectCenterWing(blueprint.right, blueprint.left);

    if (blueprint.center) {
      // Make sure the passage is between the center and right wing
      const swap = blueprint.left;
      blueprint.left = blueprint.right;
      blueprint.right = swap;
    }
  }

  if (!blueprint.center) return;
  if (TRACE) { fillGrid(grid, "C", [blueprint.center], 1); showGrid(grid); }

  // Mark grid with wall wings and path in between
  fillGrid(grid, "/", [blueprint.right], 3);
  fillGrid(grid, "#", [blueprint.left, blueprint.center, blueprint.right], 1);

  if (TRACE) showGrid(grid);

  blueprint.battery = selectSupport(grid, blueprint, direction, 6);
  if (!blueprint.battery) return;

  fillGrid(grid, "@", [blueprint.battery], 0, 0, 1, 1);

  blueprint.pylon = selectSupport(grid, blueprint, direction, 6.5);
  if (!blueprint.pylon) return;

  fillGrid(grid, "O", [blueprint.pylon], 0, 0, 1, 1);
  
  if (TRACE) showGrid(grid);

  setBlueprintToCorridor(corridorToWall, blueprint);

  markBlueprint(board, blueprint);
}

function setBlueprintToCorridor(corridor, blueprint) {
  blueprint.left.x += corridor.x - SPAN + 0.5;
  blueprint.left.y += corridor.y - SPAN + 0.5;
  blueprint.center.x += corridor.x - SPAN + 0.5;
  blueprint.center.y += corridor.y - SPAN + 0.5;
  blueprint.right.x += corridor.x - SPAN + 0.5;
  blueprint.right.y += corridor.y - SPAN + 0.5;
  blueprint.pylon.x += corridor.x - SPAN + 1;
  blueprint.pylon.y += corridor.y - SPAN + 1;
  blueprint.battery.x += corridor.x - SPAN + 1;
  blueprint.battery.y += corridor.y - SPAN + 1;

  corridor.wall = blueprint;
}

function markBlueprint(board, blueprint) {
  board.mark(blueprint.left.x - 1.5, blueprint.left.y - 1.5, 3, 3, cell => (cell.isMarked = true));
  board.mark(blueprint.center.x - 1.5, blueprint.center.y - 1.5, 3, 3, cell => (cell.isMarked = true));
  board.mark(blueprint.right.x - 1.5, blueprint.right.y - 1.5, 3, 3, cell => (cell.isMarked = true));
  board.mark(blueprint.pylon.x - 1, blueprint.pylon.y - 1, 2, 2, cell => (cell.isMarked = true));
  board.mark(blueprint.battery.x - 1, blueprint.battery.y - 1, 2, 2, cell => (cell.isMarked = true));
}

function createGrid(board, corridor) {
  const minx = corridor.x - SPAN;
  const maxx = corridor.x + SPAN;
  const miny = corridor.y - SPAN;
  const maxy = corridor.y + SPAN;

  const grid = [];

  for (let row = miny; row <= maxy; row++) {
    const line = [];

    for (let col = minx; col <= maxx; col++) {
      const cell = board.cells[row][col];

      if (cell.isPlot) {
        line.push(" ");
      } else if (cell.isPath) {
        line.push("/");
      } else {
        line.push("X");
      }
    }

    grid.push(line);
  }

  return grid;
}

function populateBorderLine(grid, borderLine, blockSize, direction) {
  if ((grid.length <= 3) || (grid[0].length <= 3)) return;

  const plot = grid.map(line => line.map(cell => ((cell === " ") ? 1 : 0)));
  const path = grid.map(line => line.map(cell => ((cell !== "X") ? 1 : 0)));

  const blockCenterX = Math.ceil(blockSize / 2) - 1;
  const blockCenterY = Math.ceil(blockSize / 2) - 1;

  let rowStart = 1;
  let rowStep = 1;
  let rowEnd = grid.length - 2;
  let colStart = 1;
  let colStep = 1;
  let colEnd = grid[0].length - 2;

  if ((direction === 1) || (direction === 3)) {
    rowStart = grid.length - 2;
    rowStep = -1;
    rowEnd = 1;
  }

  if ((direction === 2) || (direction === 3)) {
    colStart = grid[0].length - 2;
    colStep = -1;
    colEnd = 1;
  }

  for (let row = rowStart; row !== rowEnd; row += rowStep) {
    for (let col = colStart; col !== colEnd; col += colStep) {
      if (grid[row][col] === " ") {
        const max = Math.min(plot[row - rowStep][col], plot[row][col - colStep]);
        const inc = (grid[row - max * rowStep][col - max * colStep] === " ") ? 1 : 0;

        plot[row][col] = max + inc;
      }

      if (grid[row][col] !== "X") {
        const max = Math.min(path[row - rowStep][col], path[row][col - colStep]);
        const inc = (grid[row - max * rowStep][col - max * colStep] !== "X") ? 1 : 0;

        path[row][col] = max + inc;

        // Allow for borderline slots
        if ((path[row][col] === blockSize) && (path[row - rowStep][col] === blockSize) && (path[row][col - colStep] === blockSize)) {
          plot[row][col] = blockSize + 1;
        }
      }
    }
  }

  for (let row = rowStart; row !== rowEnd; row += rowStep) {
    for (let col = colStart; col !== colEnd; col += colStep) {
      if (plot[row][col] !== blockSize) continue;

      // Suppress borderline slots that connect to the end of the grid
      if ((row === rowStart + rowStep) || (col === colStart + colStep)) continue;

      // Suppress borderline slots for buildings that do not connect a side to the border, but only touch the corner
      if ((plot[row - rowStep][col] === blockSize) && (plot[row][col - colStep] === blockSize)) continue;

      // Suppress non-borderline slots
      if (path[row][col] > blockSize) continue;

      borderLine.push({
        x: col - blockCenterX * colStep,
        y: row - blockCenterY * rowStep,
      });
    }
  }
}

function splitBorderLine(line) {
  const cluster = new Set();

  let pending = [];
  let wave = new Set();

  // Add unique items to the pending list
  for (const one of line) {
    if (!pending.find(p => ((p.x === one.x) && (p.y === one.y)))) {
      pending.push(one);
    }
  }

  // Select one item to start the split
  const start = pending[0];
  cluster.add(start);
  wave.add(start);

  while (wave.size) {
    const nextWave = new Set();
    const stillPending = new Set();

    for (const other of pending) {
      let processed = false;

      for (const one of wave) {
        if ((Math.abs(one.x - other.x) < 3) && (Math.abs(one.y - other.y) < 3)) {
          cluster.add(other);
          nextWave.add(other);

          processed = true;
          break;
        }
      }

      if (!processed) {
        stillPending.add(other);
      }
    }

    wave = nextWave;
    pending = stillPending;
  }

  return {
    right: cluster,
    left: pending,
  };
}

function populateWallWings(blueprint, leftBorderLine, rightBorderLine) {
  let bestDistance = Infinity;
  let bestLeft = null;
  let bestRight = null;

  for (const left of leftBorderLine) {
    for (const right of rightBorderLine) {
      const distance = (left.x - right.x) * (left.x - right.x) + (left.y - right.y) * (left.y - right.y);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestLeft = left;
        bestRight = right;
      }
    }
  }

  blueprint.left = bestLeft;
  blueprint.right = bestRight;
}

function selectCenterWing(leftWing, rightWing) {
  for (let x = leftWing.x - 2; x <= leftWing.x + 2; x++) {
    // Check if center wing can be on top of left wing
    if (isWallingWing(x, leftWing.y - 3, rightWing)) return { x: x, y: leftWing.y - 3 };

    // Check if center wing can be on bottom of left wing
    if (isWallingWing(x, leftWing.y + 3, rightWing)) return { x: x, y: leftWing.y + 3 };
  }

  for (let y = leftWing.y - 2; y <= leftWing.y + 2; y++) {
    // Check if center wing can be on left of left wing
    if (isWallingWing(leftWing.x - 3, y, rightWing)) return { x: leftWing.x - 3, y: y };

    // Check if center wing can be on right of left wing
    if (isWallingWing(leftWing.x + 3, y, rightWing)) return { x: leftWing.x + 3, y: y };
  }
}

function isWallingWing(x, y, wing) {
  const dh = Math.abs(x - wing.x);
  const dv = Math.abs(y - wing.y);

  return ((dh === 4) && (dv < 3)) || ((dv === 4) && (dh < 3));
}

function selectSupport(grid, blueprint, direction, range) {
  for (let row = 1; row < grid.length - 1; row++) {
    for (let col = 1; col < grid[row].length - 1; col++) {
      if (canPlaceSupport(grid, col, row) && isGoodPlaceForSupport(col, row, blueprint, direction, range)) {
        return { x: col, y: row };
      }
    }
  }
}

function calculateDirection(a, b) {
  return { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
}

function canPlaceSupport(grid, x, y) {
  return ((grid[y][x] === " ") && (grid[y + 1][x] === " ") && (grid[y][x + 1] === " ") && (grid[y + 1][x + 1] === " "));
}

function isGoodPlaceForSupport(x, y, blueprint, direction, range) {
  const squareRange = (range + 0.5) * (range + 0.5);
  const cx = x + 1;
  const cy = y + 1;

  for (const wing of [blueprint.left, blueprint.center, blueprint.right]) {
    // Check if distance is ok
    const dx = wing.x + 0.5 - cx;
    const dy = wing.y + 0.5 - cy;

    if (dx * dx + dy * dy >= squareRange) return false;
  }

  // Check if the support is in the proper direction
  if ((direction.x > 0) && (blueprint.center.x < x)) return false;
  if ((direction.x < 0) && (blueprint.center.x > x)) return false;
  if ((direction.y > 0) && (blueprint.center.y < y)) return false;
  if ((direction.y < 0) && (blueprint.center.y > y)) return false;

  return true;
}

function fillGrid(grid, symbol, list, rl, rt, rr, rb) {
  rl = rl || 0;
  rt = rt || rl;
  rr = rr || rl;
  rb = rb || rt;

  for (const one of list) {
    for (let x = one.x - rl; x <= one.x + rr; x++) {
      for (let y = one.y - rt; y <= one.y + rb; y++) {
        grid[y][x] = symbol;
      }
    }
  }
}

function showGrid(grid) {
  console.log();

  for (const line of grid) {
    const text = [];

    for (const cell of line) {
      text.push(cell);
    }

    console.log(text.join(" "));
  }

  console.log();
}
