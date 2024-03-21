import Types from "./types.js";

const buildings = new Map();
const resources = new Map();
const obstacles = new Map();
const others = new Map();

class Units {

  buildings() {
    return buildings;
  }

  resources() {
    return resources;
  }

  obstacles() {
    return obstacles;
  }

  sync(units) {
    for (const unit of units) {
      const type = Types.unit(unit.unitType);

      collection(type).set(unit.tag, {
        tag: unit.tag,
        nick: unit.tag.slice(unit.tag.length - 3),
        type: type,
        body: {
          r: unit.radius,
          x: unit.pos.x,
          y: unit.pos.y,
        },
      });
    }
  }

}

function collection(type) {
  if (type.isBuilding) return buildings;
  if (type.isMinerals) return resources;
  if (type.isVespene) return resources;
  if (type.isNeutral) return obstacles;

  return others;
}

export default new Units();
