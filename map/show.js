import fs from "fs";
import ttys from "ttys";

import Types from "./types.js";
import Units from "./units.js";
import Map from "./code/map.js";
import Depot from "./code/depot.js";
import Hub from "./code/hub.js";
import Zone from "./code/zone.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const name = config.localMap.mapPath.split(".")[0];
const file = "map/raw/" + name + ".json";
const data = JSON.parse(fs.readFileSync(file, "utf-8"));

Types.sync(data.types);
Units.sync(data.units);

const start = Date.now();

Map.sync(data.info);

const end = Date.now();

function display(board, out, color) {
  const { left, top, right, bottom } = board.box;
  const cells = board.cells;

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const cell = cells[row][col];

      if (cell.isOn) {
        out.write("\x1b[48;2;" + color(cell) + "m");
        out.write(" ");
      }
    }

    out.write("\x1b[0m");
    out.write("\r\n");
  }
}

display(Map.board, ttys.stdout, function color(cell) {
  if (!cell.isMarked && !cell.isPath && !cell.isPlot) return "200;200;200";
  if (!cell.isMarked && cell.isObstacle) return "255;255;255";

  let r = 50;
  let g = 50;
  let b = 50;

  if (cell.isMarked) r = 200;
  if (cell.margin) g = Math.round(50 + Math.min(cell.margin * 10, 200));
  if (!cell.isPlot) b = 200;

  return r + ";" + g + ";" + b;
});

const palette = [[50, 200, 200], [200, 50, 200], [200, 200, 50], [50, 50, 200], [50, 200, 50]];
const red = [200, 50, 50];
const none = [0, 0, 0];

function assignColor(area) {
  const colors = [...palette];

  area.color = none;

  for (const join of area.joins) {
    for (const neighbor of join.areas) {
      if (neighbor === area) continue;
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

  area.color = colors[0];
}

for (const area of Map.board.areas) {
  if (!area.color) {
    assignColor(area);
  }
}

for (const join of Map.board.joins) {
  if (join.color) continue;

  if (join.areas && (join.areas.size === 2)) {
    const color = [0, 0, 0];
  
    for (const area of join.areas) {
      for (let i = 0; i < 3; i++) {
        color[i] += area.color ? area.color[i] : red[i];
      }
    }
  
    join.color = color.map(a => Math.floor(a / join.areas.size));
  } else {
    console.log("ERROR: Join", join.id, "doesn't connect two areas!", (join.areas ? "Connected areas: " + join.areas.size : "No connected areas"));

    join.color = red;
  }
}

for (const row of Map.board.cells) {
  for (const cell of row) {
    if (cell.area && !Map.board.areas.has(cell.area)) console.log("ERROR: Cell", cell.id, "doesn't belong to a valid area!", cell.area.hasbeenmerged);
    if (cell.join && !Map.board.joins.has(cell.join)) console.log("ERROR: Cell", cell.id, "doesn't belong to a valid join!");
  }
}

display(Map.board, ttys.stdout, function(cell) {
  if (cell.join && (cell.join.center === cell)) return "0;0;0";
  if (cell.area && (cell.area.center === cell)) return "0;0;0";

  if (!cell.isPath && !cell.isPlot) return "200;200;200";
  if (cell.isObstacle) return "255;255;255";

  if (cell.join) {
    let color = cell.join.color ? cell.join.color : red;

    return (cell.isPlot ? color : color.map(a => Math.floor(a*0.9))).join(";");
  }

  if (cell.area) {
    let color = cell.area.color ? cell.area.color : red;

    return (cell.isPlot ? color : color.map(a => Math.floor(a*0.9))).join(";");
  }

  return "255;0;0";
});

console.log();
console.log("Map", name, "with", Depot.list().length, "depots,", Hub.list().length, "hubs and a total of", Zone.list().length, "zones");
console.log("Processing time:", (end - start), "millis");
console.log();
