import Stats from "https://cdn.skypack.dev/stats.js";
import * as THREE from "https://cdn.skypack.dev/three";
import { OrbitControls } from "https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls.js";
import {
  DistanceField,
  merge,
  sphere,
  torus,
  translate,
} from "./distance-field.js";
import { getGeometryData } from "./surface-nets.js";

var stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

const distanceField = new DistanceField(128);

// distanceField.drawDistanceFunction(
//   translate(
//     distanceField.width / 2,
//     distanceField.height / 2,
//     distanceField.depth / 2,
//     merge(
//       torus(distanceField.width / 4, distanceField.width / 16),
//       sphere(distanceField.width / 4)
//     )
//   )
// );

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.001,
  1000
);
camera.position.z = distanceField.depth;

const group = new THREE.Group();

const { positions, normals, indices } = getGeometryData(distanceField);

const geometry = new THREE.BufferGeometry();
geometry.setIndex(indices);
geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(positions, 3)
);
geometry.setAttribute(
  "normal",
  new THREE.Float32BufferAttribute(normals, 3, true)
);
geometry.translate(
  distanceField.width * -0.5,
  distanceField.height * -0.5,
  distanceField.depth * -0.5
);

// const material = new THREE.MeshStandardMaterial({
//   color: 0x808080,
//   roughness: 0.5,
// });

const material = new THREE.MeshNormalMaterial();

const mesh = new THREE.Mesh(geometry, material);
group.add(mesh);

const plane = new THREE.PlaneGeometry(
  distanceField.width,
  distanceField.depth,
  distanceField.width,
  distanceField.depth
);
plane.rotateX(Math.PI * 0.5);
const planeWireframe = new THREE.WireframeGeometry(plane);
const planeLine = new THREE.LineSegments(planeWireframe);
planeLine.material.opacity = 0.5;
planeLine.material.transparent = true;
scene.add(planeLine);

scene.add(group);

{
  const light = new THREE.PointLight(0xffffff, 10000, 0, 2);
  light.position.set(64, 64, 64);
  scene.add(light);
}
{
  const light = new THREE.PointLight(0xffffff, 10000, 0, 2);
  light.position.set(-64, -64, -64);
  scene.add(light);
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const control = new OrbitControls(camera, renderer.domElement);
control.enablePan = false;

renderer.render(scene, camera);

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

(function render() {
  stats.end();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
  stats.begin();
})();

setInterval(() => {
  distanceField.drawDistanceFunction(
    translate(
      random((distanceField.width / 4) * 1, (distanceField.width / 4) * 3),
      random((distanceField.height / 4) * 1, (distanceField.height / 4) * 3),
      random((distanceField.depth / 4) * 1, (distanceField.depth / 4) * 3),
      sphere(distanceField.width / 8)
    )
  );

  const { positions, normals, indices } = getGeometryData(distanceField);

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normals, 3, true)
  );
  geometry.translate(
    distanceField.width * -0.5,
    distanceField.height * -0.5,
    distanceField.depth * -0.5
  );
  geometry.setIndex(indices);
}, 16);

function random(min, max) {
  return min + Math.random() * (max - min);
}
