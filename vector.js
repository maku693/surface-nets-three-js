export function length(v) {
  return Math.sqrt(v.reduce((prev, curr) => prev + curr * curr, 0));
}

export function distance(a, b) {
  const tmp = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    tmp[i] = a[i] - b[i];
  }
  return length(tmp);
}
