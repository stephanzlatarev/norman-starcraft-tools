import fs from "fs";

import Types from "./types.js";
import Units from "./units.js";
import Map from "./code/map.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const name = config.localMap.mapPath.split(".")[0];
const file = "map/raw/" + name + ".json";
const data = JSON.parse(fs.readFileSync(file, "utf-8"));

Types.sync(data.types);
Units.sync(data.units);

Map.create(data.info);

const width = Map.right - Map.left;
const height = Map.bottom - Map.top;

function pos(x, y) {
  return Math.floor(x - Map.left) * 1000 + Math.floor(Map.bottom - y);
}

const center = 0;

const text = [
  `export default {`,
  `  left: ${Map.left},`,
  `  top: ${Map.top},`,
  `  width: ${width},`,
  `  height: ${height},`,
  `  zones: [`,
];

for (let y = 0; y < Map.bottom; y++) {
  const line = [];

  for (let x = 0; x < Map.right; x++) {
    const zone = Map.zone(x, y);
    line.push(zone ? pos(zone.x, zone.y) : center);
  }

  text.push("    [" + line.join(",") + "],");
}

text.push("  ]");
text.push("}");

fs.writeFileSync("map/raw/" + name + ".js", text.join("\r\n"));

console.log("Saved to", name + ".js");
