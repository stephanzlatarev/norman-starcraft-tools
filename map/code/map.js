import Depot from "./depot.js";
import Hub from "./hub.js";
import Units from "../units.js";

class Map {

  sync(gameInfo) {
    readPlayableArea(this, gameInfo.startRaw.playableArea);
    readTerrainGrid(this, gameInfo.startRaw.placementGrid, gameInfo.startRaw.pathingGrid);

    locateDepots(this);
    locateHubs(this, 10);
  }

  board(filter) {
    return createBoard(this, filter);
  }

}

function readPlayableArea(map, playArea) {
  const left = playArea.p0.x;
  const top = playArea.p0.y;
  const width = playArea.p1.x - playArea.p0.x;
  const height = playArea.p1.y - playArea.p0.y;

  map.left = left;
  map.top = top;
  map.width = width;
  map.height = height;
}

function readTerrainGrid(map, placementGrid, pathingGrid) {
  const lines = [];
  const size = placementGrid.size;

  for (let y = 0; y < size.y; y++) {
    const line = [];
    for (let x = 0; x < size.x; x++) {
      const index = x + y * size.x;
      const pos = 7 - index % 8;
      const mask = 1 << pos;

      const placement = (placementGrid.data[Math.floor(index / 8)] & mask) != 0;
      const pathing = (pathingGrid.data[Math.floor(index / 8)] & mask) != 0;

      if (placement && pathing) {
        line.push(" ");
      } else if (placement || pathing) {
        line.push("/");
      } else {
        line.push("-");
      }
    }
    lines.push(line.join(""));
  }

  for (const building of Units.buildings().values()) {
    if (building.type.isBuilding) {
      add(lines, " ", building.body.x - 2.5, building.body.y - 2.5, 5, 5);
    }
  }

  map.lines = lines;
}

function locateDepots(map) {
  const clusters = clusterResources(findClusters());
  const board = createBoard(map, { harvest: 1, resources: 1, obstacles: 1 });

  for (const cluster of clusters) {
    calculateDepotCoordinates(board, cluster);

    const minerals = cluster.resources.filter(resource => resource.type.isMinerals);
    const vespene = cluster.resources.filter(resource => resource.type.isVespene);

    new Depot(cluster.depot, cluster.rally, minerals, vespene);
  }
}

function findClusters() {
  let clusters = [];

  for (const resource of Units.resources().values()) {
    if (!resource.type.isMinerals) continue;

    const list = [];

    for (const cluster of clusters) {
      if (isResourceInCluster(resource, cluster, 6)) {
        list.push(cluster);
      }
    }

    if (list.length === 0) {
      clusters.push([resource]);
    } else if (list.length === 1) {
      list[0].push(resource);
    } else {
      let join = [resource];
      for (const cluster of list) {
        join = join.concat(cluster);
      }

      let newClusters = [join];
      for (const cluster of clusters) {
        if (list.indexOf(cluster) < 0) {
          newClusters.push(cluster);
        }
      }
      clusters = newClusters;
    }
  }

  for (const cluster of clusters) {
    for (const resource of Units.resources().values()) {
      if (resource.type.isVespene && isResourceInCluster(resource, cluster, 10)) {
        cluster.push(resource);
      }
    }
  }

  return clusters;
}

function isResourceInCluster(resource, cluster, distance) {
  for (const object of cluster) {
    if ((Math.abs(object.body.x - resource.body.x) < distance) && (Math.abs(object.body.y - resource.body.y) < distance)) {
      return true;
    }
  }

  return false;
}

function clusterResources(clusters) {
  const result = [];
  let index = 1;

  for (const cluster of clusters) {
    if (cluster.length < 10) continue;

    let minX = 1000;
    let minY = 1000;
    let maxX = 0;
    let maxY = 0;

    for (const resource of cluster) {
      if (resource.type.isMinerals) {
        minX = Math.min(minX, resource.body.x);
        maxX = Math.max(maxX, resource.body.x);
        minY = Math.min(minY, resource.body.y);
        maxY = Math.max(maxY, resource.body.y);
      }
    }

    const x = (maxX + minX) / 2;
    const y = (maxY + minY) / 2;

    result.push({
      index: index++,
      resources: cluster,
      x: Math.floor(x),
      y: Math.floor(y),
      depot: null,
      rally: null,
    });
  }

  return result;
}

function calculateDepotCoordinates(board, cluster) {
  const clusterX = Math.floor(cluster.x);
  const clusterY = Math.floor(cluster.y);
  const plotMinX = clusterX - 20;
  const plotMinY = clusterY - 20;
  const plotMaxW = 40;
  const plotMaxH = 40;
  const data = prefix(board, plotMinX, plotMinY, plotMaxW, plotMaxH);
  const slot = plot(data, 5, 5, plotMinX, plotMinY, plotMinX + plotMaxW, plotMinY + plotMaxH, clusterX, clusterY);

  cluster.depot = { x: slot.x + 2.5, y: slot.y + 2.5 };
  cluster.rally = { x: cluster.depot.x + Math.sign(cluster.x - cluster.depot.x) * 3, y: cluster.depot.y + Math.sign(cluster.y - cluster.depot.y) * 3 };

  // Calculate distance to depot for each resource in the cluster
  for (const resource of cluster.resources) {
    const dx = resource.body.x - cluster.depot.x;
    const dy = resource.body.y - cluster.depot.y;

    resource.d = Math.sqrt(dx * dx + dy * dy);
  }
}

