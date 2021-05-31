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

const distanceField = new DistanceField(16);

distanceField.drawDistanceFunction(
  translate(
    distanceField.width / 2,
    distanceField.height / 2,
    distanceField.depth / 2,
    merge(
      // torus(distanceField.width / 4, distanceField.width / 16),
      sphere(distanceField.width / 4)
    )
  )
);

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
geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
geometry.translate(
  distanceField.width * -0.5,
  distanceField.height * -0.5,
  distanceField.depth * -0.5
);

// const material = new THREE.MeshStandardMaterial({
//   color: 0x808080,
//   roughness: 0.2,
// });

const material = new THREE.MeshNormalMaterial();

const mesh = new THREE.Mesh(geometry, material);
group.add(mesh);

const wireframe = new THREE.WireframeGeometry(geometry);
const line = new THREE.LineSegments(wireframe);
line.material.opacity = 0.5;
line.material.transparent = true;
group.add(line);

scene.add(group);

{
  const light = new THREE.PointLight(0xffffff, 1, 0, 2);
  light.position.set(64, 64, 64);
  scene.add(light);
}
{
  const light = new THREE.PointLight(0xffffff, 1, 0, 2);
  light.position.set(-64, -64, -64);
  scene.add(light);
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

new OrbitControls(camera, renderer.domElement);

renderer.render(scene, camera);

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

(function render() {
  requestAnimationFrame(render);

  renderer.render(scene, camera);
})();
