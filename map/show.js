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
Map.sync(data.info);

const board = Map.get().lines;
for (let y = Map.top; y < Map.top + Map.height; y++) {
  showLine(board[y]);
}

function showLine(line) {
  let color = null;

  for (let x = Map.left; x < Map.left + Map.width; x++) {
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
  if (symbol === "O") return "147;112;219";
  if (symbol === "H") return "150;100;0";
  if (symbol === "X") return "139;0;0";
  if (symbol === "?") return "139;0;0";
  if (symbol === "/") return "100;100;100";
  if (symbol === "-") return "200;200;200";

  return "50;50;50";
}

console.log();
console.log("Map", name, "with", Depot.list().length, "depots", Zone.list().length, "zones", Hub.list().length, "hubs");
console.log();
