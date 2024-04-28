import Board from "./board.js";
import Units from "../units.js";
import { createDepots } from "./depot.js";
import { createWalls } from "./wall.js";
import { createZones } from "./zone.js";

class Map {

  create(gameInfo) {
    this.left = gameInfo.startRaw.playableArea.p0.x;
    this.top = gameInfo.startRaw.playableArea.p0.y;
    this.right = gameInfo.startRaw.playableArea.p1.x;
    this.bottom = gameInfo.startRaw.playableArea.p1.y;

    this.gameInfo = null;
    this.gameLoop = 0;
    this.loop = 0;

    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.board = new Board(this, gameInfo.startRaw.placementGrid, gameInfo.startRaw.pathingGrid);

    clearInitialPathing(this.board);

    this.board.path();

    markResources(this.board);

    const base = Units.buildings().values().next().value;

    createDepots(this.board, Units.resources().values(), base);
    createZones(this.board);
    createWalls(this.board, base);
  }

  sync(gameInfoOrEnforce, gameLoop) {
    if ((gameInfoOrEnforce === true) && (this.loop !== this.gameLoop)) {
      this.board.sync(this.gameInfo.startRaw.pathingGrid);

      this.loop = this.gameLoop;
    } else if (gameInfoOrEnforce && (gameLoop > 0)) {
      this.gameInfo = gameInfoOrEnforce;
      this.gameLoop = gameLoop;
    }
  }

  zone(x, y) {
    return this.board.cells[Math.floor(y)][Math.floor(x)].zone;
  }

  canPlace(zone, x, y, size) {
    this.sync(true);

    x = Math.floor(x);
    y = Math.floor(y);

    const cells = this.board.cells;
    const head = Math.floor(size / 2);
    const tail = Math.floor((size - 1) / 2);
    const minx = x - head;
    const maxx = x + tail;
    const miny = y - head;
    const maxy = y + tail;

    for (let row = miny; row <= maxy; row++) {
      const line = cells[row];

      for (let col = minx; col <= maxx; col++) {
        const cell = line[col];

        if ((cell.zone !== zone) || !canBuildOn(cell)) {
          return false;
        }
      }
    }

    return true;
  }

  show() {
    for (const line of this.board.cells) {
      const text = [];

      for (const cell of line) {
        if (!cell.isPath) {
          text.push("#");
        } else if (cell.isObstacle) {
          text.push("X");
        } else if (!cell.isPlot) {
          text.push("/");
        } else {
          text.push(" ");
        }
      }

      console.log(text.join(""));
    }
  }
}

function clearInitialPathing(board) {
  for (const building of Units.buildings().values()) {
    if (building.type.isBuilding) {
      board.clear(building.body.x - 2.5, building.body.y - 2.5, 5, 5);
    }
  }

  for (const unit of Units.resources().values()) {
    const x = Math.floor(unit.body.x);
    const y = Math.floor(unit.body.y);

    if (unit.type.isMinerals) {
      board.clear(x - 1, y, 2, 1);
    } else if (unit.type.isVespene) {
      board.clear(x - 1, y - 1, 3, 3);
    }
  }
}

function markResources(board) {
  for (const unit of Units.resources().values()) {
    const x = Math.floor(unit.body.x);
    const y = Math.floor(unit.body.y);

    if (unit.type.isMinerals) {
      board.mark(x - 1, y, 2, 1, cell => (cell.isObstacle = true));
    } else if (unit.type.isVespene) {
      board.mark(x - 1, y - 1, 3, 3, cell => (cell.isObstacle = true));
    } else {
      board.mark(x, y, 1, 1, cell => (cell.isObstacle = true));
    }

    unit.cell = board.cells[y][x];
  }
}

function canBuildOn(cell) {
  return cell.isPlot && cell.isPath && !cell.isObstacle;
}

export default new Map();
