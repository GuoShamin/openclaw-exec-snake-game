(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  const stage = document.getElementById('stage');

  const scoreElement = document.getElementById('score');
  const statusText = document.getElementById('statusText');

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayScore = document.getElementById('overlayScore');
  const overlayHint = document.getElementById('overlayHint');

  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');
  const btnAuto = document.getElementById('btnAuto');

  // ====== 配置 ======
  const COLS = 20;
  const ROWS = 20;
  const SIZE = COLS * ROWS;

  // 方向索引：0 上、1 右、2 下、3 左
  const DIR = [
    { dx: 0, dy: -1, name: 'up' },
    { dx: 1, dy: 0, name: 'right' },
    { dx: 0, dy: 1, name: 'down' },
    { dx: -1, dy: 0, name: 'left' },
  ];

  const DIR_NAME_TO_IDX = { up: 0, right: 1, down: 2, left: 3 };

  function isOpposite(a, b) {
    return (a + 2) % 4 === b;
  }

  function manhattan(aIdx, bIdx) {
    const ax = aIdx % COLS;
    const ay = (aIdx / COLS) | 0;
    const bx = bIdx % COLS;
    const by = (bIdx / COLS) | 0;
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  // 邻接表（预计算），-1 表示越界
  const neighbor = new Int16Array(SIZE * 4);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const idx = y * COLS + x;
      for (let d = 0; d < 4; d++) {
        const nx = x + DIR[d].dx;
        const ny = y + DIR[d].dy;
        neighbor[idx * 4 + d] = nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS ? -1 : ny * COLS + nx;
      }
    }
  }

  // ====== iOS Safari 视口适配（地址栏/安全区） ======
  function updateVhVar() {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${h * 0.01}px`);
  }

  // ====== Canvas 自适应 ======
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let render = { cell: 16, boardW: 0, boardH: 0, ox: 0, oy: 0 };

  function recomputeRender() {
    const cell = Math.max(10, Math.floor(Math.min(cssW / COLS, cssH / ROWS)));
    const boardW = cell * COLS;
    const boardH = cell * ROWS;
    const ox = Math.floor((cssW - boardW) / 2);
    const oy = Math.floor((cssH - boardH) / 2);
    render = { cell, boardW, boardH, ox, oy };
  }

  function resizeCanvas() {
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const nextDpr = Math.min(3, window.devicePixelRatio || 1);
    if (w === cssW && h === cssH && nextDpr === dpr) return;

    cssW = w;
    cssH = h;
    dpr = nextDpr;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    recomputeRender();
  }

  function handleResize() {
    updateVhVar();
    resizeCanvas();
  }

  window.addEventListener('resize', handleResize, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    window.visualViewport.addEventListener('scroll', handleResize, { passive: true });
  }

  // ====== 游戏状态 ======
  let snake = [];
  let occupied = new Uint8Array(SIZE);
  let food = -1;
  let score = 0;

  let dir = 1; // 右
  let queuedDir = null;

  let paused = false;
  let gameOver = false;
  let autoMode = false;
  let gameOverReason = '';

  function stepIntervalMs() {
    const base = 170;
    const min = 70;
    const dec = 3;
    return Math.max(min, base - score * dec);
  }

  function pickRandomEmptyCell() {
    const empty = [];
    empty.length = 0;
    for (let i = 0; i < SIZE; i++) {
      if (!occupied[i]) empty.push(i);
    }
    if (empty.length === 0) return -1;
    return empty[(Math.random() * empty.length) | 0];
  }

  function placeFood() {
    food = pickRandomEmptyCell();
  }

  function resetGame() {
    occupied = new Uint8Array(SIZE);
    snake = [];
    score = 0;
    paused = false;
    gameOver = false;
    gameOverReason = '';
    autoMode = false;
    queuedDir = null;
    dir = 1;

    const cx = (COLS / 2) | 0;
    const cy = (ROWS / 2) | 0;
    const head = cy * COLS + cx;
    const s1 = cy * COLS + (cx - 1);
    const s2 = cy * COLS + (cx - 2);
    snake.push(head, s1, s2);
    occupied[head] = 1;
    occupied[s1] = 1;
    occupied[s2] = 1;

    placeFood();
    syncUi();
    showOverlayIfNeeded();
  }

  // ====== UI ======
  function statusLabel() {
    const base = gameOver ? '已结束' : paused ? '暂停' : '进行中';
    return autoMode ? `${base} · 自动` : base;
  }

  function syncUi() {
    scoreElement.textContent = String(score);
    statusText.textContent = statusLabel();

    btnPause.textContent = paused ? '继续' : '暂停';
    btnPause.disabled = gameOver;

    btnAuto.textContent = autoMode ? '自动：开' : '自动：关';
    btnAuto.classList.toggle('is-on', autoMode);
  }

  function showOverlay(title, hint) {
    overlayTitle.textContent = title;
    overlayScore.textContent = String(score);
    overlayHint.textContent = hint;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function showOverlayIfNeeded() {
    if (gameOver) {
      showOverlay(`游戏结束（${gameOverReason || '失败'}）`, '按 R 重开，或点“重开”按钮。');
      return;
    }
    if (paused) {
      showOverlay('已暂停', '按 P 继续，或点“继续”按钮。');
      return;
    }
    hideOverlay();
  }

  function endGame(reason) {
    gameOver = true;
    gameOverReason = reason;
    paused = false;
    syncUi();
    showOverlayIfNeeded();
  }

  function togglePause() {
    if (gameOver) return;
    paused = !paused;
    syncUi();
    showOverlayIfNeeded();
  }

  function toggleAutoMode() {
    if (gameOver) return;
    autoMode = !autoMode;
    queuedDir = null;
    syncUi();
  }

  // ====== 输入：方向队列（单步缓冲） ======
  function queueDirection(next) {
    if (next == null) return;
    if (gameOver) return;
    if (autoMode) return; // 自动模式下不吃手动方向
    if (snake.length > 1 && isOpposite(next, dir)) return;
    queuedDir = next;
  }

  // ====== 自动驾驶（BFS + 安全检查） ======
  const bfsPrev = new Int16Array(SIZE);
  const bfsPrevDir = new Int8Array(SIZE);
  const bfsQueue = new Int16Array(SIZE);

  function bfsPath(startIdx, targetIdx, blocked) {
    bfsPrev.fill(-1);
    bfsPrevDir.fill(-1);

    let qh = 0;
    let qt = 0;
    bfsQueue[qt++] = startIdx;
    bfsPrev[startIdx] = startIdx;

    while (qh < qt) {
      const cur = bfsQueue[qh++];
      if (cur === targetIdx) break;

      const base = cur * 4;
      for (let d = 0; d < 4; d++) {
        const nxt = neighbor[base + d];
        if (nxt < 0) continue;
        if (blocked[nxt]) continue;
        if (bfsPrev[nxt] !== -1) continue;
        bfsPrev[nxt] = cur;
        bfsPrevDir[nxt] = d;
        bfsQueue[qt++] = nxt;
      }
    }

    if (bfsPrev[targetIdx] === -1) return null;

    const path = [];
    let cur = targetIdx;
    while (cur !== startIdx) {
      const d = bfsPrevDir[cur];
      if (d < 0) return null;
      path.push(d);
      cur = bfsPrev[cur];
    }
    path.reverse();
    return path;
  }

  const ffVisited = new Uint8Array(SIZE);
  const ffQueue = new Int16Array(SIZE);

  function floodFillCount(startIdx, blocked) {
    ffVisited.fill(0);

    let qh = 0;
    let qt = 0;
    ffQueue[qt++] = startIdx;
    ffVisited[startIdx] = 1;

    let count = 0;
    while (qh < qt) {
      const cur = ffQueue[qh++];
      count++;
      const base = cur * 4;
      for (let d = 0; d < 4; d++) {
        const nxt = neighbor[base + d];
        if (nxt < 0) continue;
        if (ffVisited[nxt]) continue;
        if (blocked[nxt]) continue;
        ffVisited[nxt] = 1;
        ffQueue[qt++] = nxt;
      }
    }
    return count;
  }

  function buildBlocked({ tailFree }) {
    const b = new Uint8Array(SIZE);
    b.set(occupied);
    const head = snake[0];
    b[head] = 0;
    if (tailFree) {
      const tail = snake[snake.length - 1];
      b[tail] = 0;
    }
    return b;
  }

  function isDirectionLegal(nextDir) {
    if (nextDir == null) return false;
    if (snake.length > 1 && isOpposite(nextDir, dir)) return false;
    const head = snake[0];
    const nxt = neighbor[head * 4 + nextDir];
    if (nxt < 0) return false;
    const willGrow = nxt === food;
    const tail = snake[snake.length - 1];
    const hitBody = occupied[nxt] && !(nxt === tail && !willGrow);
    return !hitBody;
  }

  function simulateFollowingPath(pathDirs) {
    const simSnake = snake.slice();
    const simOcc = new Uint8Array(SIZE);
    simOcc.set(occupied);

    for (let i = 0; i < pathDirs.length; i++) {
      const d = pathDirs[i];
      const head = simSnake[0];
      const nxt = neighbor[head * 4 + d];
      if (nxt < 0) return null;

      const willGrow = nxt === food;
      const tail = simSnake[simSnake.length - 1];
      const hitBody = simOcc[nxt] && !(nxt === tail && !willGrow);
      if (hitBody) return null;

      simSnake.unshift(nxt);
      simOcc[nxt] = 1;

      if (!willGrow) {
        const removed = simSnake.pop();
        if (removed !== nxt) simOcc[removed] = 0;
      } else {
        break;
      }
    }

    return { simSnake, simOcc };
  }

  function autoDirection() {
    const head = snake[0];
    const tail = snake[snake.length - 1];

    // 1) 优先：找吃食路径（把尾巴当作可走），并做“吃完后可达尾巴”的安全检查
    const blockedForFood = buildBlocked({ tailFree: true });
    const pathToFood = bfsPath(head, food, blockedForFood);
    if (pathToFood && pathToFood.length > 0) {
      const first = pathToFood[0];
      if (isDirectionLegal(first) && !(snake.length > 1 && isOpposite(first, dir))) {
        const sim = simulateFollowingPath(pathToFood);
        if (sim) {
          const newHead = sim.simSnake[0];
          const newTail = sim.simSnake[sim.simSnake.length - 1];
          const blockedAfterEat = new Uint8Array(SIZE);
          blockedAfterEat.set(sim.simOcc);
          blockedAfterEat[newHead] = 0;
          blockedAfterEat[newTail] = 0;
          const canReachTail = bfsPath(newHead, newTail, blockedAfterEat) !== null;
          if (canReachTail) return first;
        }
      }
    }

    // 2) 兜底：追尾（更保守），尽量不把自己困死
    const blockedForTail = buildBlocked({ tailFree: true });
    const pathToTail = bfsPath(head, tail, blockedForTail);
    if (pathToTail && pathToTail.length > 0) {
      const first = pathToTail[0];
      if (isDirectionLegal(first)) return first;
    }

    // 3) 再兜底：选“空间更大”的安全方向
    let bestDir = null;
    let bestScore = -Infinity;
    for (let d = 0; d < 4; d++) {
      if (snake.length > 1 && isOpposite(d, dir)) continue;
      const nxt = neighbor[head * 4 + d];
      if (nxt < 0) continue;
      const willGrow = nxt === food;
      const hitBody = occupied[nxt] && !(nxt === tail && !willGrow);
      if (hitBody) continue;

      const simOcc = new Uint8Array(SIZE);
      simOcc.set(occupied);
      simOcc[nxt] = 1;
      if (!willGrow) {
        const removed = tail;
        if (removed !== nxt) simOcc[removed] = 0;
      }

      const blocked = new Uint8Array(SIZE);
      blocked.set(simOcc);
      blocked[nxt] = 0;
      const space = floodFillCount(nxt, blocked);
      const dist = manhattan(nxt, food);
      const scoreMove = space * 10 - dist * 2;

      if (scoreMove > bestScore) {
        bestScore = scoreMove;
        bestDir = d;
      }
    }

    return bestDir;
  }

  // ====== 更新一步 ======
  function stepOnce() {
    if (gameOver || paused) return;

    if (autoMode) {
      const d = autoDirection();
      if (d != null && isDirectionLegal(d)) dir = d;
    } else if (queuedDir != null) {
      const d = queuedDir;
      queuedDir = null;
      if (isDirectionLegal(d)) dir = d;
    }

    const head = snake[0];
    const nxt = neighbor[head * 4 + dir];
    if (nxt < 0) {
      endGame('撞墙');
      return;
    }

    const willGrow = nxt === food;
    const tail = snake[snake.length - 1];
    const hitBody = occupied[nxt] && !(nxt === tail && !willGrow);
    if (hitBody) {
      endGame('撞到自己');
      return;
    }

    snake.unshift(nxt);
    occupied[nxt] = 1;

    if (willGrow) {
      score += 1;
      syncUi();
      if (snake.length === SIZE) {
        endGame('通关');
        return;
      }
      placeFood();
    } else {
      const removed = snake.pop();
      if (removed !== nxt) occupied[removed] = 0;
    }
  }

  // ====== 绘制 ======
  function draw() {
    // 背景（让 canvas 自己完全铺底，避免透明导致的色差）
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, cssW, cssH);

    // 棋盘
    const { cell, boardW, boardH, ox, oy } = render;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(ox, oy, boardW, boardH);

    // 轻网格
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      const x = ox + i * cell;
      ctx.beginPath();
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + boardH);
      ctx.stroke();
    }
    for (let i = 1; i < ROWS; i++) {
      const y = oy + i * cell;
      ctx.beginPath();
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + boardW, y);
      ctx.stroke();
    }

    const pad = Math.max(1, Math.floor(cell * 0.14));

    // 食物
    if (food >= 0) {
      const fx = food % COLS;
      const fy = (food / COLS) | 0;
      const px = ox + fx * cell + cell / 2;
      const py = oy + fy * cell + cell / 2;
      const r = Math.max(3, (cell * 0.33) | 0);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 蛇
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const x = s % COLS;
      const y = (s / COLS) | 0;
      const px = ox + x * cell + pad;
      const py = oy + y * cell + pad;
      const w = cell - pad * 2;
      const h = cell - pad * 2;
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#22c55e' : 'rgba(34,197,94,0.82)';
      ctx.fillRect(px, py, w, h);

      if (isHead && cell >= 14) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        const eye = Math.max(1, (cell * 0.09) | 0);
        ctx.fillRect(px + (w * 0.22) | 0, py + (h * 0.25) | 0, eye, eye);
        ctx.fillRect(px + (w * 0.65) | 0, py + (h * 0.25) | 0, eye, eye);
      }
    }
  }

  // ====== 游戏循环（rAF + 累积时间） ======
  let lastTs = 0;
  let acc = 0;

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    const delta = Math.min(80, ts - lastTs);
    lastTs = ts;

    if (!paused && !gameOver) {
      acc += delta;
      let stepMs = stepIntervalMs();
      while (acc >= stepMs) {
        stepOnce();
        acc -= stepMs;
        stepMs = stepIntervalMs();
        if (paused || gameOver) break;
      }
    }

    draw();
    requestAnimationFrame(frame);
  }

  // ====== 事件：键盘 ======
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) e.preventDefault();

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        queueDirection(0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        queueDirection(1);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        queueDirection(2);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        queueDirection(3);
        break;
      case 'p':
      case 'P':
        togglePause();
        break;
      case 'r':
      case 'R':
        resetGame();
        acc = 0;
        break;
      case 'm':
      case 'M':
        toggleAutoMode();
        break;
    }
  });

  // ====== 事件：按钮 ======
  btnPause.addEventListener('click', () => togglePause());
  btnRestart.addEventListener('click', () => {
    resetGame();
    acc = 0;
  });
  btnAuto.addEventListener('click', () => toggleAutoMode());

  // ====== 事件：D-pad ======
  document.querySelectorAll('.dpadBtn').forEach((btn) => {
    const name = btn.getAttribute('data-dir');
    const d = DIR_NAME_TO_IDX[name];
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      queueDirection(d);
    });
  });

  // ====== 事件：滑动控制（Pointer Events） ======
  const SWIPE_THRESHOLD = 14;
  let swipeActive = false;
  let swipeTriggered = false;
  let swipeId = null;
  let swipeX = 0;
  let swipeY = 0;

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipeActive = true;
    swipeTriggered = false;
    swipeId = e.pointerId;
    swipeX = e.clientX;
    swipeY = e.clientY;
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (e.pointerType !== 'mouse') e.preventDefault();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!swipeActive || e.pointerId !== swipeId || swipeTriggered) return;
    const dx = e.clientX - swipeX;
    const dy = e.clientY - swipeY;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax < SWIPE_THRESHOLD && ay < SWIPE_THRESHOLD) return;

    swipeTriggered = true;
    if (ax > ay) queueDirection(dx > 0 ? 1 : 3);
    else queueDirection(dy > 0 ? 2 : 0);

    if (e.pointerType !== 'mouse') e.preventDefault();
  });

  function endSwipe() {
    swipeActive = false;
    swipeTriggered = false;
    swipeId = null;
  }

  stage.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') e.preventDefault();
    endSwipe();
  });
  stage.addEventListener('pointercancel', () => endSwipe());
  stage.addEventListener('lostpointercapture', () => endSwipe());

  // ====== 启动 ======
  handleResize();
  // 首帧再做一次，确保 flex 布局稳定后拿到正确尺寸
  requestAnimationFrame(() => handleResize());

  resetGame();
  requestAnimationFrame(frame);
})();
