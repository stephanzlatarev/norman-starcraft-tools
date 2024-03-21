import fs from "fs";
import { spawn } from "child_process";
import starcraft from "@node-sc2/proto";

const config = JSON.parse(fs.readFileSync("C:/git/my/norman-starcraft-tools/config.json", "utf-8"));
const client = starcraft();

async function play(args) {
  const file = (args && args.length > 2) ? args[2] : null;

  if (!file) {
    console.log("No replay file specified", JSON.stringify(args));
    return;
  }

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

  console.log("Replaying", file);

  const response = await client.startReplay({
    replayPath: file,
    observedPlayerId: 1,
    realtime: false,
    options: { raw: true }
  });

  console.log(response);
}

play(process.argv);
