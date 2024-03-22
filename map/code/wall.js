import Depot from "./depot.js";
import Hub from "./hub.js";
import Zone from "./zone.js";
import Units from "../units.js";

export default function(board) {
  const base = findBase();
  const expansions = findExpansions(base);
  const zone = findWallZone(...expansions);

  if (!zone || (zone.r !== 4)) return;

  const anchors = findAnchors(board, zone, ...expansions);

  createWall(zone, anchors);
}

function createWall(zone, anchors) {
  const bottomX = Math.max(zone.x - 4, anchors.bottom.x - 3);
  const topX = bottomX + 4;

  if ((topX <= anchors.top.x - 3) || (topX > anchors.top.x)) return;

  const buildingPlots = [
    { x: bottomX + 1.5, y: anchors.bottom.y - 3 + 1.5, isFree: true},
    { x: bottomX + 1.5, y: anchors.bottom.y - 6 + 1.5, isFree: true},
    { x: topX + 1.5, y: anchors.top.y + 1 + 1.5, isFree: true},
  ];

  let pylon = [];

  if (anchors.direction.x > 0) {
    pylon = { x: bottomX - 2 + 1, y: anchors.bottom.y - 5 + 1, isFree: true };
  } else {
    pylon = { x: bottomX + 5 + 1, y: anchors.bottom.y - 5 + 1, isFree: true };
  }

  const hub = new Hub(pylon.x, pylon.y, 4);
  hub.isWall = true;
  hub.buildingPlots = buildingPlots;
  hub.pylonPlots = [pylon];

  zone.remove();
}

function findBase() {
  for (const building of Units.buildings().values()) {
    return building;
  }
}

function findExpansions(base) {
  for (const depot of Depot.list()) {
    depot.d = squareDistance(base.body.x, base.body.y, depot.x, depot.y);
  }

  Depot.order();

  return Depot.list().slice(1, 3);
}

function findWallZone(a, b) {
  let closestDistance = Infinity;
  let closestZone;

  for (const zone of Zone.list()) {
    if (!isBetween(zone, a, b)) continue;

    const distance = Math.sqrt(squareDistance(zone.x, zone.y, a.x, a.y)) + Math.sqrt(squareDistance(zone.x, zone.y, b.x, b.y));

    if (distance < closestDistance) {
      closestDistance = distance;
      closestZone = zone;
    }
  }

  return closestZone;
}

function findAnchors(board, zone, a, b) {
  const direction = findDirection(zone, a, b);
  const top = findTopAnchor(board, zone, direction);
  const bottom = findBottomAnchor(board, zone, direction);

  return { direction, top, bottom };
}

function findTopAnchor(board, zone, direction) {
  const y = Math.floor(zone.y - zone.r - 1);
  const d = -direction.x;
  const xx = Math.floor(zone.x);
  const x1 = Math.floor(zone.x - zone.r * d);
  const x2 = Math.floor(zone.x + zone.r * d);

  if (x1  * x2 * d * d > 0) {
    let anchor;
    let bargain = true;

    for (let x = x1; x !== x2; x += d) {
      if (board.get(x, y) !== " ") anchor = { x, y };
      if (anchor && !bargain) return anchor;
      if (x === xx) bargain = false;
    }
  }
}

function findBottomAnchor(board, zone, direction) {
  const y = Math.floor(zone.y + zone.r);
  const d = -direction.x;
  const xx = Math.floor(zone.x);
  const x1 = Math.floor(zone.x - zone.r * d);
  const x2 = Math.floor(zone.x + zone.r * d);

  if (x1  * x2 * d * d > 0) {
    let anchor;
    let bargain = true;

    for (let x = x1; x !== x2; x += d) {
      if (board.get(x, y) !== " ") anchor = { x, y };
      if (anchor && !bargain) return anchor;
      if (x === xx) bargain = false;
    }
  }
}

function findDirection(zone, a, b) {
  if (squareDistance(zone.x, zone.y, a.x, a.y) < squareDistance(zone.x, zone.y, b.x, b.y)) {
    return { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
  } else {
    return { x: Math.sign(a.x - b.x), y: Math.sign(a.y - b.y) };
  }
}

function isBetween(zone, a, b) {
  const x1 = Math.min(a.x, b.x);
  const x2 = Math.max(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const y2 = Math.max(a.y, b.y);

  return ((zone.x >= x1) && (zone.x <= x2) && (zone.y >= y1) && (zone.y <= y2));
}

function squareDistance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
