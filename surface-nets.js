import { distance, length } from "./vector.js";

const cubeEdgeCornerIndices = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
  [4, 5],
  [4, 6],
  [5, 7],
  [6, 7],
];

const edgeBitFields = new Array(256);
{
  for (let cornerBits = 0; cornerBits < edgeBitFields.length; cornerBits++) {
    let field = 0;
    for (let j = 0; j < cubeEdgeCornerIndices.length; j++) {
      const cornerBitsA = 1 << cubeEdgeCornerIndices[j][0];
      const cornerBitsB = 1 << cubeEdgeCornerIndices[j][1];
      const isCornerInVolumeA = (cornerBits & cornerBitsA) !== 0;
      const isCornerInVolumeB = (cornerBits & cornerBitsB) !== 0;
      const isOnlyOneOfCornerInVolume = isCornerInVolumeA !== isCornerInVolumeB;
      field |= isOnlyOneOfCornerInVolume << j;
    }
    edgeBitFields[cornerBits] = field;
  }
}

const positions = new Array(2048);
const normals = new Array(2048);
const indices = new Array(16384);
const gridIndices = {};

export function getGeometryData(distanceField) {
  let verticesCount = 0;
  let indicesCount = 0;

  const fieldWidth = distanceField.width;
  const fieldHeight = distanceField.height;
  const fieldDepth = distanceField.depth;

  const data = distanceField.data;

  const gridWidth = fieldWidth - 1;
  const gridHeight = fieldHeight - 1;
  const gridDepth = fieldDepth - 1;

  for (let z = 0; z < gridDepth; z++) {
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const i = x + y * gridWidth + z * gridWidth * gridHeight;
        let cornerMask = 0;

        for (let w = 0; w < 2; w++) {
          for (let v = 0; v < 2; v++) {
            for (let u = 0; u < 2; u++) {
              const j = u + v * 2 + w * 4;
              const k =
                x +
                u +
                (y + v) * fieldWidth +
                (z + w) * fieldWidth * fieldHeight;
              if (data[k] > 0) {
                cornerMask |= 1 << j;
              }
            }
          }
        }

        // skip voxel that has no positive or negative corners
        if (cornerMask === 0 || cornerMask === 0b11111111) continue;

        const edges = edgeBitFields[cornerMask];

        let edgeCount = 0;
        let dx = 0;
        let dy = 0;
        let dz = 0;
        for (let j = 0; j < cubeEdgeCornerIndices.length; j++) {
          if (!(edges & (1 << j))) continue;
          edgeCount++;

          const c0 = cubeEdgeCornerIndices[j][0];
          const c0x = c0 % 2;
          const c0y = ((c0 / 2) | 0) % 2;
          const c0z = (c0 / 2 / 2) | 0;
          const k0 =
            x +
            c0x +
            (y + c0y) * fieldWidth +
            (z + c0z) * fieldWidth * fieldHeight;
          const d0 = data[k0];

          const c1 = cubeEdgeCornerIndices[j][1];
          const c1x = c1 % 2;
          const c1y = ((c1 / 2) | 0) % 2;
          const c1z = (c1 / 2 / 2) | 0;
          const k1 =
            x +
            c1x +
            (y + c1y) * fieldWidth +
            (z + c1z) * fieldWidth * fieldHeight;
          const d1 = data[k1];

          dx += c0x + ((c1x - c0x) / (d1 - d0)) * (0 - d0);
          dy += c0y + ((c1y - c0y) / (d1 - d0)) * (0 - d0);
          dz += c0z + ((c1z - c0z) / (d1 - d0)) * (0 - d0);
        }

        if (edgeCount === 0) continue;

        gridIndices[i] = verticesCount / 3;

        dx /= edgeCount;
        dy /= edgeCount;
        dz /= edgeCount;

        // Shift vertex to center of the grid
        const vx = x + 0.5 + dx;
        const vy = y + 0.5 + dy;
        const vz = z + 0.5 + dz;
        positions[verticesCount] = vx;
        positions[verticesCount + 1] = vy;
        positions[verticesCount + 2] = vz;

        // x, y, z
        const j = x + y * fieldWidth + z * fieldWidth * fieldHeight;
        const d0 = data[j];
        const d1 = data[j + 1];
        const d2 = data[j + fieldWidth];
        const d3 = data[j + 1 + fieldWidth];
        const d4 = data[j + fieldWidth * fieldHeight];
        const d5 = data[j + 1 + fieldWidth * fieldHeight];
        const d6 = data[j + fieldWidth + fieldWidth * fieldHeight];
        const d7 = data[j + 1 + fieldWidth + fieldWidth * fieldHeight];
        normals[verticesCount] = d1 - d0 + d3 - d2 + d5 - d4 + d7 - d6;
        normals[verticesCount + 1] = d2 - d0 + d3 - d1 + d6 - d4 + d7 - d5;
        normals[verticesCount + 2] = d4 - d0 + d5 - d1 + d6 - d2 + d7 - d3;

        // normalize
        const normalLength = length([
          normals[verticesCount],
          normals[verticesCount + 1],
          normals[verticesCount + 2],
        ]);
        for (let j = 0; j < 3; j++) {
          normals[verticesCount + j] =
            normals[verticesCount + j] / normalLength;
        }

        verticesCount += 3;

        const quads = [];
        if (edges & 0b000000000001) {
          // x, y - 1, z,
          // x, y - 1, z - 1
          // x, y, z
          // x, y, z - 1
          quads.push([
            gridIndices[i - gridWidth],
            gridIndices[i - gridWidth - gridWidth * gridHeight],
            gridIndices[i],
            gridIndices[i - gridWidth * gridHeight],
          ]);
        }
        if (edges & 0b000000000010) {
          // x, y, z
          // x, y, z - 1
          // x - 1, y, z
          // x - 1, y, z - 1
          quads.push([
            gridIndices[i],
            gridIndices[i - gridWidth * gridHeight],
            gridIndices[i - 1],
            gridIndices[i - 1 - gridWidth * gridHeight],
          ]);
        }
        if (edges & 0b000000010000) {
          // x - 1, y - 1, z
          // x, y - 1, z
          // x - 1, y, z
          // x, y, z
          quads.push([
            gridIndices[i - 1 - gridWidth],
            gridIndices[i - gridWidth],
            gridIndices[i - 1],
            gridIndices[i],
          ]);
        }

        if (quads.length === 0) continue;

        // build index buffer
        for (let j = 0; j < quads.length; j++) {
          const q = quads[j];
          const k0 = q[0] * 3;
          const k1 = q[1] * 3;
          const k2 = q[2] * 3;
          const k3 = q[3] * 3;
          const shortestDiagonal =
            distance(
              [positions[k0], positions[k0 + 1], positions[k0 + 2]],
              [positions[k3], positions[k3 + 1], positions[k3 + 2]]
            ) <
            distance(
              [positions[k1], positions[k1 + 1], positions[k1 + 2]],
              [positions[k2], positions[k2 + 1], positions[k2 + 2]]
            )
              ? 0
              : 1;
          if (cornerMask & 1) {
            if (shortestDiagonal === 0) {
              indices[indicesCount + 0] = q[0];
              indices[indicesCount + 1] = q[3];
              indices[indicesCount + 2] = q[1];
              indices[indicesCount + 3] = q[0];
              indices[indicesCount + 4] = q[2];
              indices[indicesCount + 5] = q[3];
            } else {
              indices[indicesCount + 0] = q[0];
              indices[indicesCount + 1] = q[2];
              indices[indicesCount + 2] = q[1];
              indices[indicesCount + 3] = q[1];
              indices[indicesCount + 4] = q[2];
              indices[indicesCount + 5] = q[3];
            }
          } else {
            if (shortestDiagonal === 0) {
              indices[indicesCount + 0] = q[0];
              indices[indicesCount + 1] = q[1];
              indices[indicesCount + 2] = q[3];
              indices[indicesCount + 3] = q[0];
              indices[indicesCount + 4] = q[3];
              indices[indicesCount + 5] = q[2];
            } else {
              indices[indicesCount + 0] = q[0];
              indices[indicesCount + 1] = q[1];
              indices[indicesCount + 2] = q[2];
              indices[indicesCount + 3] = q[1];
              indices[indicesCount + 4] = q[3];
              indices[indicesCount + 5] = q[2];
            }
          }

          indicesCount += 6;
        }
      }
    }
  }

  return {
    positions: positions.slice(0, verticesCount),
    normals: normals.slice(0, verticesCount),
    indices: indices.slice(0, indicesCount),
  };
}
