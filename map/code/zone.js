import Pin from "./pin.js";

const zones = [];

export default class Zone extends Pin {

  constructor(x, y, r) {
    super({ x, y });

    this.r = r;

    zones.push(this);
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
