import fs from "fs";
import ttys from "ttys";

import Map from "./map.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const name = config.localMap.mapPath.split(".")[0];
const file = "map/raw/" + name + ".json";
const data = JSON.parse(fs.readFileSync(file, "utf-8"));

const map = new Map(
  {
    startRaw: {
      placementGrid: data.placementGrid,
      playableArea: data.playableArea,
      pathingGrid: data.pathingGrid,
      terrainHeight: data.terrainHeight
    }
  },
  {
    observation: {
      rawData: {
        units: data.units
      }
    }
  }
);

const lines = map.map();
for (let y = map.grid.top; y < map.grid.top + map.grid.height; y++) {
  showLine(map.grid, lines[y]);
}

function showLine(grid, line) {
  let color = null;

  for (let x = grid.left; x < grid.left + grid.width; x++) {
    const thisColor = chooseColor(line[x]);

    if (thisColor !== color) {
      ttys.stdout.write("\x1b[48;2;" + thisColor + "m");
      color = thisColor;
    }

    ttys.stdout.write(line[x]);
  }

  ttys.stdout.write("\x1b[0m");
  ttys.stdout.write("\r\n");
}

function chooseColor(symbol) {
  if (symbol === "M") return "0;191;255";
  if (symbol === "V") return "143;188;143";
  if (symbol === "N") return "255;215;0";
  if (symbol === "|") return "147;112;219";
  if (symbol === "?") return "139;0;0";

  return "50;50;50";
}

console.log();
console.log("Map", name, "with", map.clusters.length, "clusters", map.nexuses.length, "nexuses", map.bases.length, "bases");
console.log();
