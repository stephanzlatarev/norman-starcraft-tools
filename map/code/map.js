import Board from "./board.js";
import Corridor from "./corridor.js";
import Hub from "./hub.js";
import Zone from "./zone.js";
import Units from "../units.js";
import { createDepots } from "./depot.js";
import { createWalls } from "./wall.js";

class Map {

  sync(gameInfo) {
    this.left = gameInfo.startRaw.playableArea.p0.x;
    this.top = gameInfo.startRaw.playableArea.p0.y;
    this.right = gameInfo.startRaw.playableArea.p1.x;
    this.bottom = gameInfo.startRaw.playableArea.p1.y;

    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.board = new Board(this, gameInfo.startRaw.placementGrid, gameInfo.startRaw.pathingGrid);

    clearInitialPathing(this.board);

    this.board.path();

    markResources(this.board);

    const base = Units.buildings().values().next().value;

    createDepots(this.board, Units.resources().values(), base);
    createZones(this.board);
    markZones(this.board);

    createWalls(this.board, base);
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

export function createZones(board) {
  const zones = {};

  for (const area of board.areas) {
    if (area.depot) {
      zones[area.id] = area.depot;
    } else {
      zones[area.id] = new Hub(area.center.x, area.center.y, area.center.margin);
    }
  }

  for (const join of board.joins) {
    const corridor = new Corridor(join.center.x, join.center.y, join.center.margin);

    for (const area of join.areas) {
      const zone = zones[area.id];

      zone.corridors.push(corridor);
      corridor.zones.push(zone);
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

function markZones(board) {
  for (const zone of Zone.list()) {
    if (zone.constructor.name === "Depot") {
      board.mark(zone.x - 2.5, zone.y - 2.5, 5, 5, cell => (cell.isMarked = true));
      board.mark(zone.harvestRally.x - 0.5, zone.harvestRally.y - 0.5, 1, 1, cell => (cell.isMarked = true));
      board.mark(zone.exitRally.x - 0.5, zone.exitRally.y - 0.5, 1, 1, cell => (cell.isMarked = true));
    } else if (zone.constructor.name === "Hub") {
      board.mark(zone.x - 1, zone.y - 1, 3, 3, cell => (cell.isMarked = true));
    } else {
      board.mark(zone.x, zone.y, 1, 1, cell => (cell.isMarked = true));
    }
  }
}

export default new Map();
