import { length } from "./vector.js";

export class DistanceField {
  constructor(width, height, depth) {
    this.width = width;
    this.height = height || width;
    this.depth = depth || width;
    this.data = new Float32Array(this.width * this.height * this.depth).fill(
      Infinity
    );
  }

  drawDistanceFunction(f) {
    const { width, height, depth, data } = this;
    let i = 0;
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          data[i] = Math.min(
            data[i],
            // Shift the sampling point to center of the voxel
            f(x + 0.5, y + 0.5, z + 0.5)
          );
          i++;
        }
      }
    }
  }
}

export function merge(...ff) {
  return function (x, y, z) {
    return Math.min(...ff.map((f) => f(x, y, z)));
  };
}

export function translate(tx, ty, tz, f) {
  return function (x, y, z) {
    return f(x - tx, y - ty, z - tz);
  };
}

export function sphere(r) {
  return function (x, y, z) {
    return length([x, y, z]) - r;
  };
}

export function torus(rr, r) {
  return function (x, y, z) {
    const q = [length([x, z]) - rr, y];
    return length(q) - r;
  };
}
