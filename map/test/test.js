import fs from "fs";

import Types from "../types.js";
import Units from "../units.js";
import Corridor from "../code/corridor.js";
import Depot from "../code/depot.js";
import Hub from "../code/hub.js";
import Map from "../code/map.js";
import Zone from "../code/zone.js";

function clearMemory() {
  
}

function readMap(name) {
  const file = "map/raw/" + name + ".json";
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));

  Types.sync(data.types);
  Units.sync(data.units);
  Map.sync(data.info);
}

function checkZones(name) {
  const file = "map/test/" + name + ".json";
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));

  let indexDepot = 0;
  let indexHub = 0;
  let indexCorridor = 0;

  for (const zone of Zone.list()) {
    if (zone instanceof Depot) {
      if (!assertEquals(serializeZone(zone), serializeZone(data.depots[indexDepot++]), "Bad depot")) return;
    } else if (zone instanceof Hub) {
      if (!assertEquals(serializeZone(zone), serializeZone(data.hubs[indexHub++]), "Bad hub")) return;
    } else if (zone instanceof Corridor) {
      if (!assertEquals(serializeCorridor(zone), serializeCorridor(data.corridors[indexCorridor++]), "Bad corridor")) return;
    }
  }

  if (data.depots.length > indexDepot) console.log("Missing depot:", serializeZone(data.depots[indexDepot]));
  if (data.hubs.length > indexHub) console.log("Missing hub:", serializeZone(data.hubs[indexHub]));
  if (data.corridors.length > indexCorridor) console.log("Missing corridor:", serializeZone(data.corridors[indexCorridor]));

  console.log("Zones are OK");
}

function checkWall(name) {
  const walls = new Set();

  for (const hub of Zone.list()) {
    for (const corridor of hub.corridors) {
      if (corridor.wall) {
        walls.add(corridor.wall);
      }
    }
  }

  if (walls.size !== 1) {
    console.log("Wall should be exactly one but are:", walls.size);
  } else {
    console.log("Wall is OK");
  }
}

function assertEquals(a, b, message) {
  if (a !== b) {
    console.log(message, ":", a, "vs", b);
  }

  return (a === b);
}

function showZones() {
  const data = {
    depots: [],
    hubs: [],
    corridors: [],
  }

  for (const zone of Zone.list()) {
    if (zone instanceof Depot) {
      data.depots.push(JSON.parse(serializeZone(zone)));
    } else if (zone instanceof Hub) {
      data.hubs.push(JSON.parse(serializeZone(zone)));
    } else if (zone instanceof Corridor) {
      data.corridors.push(JSON.parse(serializeCorridor(zone)));
    }
  }

  console.log(JSON.stringify(data));
}

function serializeZone(zone) {
  return JSON.stringify({ x: zone.x, y: zone.r, r: zone.r, corridors: zone.corridors.map(one => ({ x: one.x, y: one.y, r: one.r })) }, null, 2);
}

function serializeCorridor(zone) {
  return JSON.stringify({ x: zone.x, y: zone.r, r: zone.r, zones: zone.zones.map(one => ({ x: one.x, y: one.y, r: one.r })) }, null, 2);
}

// TODO: List all json file in this folder
const MAPS = [
  "Equilibrium512V2AIE"
];

for (const map of MAPS) {
  console.log();
  console.log("Checking map", map);

  clearMemory();
  readMap(map);

  showZones();
  checkZones(map);
  checkWall(map);
}
