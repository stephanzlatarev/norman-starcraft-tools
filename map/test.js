import fs from "fs";
import { spawn } from "child_process";
import starcraft from "@node-sc2/proto";

import Map from "./map.js";

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const client = starcraft();

async function go() {
  await startGame();
  await client.step({ count: 1 });

  const gameInfo = await client.gameInfo();
  const observation = await client.observation();

  console.log(gameInfo);
  console.log(observation);

  const map = new Map(gameInfo, observation);

  for (const line of map.map()) {
    console.log(line);
  }

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

go();
