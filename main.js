const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const statusText = document.getElementById('statusText');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');

const btnPause = document.getElementById('btnPause');
const btnRestart = document.getElementById('btnRestart');
const btnAuto = document.getElementById('btnAuto');

// ====== 配置 ======
const GRID_COUNT = 20; // 20x20
let cellSize = 20; // 会根据屏幕动态更新
let boardPx = GRID_COUNT * cellSize;

// ====== 状态 ======
let snake = [{ x: 10, y: 10 }];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 15, y: 15 };
let score = 0;
let gameRunning = true;
let paused = false;
let autoMode = false;

let gameSpeed = 110; // ms/step

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function keyOf(p) {
  return `${p.x},${p.y}`;
}

function setStatusText() {
  const parts = [];
  if (!gameRunning) parts.push('已结束');
  else if (paused) parts.push('暂停中');
  if (autoMode) parts.push('自动中');
  statusText.textContent = parts.join(' · ');

  btnPause.textContent = paused ? '继续' : '暂停';
  btnAuto.textContent = autoMode ? '自动：开' : '自动：关';
  btnAuto.classList.toggle('btn-primary', !autoMode);
}

function resizeCanvas() {
  // 可用宽度：容器宽度
  const container = document.querySelector('.container');
  const maxW = container ? container.clientWidth : window.innerWidth;

  // 可用高度：避免在手机上把控制区挤没
  const maxH = Math.floor(window.innerHeight * 0.55);

  // 目标：正方形
  let cssSize = Math.min(maxW, maxH);
  cssSize = clamp(cssSize, 240, 520);

  // 为了保证格子整数，向下取整到 GRID_COUNT 的倍数
  const rawCell = Math.floor(cssSize / GRID_COUNT);
  cellSize = Math.max(10, rawCell);
  boardPx = cellSize * GRID_COUNT;

  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${boardPx}px`;
  canvas.style.height = `${boardPx}px`;
  canvas.width = Math.floor(boardPx * dpr);
  canvas.height = Math.floor(boardPx * dpr);

  // 让绘制使用 CSS 像素坐标系
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});

// ====== 食物 ======
function generateFood() {
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * GRID_COUNT),
      y: Math.floor(Math.random() * GRID_COUNT),
    };

    let ok = true;
    for (const seg of snake) {
      if (seg.x === candidate.x && seg.y === candidate.y) {
        ok = false;
        break;
      }
    }

    if (ok) {
      food = candidate;
      return;
    }
  }
}

// ====== 绘制 ======
function drawCell(x, y, inset = 2) {
  ctx.fillRect(x * cellSize + inset / 2, y * cellSize + inset / 2, cellSize - inset, cellSize - inset);
}

function draw() {
  // 背景
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, boardPx, boardPx);

  // 网格（轻）
  ctx.strokeStyle = 'rgba(17,24,39,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_COUNT; i++) {
    const p = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, boardPx);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(boardPx, p);
    ctx.stroke();
  }

  // 蛇
  snake.forEach((seg, idx) => {
    ctx.fillStyle = idx === 0 ? '#166534' : '#22c55e';
    drawCell(seg.x, seg.y, 4);
  });

  // 食物
  ctx.fillStyle = '#ef4444';
  drawCell(food.x, food.y, 4);

  // 暂停浮层
  if (gameRunning && paused) {
    ctx.fillStyle = 'rgba(17,24,39,0.35)';
    ctx.fillRect(0, 0, boardPx, boardPx);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂停', boardPx / 2, boardPx / 2);
  }
}

// ====== 碰撞 & 更新 ======
function isInside(p) {
  return p.x >= 0 && p.x < GRID_COUNT && p.y >= 0 && p.y < GRID_COUNT;
}

function willHitSelf(nextHead, willGrow) {
  // 允许「走到尾巴」：如果不会增长，则尾巴会在本回合移走
  const limit = willGrow ? snake.length : snake.length - 1;
  for (let i = 0; i < limit; i++) {
    const seg = snake[i];
    if (seg.x === nextHead.x && seg.y === nextHead.y) return true;
  }
  return false;
}

function update() {
  if (!gameRunning || paused) return;

  if (autoMode) {
    const autoDir = computeAutoDirection();
    if (autoDir) nextDirection = autoDir;
  }

  direction = nextDirection;

  const nextHead = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const willGrow = nextHead.x === food.x && nextHead.y === food.y;

  // 撞墙
  if (!isInside(nextHead)) {
    gameOver('撞墙');
    return;
  }

  // 撞自己
  if (willHitSelf(nextHead, willGrow)) {
    gameOver('撞到自己');
    return;
  }

  snake.unshift(nextHead);

  if (willGrow) {
    score += 10;
    scoreElement.textContent = score;
    generateFood();

    // 逐步加速
    if (gameSpeed > 55) gameSpeed -= 2;
  } else {
    snake.pop();
  }
}

function showOverlay(title) {
  overlayTitle.textContent = title;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function gameOver(reason = '游戏结束') {
  gameRunning = false;
  finalScoreElement.textContent = score;
  showOverlay(`游戏结束（${reason}）`);
  setStatusText();
}

function restart() {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  gameSpeed = 110;
  gameRunning = true;
  paused = false;

  scoreElement.textContent = score;
  hideOverlay();
  generateFood();
  setStatusText();
}

// ====== 输入：方向设置 ======
function trySetDirection(dir) {
  if (!dir) return;
  // 不允许 180 度掉头
  if (snake.length > 1 && dir.x === -direction.x && dir.y === -direction.y) return;
  nextDirection = dir;
}

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// 键盘
document.addEventListener('keydown', (e) => {
  // 防止方向键滚动
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }

  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      trySetDirection(DIRS.up);
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      trySetDirection(DIRS.down);
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      trySetDirection(DIRS.left);
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      trySetDirection(DIRS.right);
      break;
    case 'p':
    case 'P':
      if (gameRunning) paused = !paused;
      setStatusText();
      break;
    case 'r':
    case 'R':
      restart();
      break;
    case 'm':
    case 'M':
      autoMode = !autoMode;
      setStatusText();
      break;
  }
});

// 按钮
btnPause.addEventListener('click', () => {
  if (!gameRunning) return;
  paused = !paused;
  setStatusText();
});

btnRestart.addEventListener('click', () => restart());

btnAuto.addEventListener('click', () => {
  autoMode = !autoMode;
  setStatusText();
});

// 方向盘（触摸/鼠标）
document.querySelectorAll('.dpad-btn').forEach((btn) => {
  const dirName = btn.getAttribute('data-dir');
  const dir = DIRS[dirName];

  const onPress = (ev) => {
    ev.preventDefault();
    trySetDirection(dir);
  };

  btn.addEventListener('pointerdown', onPress);
  btn.addEventListener('touchstart', onPress, { passive: false });
});

// 画布滑动
let touchStart = null;
canvas.addEventListener(
  'touchstart',
  (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  },
  { passive: true }
);

canvas.addEventListener(
  'touchend',
  (e) => {
    if (!touchStart) return;
    const t = (e.changedTouches && e.changedTouches[0]) || null;
    if (!t) return;

    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 18;

    if (absX < threshold && absY < threshold) return;

    if (absX > absY) {
      trySetDirection(dx > 0 ? DIRS.right : DIRS.left);
    } else {
      trySetDirection(dy > 0 ? DIRS.down : DIRS.up);
    }
  },
  { passive: true }
);

// ====== 自动模式（简单寻路） ======
function computeAutoDirection() {
  if (!gameRunning || paused) return null;

  const head = snake[0];
  const headKey = keyOf(head);
  const targetKey = keyOf(food);

  // 视为阻塞：蛇身（不含头），并且把尾巴当作可走（因为通常会移动）
  const blocked = new Set();
  for (let i = 1; i < Math.max(1, snake.length - 1); i++) {
    blocked.add(keyOf(snake[i]));
  }

  const queue = [head];
  const visited = new Set([headKey]);
  const prev = new Map(); // key -> { fromKey, dir }

  const dirs = [DIRS.up, DIRS.down, DIRS.left, DIRS.right];

  while (queue.length) {
    const cur = queue.shift();
    const curKey = keyOf(cur);

    if (curKey === targetKey) break;

    for (const dir of dirs) {
      const nxt = { x: cur.x + dir.x, y: cur.y + dir.y };
      const nxtKey = keyOf(nxt);

      if (!isInside(nxt)) continue;
      if (blocked.has(nxtKey)) continue;
      if (visited.has(nxtKey)) continue;

      visited.add(nxtKey);
      prev.set(nxtKey, { fromKey: curKey, dir });
      queue.push(nxt);
    }
  }

  if (headKey !== targetKey && !prev.has(targetKey)) {
    return fallbackSafeDirection();
  }

  // 回溯到第一步
  let stepKey = targetKey;
  let step = prev.get(stepKey);
  if (!step) return fallbackSafeDirection();

  while (step && step.fromKey !== headKey) {
    stepKey = step.fromKey;
    step = prev.get(stepKey);
  }

  const dir = step?.dir || null;
  if (!dir) return fallbackSafeDirection();

  // 最终再做一次安全校验
  const nextHead = { x: head.x + dir.x, y: head.y + dir.y };
  const willGrow = nextHead.x === food.x && nextHead.y === food.y;
  if (!isInside(nextHead)) return fallbackSafeDirection();
  if (willHitSelf(nextHead, willGrow)) return fallbackSafeDirection();

  // 不允许反向
  if (snake.length > 1 && dir.x === -direction.x && dir.y === -direction.y) {
    return fallbackSafeDirection();
  }

  return dir;
}

function fallbackSafeDirection() {
  const head = snake[0];
  const candidates = [DIRS.up, DIRS.down, DIRS.left, DIRS.right].filter((d) => {
    if (snake.length > 1 && d.x === -direction.x && d.y === -direction.y) return false;
    const nextHead = { x: head.x + d.x, y: head.y + d.y };
    if (!isInside(nextHead)) return false;
    const willGrow = nextHead.x === food.x && nextHead.y === food.y;
    if (willHitSelf(nextHead, willGrow)) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // 选择让「可用邻居」最多的方向，尽量不把自己逼死
  const scoreDir = (d) => {
    const nh = { x: head.x + d.x, y: head.y + d.y };
    let free = 0;
    for (const nd of [DIRS.up, DIRS.down, DIRS.left, DIRS.right]) {
      const p = { x: nh.x + nd.x, y: nh.y + nd.y };
      if (!isInside(p)) continue;
      // 这里简单用当前蛇身判断
      const occupied = snake.some((s) => s.x === p.x && s.y === p.y);
      if (!occupied) free++;
    }

    const dist = Math.abs(nh.x - food.x) + Math.abs(nh.y - food.y);
    return free * 10 - dist; // free 更重要
  };

  candidates.sort((a, b) => scoreDir(b) - scoreDir(a));
  return candidates[0];
}

// ====== 游戏循环 ======
let lastTime = 0;
function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);

  const delta = currentTime - lastTime;
  if (delta >= gameSpeed) {
    lastTime = currentTime;
    update();
    draw();
  }
}

// ====== 启动 ======
resizeCanvas();
generateFood();
setStatusText();
draw();
requestAnimationFrame(gameLoop);