function locateHubs(map, size) {
  const plots = [];
  const board = createBoard(map, { depots: 1, resources: 1, obstacles: 1 });

  for (let y = 0; y < board.length - size; y += size) {
    for (let x = 0; x < board[y].length - size; x += size) {
      const data = prefix(board, x, y, size + size, size + size);
      const plot = findPlot(plots.length, data, x, y, x + size + size, y + size + size, size, size);

      if (plot) {
        plots.push(plot);
        add(board, "H", plot.x, plot.y, plot.w, plot.h);

        const centerX = plot.x + plot.w / 2 + 1;
        const centerY = plot.y + plot.h / 2 + 1;

        new Hub(centerX, centerY);
      }
    }
  }
}

function findPlot(index, prefix, startX, startY, endX, endY, width, height) {
  for (let y = startY; y < Math.min(endY, prefix.length - 1); y++) {
    for (let x = startX; x < Math.min(endX, prefix[y].length - 1); x++) {
      const cell = prefix[y][x];

      if (cell && (cell.w >= width) && (cell.h >= height)) {
        return { index: index, x: x, y: y, w: width, h: height };
      }
    }
  }
}

function createBoard(map, filter) {
  const board = JSON.parse(JSON.stringify(map.lines));

  if (filter && filter.harvest) {
    for (const unit of Units.resources().values()) {
      const x = Math.floor(unit.body.x);
      const y = Math.floor(unit.body.y);

      if (unit.type.isMinerals) {
        add(board, "·", x - 4, y - 2, 8, 5);
        add(board, "·", x - 3, y - 3, 6, 7);
      } else if (unit.type.isVespene) {
        add(board, "·", x - 4, y - 4, 9, 9);
      }
    }
  }

  if (!filter || filter.resources) {
    for (const unit of Units.resources().values()) {
      const x = Math.floor(unit.body.x);
      const y = Math.floor(unit.body.y);

      if (unit.type.isMinerals) {
        add(board, "M", x - 1, y, 2, 1);
      } else if (unit.type.isVespene) {
        add(board, "V", x - 1, y - 1, 3, 3);
      } else {
        add(board, "?", x, y, 1, 1);
      }
    }
  }

  if (!filter || filter.obstacles) {
    for (const unit of Units.obstacles().values()) {
      add(board, "X", Math.floor(unit.body.x) - 1, Math.floor(unit.body.y) - 1, 3, 3);
    }
  }

  if (!filter || filter.depots) {
    for (const depot of Depot.list()) {
      add(board, "N", Math.floor(depot.x - 2.5), Math.floor(depot.y - 2.5), 5, 5);
    }
  }

  if (!filter || filter.hubs) {
    for (const hub of Hub.list()) {
      add(board, "H", Math.floor(hub.x - 4), Math.floor(hub.y - 4), 8, 8);
    }
  }

  return board;
}

function add(board, symbol, x, y, w, h) {
  for (let row = y; row < y + h; row++) {
    const line = board[row];

    let symbols = "";
    for (let i = 0; i < w; i++) symbols += symbol;

    board[row] = line.substring(0, x) + symbols + line.substring(x + w);
  }
}

function prefix(board, x, y, w, h) {
  const minx = x ? x : 0;
  const maxx = w ? minx + w : board[0].length - 1;
  const miny = y ? y : 0;
  const maxy = h ? miny + h : board.length - 1;

  // Zero prefix table
  const prefix = [];
  for (const row of board) {
    const line = [];
    for (const _ of row) {
      line.push({ w: 0, h: 0 });
    }
    prefix.push(line);
  }

  for (let row = Math.min(maxy - 1, board.length - 1); row >= Math.max(miny, 0); row--) {
    for (let col = Math.min(maxx - 1, board[row].length - 1); col >= Math.max(minx, 0); col--) {
      if (board[row][col] !== " ") continue;

      const cell = prefix[row][col];
      const right = prefix[row][col + 1];
      const bottom = prefix[row + 1][col];
      const diagonal = prefix[row + 1][col + 1];

      cell.w = Math.min(right.w + 1, diagonal.w + 1);
      cell.h = Math.min(bottom.h + 1, diagonal.h + 1);
    }
  }

  return prefix;
}

function plot(prefix, width, height, minX, minY, maxX, maxY, centerX, centerY) {
  let best = 1000000;
  let plot = { x:0, y: 0, w: 0, h: 0 };

  for (let y = Math.max(minY, 0); y <= Math.min(maxY, prefix.length - 1); y++) {
    for (let x = Math.max(minX, 0); x <= Math.min(maxX, prefix[y].length - 1); x++) {
      const cell = prefix[y][x];

      if ((cell.w >= width) && (cell.h >= height)) {
        const cellCenterX = x + width / 2;
        const cellCenterY = y + height / 2;
        const distance = (cellCenterX - centerX) * (cellCenterX - centerX) + (cellCenterY - centerY) * (cellCenterY - centerY);

        if (distance < best) {
          best = distance;
          plot = { x: x, y: y, w: cell.w, h: cell.h };
        }
      }
    }
  }

  return { x: plot.x, y: plot.y, w: width, h: height };
}

export default new Map();
