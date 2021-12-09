import {
  DistanceField,
  merge,
  sphere,
  torus,
  translate,
} from "./distance-field.js";
import { getGeometryData } from "./surface-nets.js";

for (let i = 0; i < 100; i++) {
  const distanceField = new DistanceField(128);

  distanceField.drawDistanceFunction(
    translate(
      distanceField.width / 2,
      distanceField.height / 2,
      distanceField.depth / 2,
      merge(
        torus(distanceField.width / 4, distanceField.width / 16),
        sphere(distanceField.width / 4)
      )
    )
  );

  performance.mark("start");

  getGeometryData(distanceField);

  performance.mark("end");
  performance.measure("measure", "start", "end");
}

const average = performance
  .getEntriesByName("measure")
  .reduce((a, b, _, arr) => a + b.duration / arr.length, 0);

console.log(average);
