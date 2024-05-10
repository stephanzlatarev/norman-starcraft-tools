import fs from "fs";
import ttys from "ttys";

import Types from "./types.js";
import Units from "./units.js";
import Map from "./code/map.js";
import Depot from "./code/depot.js";
import Zone from "./code/zone.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const name = config.localMap.mapPath.split(".")[0];
const file = "map/raw/" + name + ".json";
const data = JSON.parse(fs.readFileSync(file, "utf-8"));

Types.sync(data.types);
Units.sync(data.units);

if (config.localMap.side) {
  const side = config.localMap.side;
  const base = Units.buildings().values().next().value;

  base.body.x = side.x;
  base.body.y = side.y;
}

const start = Date.now();

Map.create(data.info);

const end = Date.now();

function display(board, out, color) {
  const { left, top, right, bottom } = board.box;
  const cells = board.cells;

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const cell = cells[row][col];

      if (cell.isOn) {
        const text = getCellText(cell);
        out.write("\x1b[48;2;" + ((text === " ") ? color(cell) : "0;0;0") + "m");
        out.write(text);
      }
    }

    out.write("\x1b[0m");
    out.write("\r\n");
  }
}

function getCellText(cell) {
  const zone = cell.zone;

  if (zone && !zone.isCorridor && (Math.floor(cell.y) === Math.floor(zone.y))) {
    const dx = Math.floor(cell.x) - Math.floor(zone.x);
    if (dx === 0) return zone.name[0];
    if (dx === 1) return zone.name[1];
  }

  return " ";
}

for (const zone of Zone.list()) {
  if (zone.isDepot) {
    Map.board.mark(zone.x - 2.5, zone.y - 2.5, 5, 5, cell => (cell.color = "200;200;50"));
    Map.board.mark(zone.harvestRally.x - 0.5, zone.harvestRally.y - 0.5, 1, 1, cell => (cell.color = "200;200;200"));
    Map.board.mark(zone.exitRally.x - 0.5, zone.exitRally.y - 0.5, 1, 1, cell => (cell.color = "200;200;50"));
  } else if (zone.isWall) {
    Map.board.mark(zone.blueprint.left.x - 1.5, zone.blueprint.left.y - 1.5, 3, 3, cell => (cell.color = "200;100;50"));
    Map.board.mark(zone.blueprint.center.x - 1.5, zone.blueprint.center.y - 1.5, 3, 3, cell => (cell.color = "200;100;50"));
    Map.board.mark(zone.blueprint.right.x - 1.5, zone.blueprint.right.y - 1.5, 3, 3, cell => (cell.color = "200;100;50"));
    Map.board.mark(zone.blueprint.pylon.x - 1, zone.blueprint.pylon.y - 1, 2, 2, cell => (cell.color = "200;200;50"));
    Map.board.mark(zone.blueprint.battery.x - 1, zone.blueprint.battery.y - 1, 2, 2, cell => (cell.color = "250;100;50"));
    Map.board.mark(Math.floor(zone.blueprint.choke.x), Math.floor(zone.blueprint.choke.y), 1, 1, cell => (cell.color = "200;50;200"));
    Map.board.mark(Math.floor(zone.blueprint.rally.x), Math.floor(zone.blueprint.rally.y), 1, 1, cell => (cell.color = "200;200;50"));
    Map.board.mark(Math.floor(zone.x), Math.floor(zone.y), 1, 1, cell => (cell.color = "200;200;50"));
  } else {
    Map.board.mark(Math.floor(zone.x), Math.floor(zone.y), 1, 1, cell => (cell.color = "200;200;50"));
  }
}

display(Map.board, ttys.stdout, function color(cell) {
  if (cell.color) return cell.color;
  if (!cell.isPath && !cell.isPlot) return "200;200;200";
  if (cell.isObstacle) return "255;255;255";

  let r = 50;
  let g = 50;
  let b = 50;

  if (cell.margin) g = Math.round(50 + Math.min(cell.margin * 10, 200));
  if (!cell.isPlot) b = 200;

  return r + ";" + g + ";" + b;
});

const palette = [[50, 200, 200], [200, 50, 200], [200, 200, 50], [50, 50, 200], [50, 200, 50]];
const red = [200, 50, 50];
const none = [0, 0, 0];

function assignColor(zone) {
  const colors = [...palette];

  zone.color = none;

  for (const corridor of zone.corridors) {
    for (const neighbor of corridor.zones) {
      if (neighbor === zone) continue;
      if (neighbor.color === none) continue;

      if (!neighbor.color) {
        assignColor(neighbor);
      }

      const index = colors.indexOf(neighbor.color);
      if (index >= 0) {
        colors.splice(index, 1);
      }
    }
  }

  zone.color = colors[0];
}

for (const zone of Zone.list()) {
  if (!zone.isCorridor && !zone.color) {
    assignColor(zone);
  }
}

for (const corridor of Zone.list()) {
  if (!corridor.isCorridor || corridor.color) continue;

  if (corridor.zones && (corridor.zones.length === 2)) {
    const color = [0, 0, 0];
  
    for (const zone of corridor.zones) {
      for (let i = 0; i < 3; i++) {
        color[i] += zone.color ? zone.color[i] : red[i];
      }
    }
  
    corridor.color = color.map(a => Math.floor(a / corridor.zones.length));
  } else {
    console.log("ERROR: Corridor", corridor.x, ":", corridor.y, "doesn't connect two zones!", (corridor.zones ? "Connected zones: " + corridor.zones.length : "No connected zones"));

    corridor.color = red;
  }
}

for (const row of Map.board.cells) {
  for (const cell of row) {
    if (cell.isOn) {
      if (cell.isPlot || cell.isPath) {
        if (!cell.zone) console.log("ERROR: Cell", cell.id, "doesn't belong to a zone!");
      } else {
        if (cell.zone) console.log("ERROR: Cell", cell.id, "belongs to a zone although it is neither buildable nor passable!");
      }
    } else {
      if (cell.zone) console.log("ERROR: Cell", cell.id, "belongs to a zone although it is not playable!");
    }
  }
}

display(Map.board, ttys.stdout, function(cell) {
  const zone = Map.zone(cell.x, cell.y);

  if (zone) {
    if ((Math.floor(cell.x) === Math.floor(zone.x)) && (Math.floor(cell.y) === Math.floor(zone.y))) {
      return "0;0;0";
    } else {
      let color = zone.color ? zone.color : red;

      return (cell.isPlot ? color : color.map(a => Math.floor(a*0.9))).join(";");
    }
  }

  return "200;200;200";
});

console.log();
console.log("Map", name, "with", Depot.list().length, "depots and a total of", Zone.list().length, "zones");
console.log("Processing time:", (end - start), "millis");
console.log();
