import Pin from "./pin.js";

const zones = [];

export default class Zone extends Pin {

  constructor(x, y, r) {
    super({ x, y });

    this.r = (r > 0) ? r : 1;
    this.corridors = [];
    this.cells = new Set();

    zones.push(this);
  }

  replace(old) {
    if (this.isCorridor && old.isCorridor) {
      for (const zone of old.zones) {
        for (let i = 0; i < zone.corridors.length; i++) {
          if (zone.corridors[i] === old) {
            zone.corridors[i] = this;
          }
        }
      }

      this.zones = [...old.zones];

      old.remove();
    } else {
      console.log("Only replacement of a corridor with another corridor is supported!");
      console.log(this, "vs", old);
    }
  }

  remove() {
    const index = zones.indexOf(this);

    if (index >= 0) {
      zones.splice(index, 1);
    }
  }

  static list() {
    return zones;
  }

}

export class Corridor extends Zone {

  isCorridor = true;

  constructor(x, y, r) {
    super(x, y, r);

    this.zones = [];
  }

}

export function createZones(board) {
  const mapping = new Map();

  for (const area of board.areas) {
    const zone = area.zone ? area.zone : new Zone(area.center.x, area.center.y, area.center.margin);

    for (const cell of area.cells) {
      zone.cells.add(cell);
      cell.zone = zone;
    }

    for (const cell of area.ramps) {
      zone.cells.add(cell);
      cell.zone = zone;
    }

    mapping.set(area, zone);
  }

  for (const join of board.joins) {
    const corridor = new Corridor(join.center.x, join.center.y, join.center.margin);

    for (const cell of join.cells) {
      corridor.cells.add(cell);
      cell.zone = corridor;
    }

    for (const area of join.areas) {
      const zone = mapping.get(area);

      zone.corridors.push(corridor);
      corridor.zones.push(zone);
    }
  }
}
