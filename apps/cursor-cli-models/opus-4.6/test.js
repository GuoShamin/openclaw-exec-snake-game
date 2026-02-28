const COLS = 20, ROWS = 20, TOTAL = COLS * ROWS;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };

function idx(x, y) { return y * COLS + x; }
function posOf(i) { return [i % COLS, (i / COLS) | 0]; }

function buildHamiltonCycle() {
  const hw = COLS >> 1, hh = ROWS >> 1;
  const visited = Array.from({ length: hh }, () => new Uint8Array(hw));
  const edges = new Set();
  const stack = [[0, 0]];
  visited[0][0] = 1;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nbrs = [];
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d];
      if (nx >= 0 && nx < hw && ny >= 0 && ny < hh && !visited[ny][nx]) nbrs.push([nx, ny, d]);
    }
    if (!nbrs.length) { stack.pop(); continue; }
    const [nx, ny] = nbrs[(Math.random() * nbrs.length) | 0];
    visited[ny][nx] = 1;
    const k = cx < nx || (cx === nx && cy < ny) ? cx+','+cy+'-'+nx+','+ny : nx+','+ny+'-'+cx+','+cy;
    edges.add(k);
    stack.push([nx, ny]);
  }

  function canPass(x1, y1, x2, y2) {
    if (x2 < 0 || x2 >= COLS || y2 < 0 || y2 >= ROWS) return false;
    const mx1 = x1 >> 1, my1 = y1 >> 1, mx2 = x2 >> 1, my2 = y2 >> 1;
    if (mx1 === mx2 && my1 === my2) return true;
    const k = mx1 < mx2 || (mx1 === mx2 && my1 < my2) ? mx1+','+my1+'-'+mx2+','+my2 : mx2+','+my2+'-'+mx1+','+my1;
    return !edges.has(k);
  }

  const orderOf = new Int32Array(TOTAL).fill(-1);
  const cycle = new Int32Array(TOTAL);
  let cx = 0, cy = 0, cd = DIR.DOWN;
  for (let step = 0; step < TOTAL; step++) {
    cycle[step] = idx(cx, cy);
    orderOf[idx(cx, cy)] = step;
    const tryOrder = [(cd + 1) % 4, cd, (cd + 3) % 4, (cd + 2) % 4];
    let moved = false;
    for (const nd of tryOrder) {
      const nx = cx + DX[nd], ny = cy + DY[nd];
      if (canPass(cx, cy, nx, ny) && orderOf[idx(nx, ny)] === -1) {
        cx = nx; cy = ny; cd = nd; moved = true; break;
      }
    }
    if (!moved && step < TOTAL - 1) {
      for (const nd of tryOrder) {
        const nx = cx + DX[nd], ny = cy + DY[nd];
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && orderOf[idx(nx, ny)] === -1) {
          cx = nx; cy = ny; cd = nd; break;
        }
      }
    }
  }
  return { cycle, orderOf };
}

let allOk = true;
for (let t = 0; t < 10; t++) {
  const { cycle, orderOf } = buildHamiltonCycle();
  let valid = true;
  for (let i = 0; i < TOTAL; i++) {
    if (orderOf[i] === -1) { valid = false; break; }
  }
  if (valid) {
    for (let i = 0; i < TOTAL; i++) {
      const cur = cycle[i];
      const next = cycle[(i + 1) % TOTAL];
      const [cx, cy] = posOf(cur);
      const [nx, ny] = posOf(next);
      if (Math.abs(cx - nx) + Math.abs(cy - ny) !== 1) {
        valid = false;
        console.log('Non-adjacent at step', i);
        break;
      }
    }
  }
  console.log('Test', t, valid ? 'OK' : 'FAILED');
  if (!valid) allOk = false;
}
console.log(allOk ? 'ALL PASSED' : 'SOME FAILED');
