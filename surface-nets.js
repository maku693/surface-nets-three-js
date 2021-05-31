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

export function getGeometryData(distanceField) {
  const positions = [];
  const normals = [];
  const gridIndices = {};
  const indices = [];

  const gridWidth = distanceField.width - 1;
  const gridHeight = distanceField.height - 1;
  const gridDepth = distanceField.depth - 1;
  const gridVolume = gridWidth * gridHeight * gridDepth;

  for (let i = 0; i < gridVolume; i++) {
    const x = i % gridWidth;
    const y = ((i / gridWidth) | 0) % gridHeight;
    const z = (i / gridWidth / gridHeight) | 0;

    let cornerMask = 0;
    for (let j = 0; j < 8; j++) {
      const u = j % 2;
      const v = ((j / 2) | 0) % 2;
      const w = (j / 2 / 2) | 0;

      const k =
        x +
        u +
        (y + v) * distanceField.width +
        (z + w) * distanceField.width * distanceField.height;
      if (distanceField.data[k] > 0) {
        cornerMask |= 1 << j;
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
        (y + c0y) * distanceField.width +
        (z + c0z) * distanceField.width * distanceField.height;
      const d0 = distanceField.data[k0];

      const c1 = cubeEdgeCornerIndices[j][1];
      const c1x = c1 % 2;
      const c1y = ((c1 / 2) | 0) % 2;
      const c1z = (c1 / 2 / 2) | 0;
      const k1 =
        x +
        c1x +
        (y + c1y) * distanceField.width +
        (z + c1z) * distanceField.width * distanceField.height;
      const d1 = distanceField.data[k1];

      dx += c0x + ((c1x - c0x) / (d1 - d0)) * (0 - d0);
      dy += c0y + ((c1y - c0y) / (d1 - d0)) * (0 - d0);
      dz += c0z + ((c1z - c0z) / (d1 - d0)) * (0 - d0);
    }

    if (edgeCount === 0) continue;

    gridIndices[i] = positions.length / 3;

    dx /= edgeCount;
    dy /= edgeCount;
    dz /= edgeCount;

    // Shift vertex to center of the grid
    const vx = x + 0.5 + dx;
    const vy = y + 0.5 + dy;
    const vz = z + 0.5 + dz;

    positions.push(vx, vy, vz);

    // x, y, z
    const j =
      x +
      y * distanceField.width +
      z * distanceField.width * distanceField.height;
    const d0 = distanceField.data[j];
    const d1 = distanceField.data[j + 1];
    const d2 = distanceField.data[j + distanceField.width];
    const d3 = distanceField.data[j + 1 + distanceField.width];
    const d4 =
      distanceField.data[j + distanceField.width * distanceField.height];
    const d5 =
      distanceField.data[j + 1 + distanceField.width * distanceField.height];
    const d6 =
      distanceField.data[
        j + distanceField.width + distanceField.width * distanceField.height
      ];
    const d7 =
      distanceField.data[
        j + 1 + distanceField.width + distanceField.width * distanceField.height
      ];
    const normal = [
      d1 - d0 + d3 - d2 + d5 - d4 + d7 - d6,
      d2 - d0 + d3 - d1 + d6 - d4 + d7 - d5,
      d4 - d0 + d5 - d1 + d6 - d2 + d7 - d3,
    ];

    // normalize
    const normalLength = Math.sqrt(
      normal.reduce((prev, curr) => prev + curr * curr, 0)
    );
    for (let i = 0; i < normal.length; i++) {
      normal[i] = normal[i] / normalLength;
    }

    normals.push(...normal);

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

    // build index buffer
    for (let j = 0; j < quads.length; j++) {
      if (cornerMask & 1) {
        indices.push(
          quads[j][0],
          quads[j][3],
          quads[j][1],
          quads[j][0],
          quads[j][2],
          quads[j][3]
        );
      } else {
        indices.push(
          quads[j][0],
          quads[j][1],
          quads[j][3],
          quads[j][0],
          quads[j][3],
          quads[j][2]
        );
      }
    }
  }

  return { positions, normals, indices };
}
