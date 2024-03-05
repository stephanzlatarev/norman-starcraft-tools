import fs from "fs";
import { spawn } from "child_process";
import starcraft from "@node-sc2/proto";

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const client = starcraft();

async function go() {
  await startGame();
  await client.step({ count: 1 });

  const gameInfo = await client.gameInfo();
  const observation = await client.observation();

  const units = observation.observation.rawData.units.filter(unit => (unit.owner !== 1) && (unit.owner !== 2)).map(unit => ({
    tag: unit.tag,
    unitType: unit.unitType,
    radius: unit.radius,
    pos: {
      x: unit.pos.x,
      y: unit.pos.y,
    },
  }));

  showGrid("Placement", gameInfo.startRaw.placementGrid);
  showGrid("Pathing", gameInfo.startRaw.pathingGrid);
  showGrid("Height", gameInfo.startRaw.terrainHeight);

  const file = "map/raw/" + config.localMap.mapPath.split(".")[0] + ".json";
  fs.writeFileSync(file, JSON.stringify({
    playableArea: gameInfo.startRaw.playableArea,
    placementGrid: gameInfo.startRaw.placementGrid,
    pathingGrid: gameInfo.startRaw.pathingGrid,
    terrainHeight: gameInfo.startRaw.terrainHeight,
    units: units
  }));

  await client.quit();
}

async function startGame() {
  console.log("Starting StarCraft II game...");

  spawn("..\\Versions\\" + config.version + "\\SC2_x64.exe", [
    "-displaymode", "0", "-windowx", "0", "-windowy", "0", "-windowwidth", "2500",
    "-listen", "127.0.0.1", "-port", "5000"
  ], {
    cwd: config.path + "\\Support64"
  });

  for (let i = 0; i < 12; i++) {
    try {
      await client.connect({ host: "localhost", port: 5000 });
      break;
    } catch (_) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  await client.createGame(config);

  await client.joinGame({
    race: config.playerSetup[0].race,
    options: { raw: true },
  });
}

function showGrid(title, grid) {
  const { data, size, bitsPerPixel } = grid;

  console.log();
  console.log(title);

  for (let y = 0; y < size.y; y++) {
    const line = [];

    for (let x = 0; x < size.x; x++) {
      const index = x + y * size.x;

      if (bitsPerPixel === 1) {
        const bit = data[Math.floor(index / 8)];
        const pos = 7 - index % 8;
        const mask = 1 << pos;
        const val = (bit & mask) != 0;
  
        if (val) {
          line.push(" ");
        } else {
          line.push("-");
        }
      } else {
        const bit = data[index];
        const level = Math.floor(bit * 8 / 256);

        if (level) {
          line.push(level);
        } else {
          line.push(" ");
        }
      }
    }

    console.log(line.join(""));
  }
}

go();
