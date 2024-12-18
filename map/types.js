
const units = new Map();

const ATTRIBUTE_STRUCTURE = 8;

class Types {

  unit(key) {
    let type = units.get(key);

    if (!type) {
      type = { name: "Other" };

      units.set(key, type);
    }

    return type;
  }

  sync(data) {
    for (const unit of data.units) {
      if (!unit.available) continue;
      if (!unit.attributes.length) continue;

      const isNeutral = !unit.race;
      const isBuilding = (unit.attributes.indexOf(ATTRIBUTE_STRUCTURE) >= 0);

      const type = this.unit(unit.name);

      type.id = unit.unitId;
      type.name = unit.name;

      type.isNeutral = isNeutral;
      type.isBuilding = isBuilding && !isNeutral;
      type.isMinerals = !!unit.hasMinerals;
      type.isVespene = !!unit.hasVespene && !unit.race;
      type.isRich = (unit.name.indexOf("Rich") >= 0);

      units.set(unit.unitId, type);
      units.set(unit.name, type);
    }
  }

}

export default new Types();
