/* Snake Auto
 *
 * 自动驾驶策略（简述）：
 * - 第一步：用 BFS 在网格上找从蛇头到食物的最短路径（把“尾巴格”在不吃到食物的情况下视为可走，因为下一步尾巴会前进腾空）。
 * - 第二步：安全性检查：把“沿该路径吃到食物”的过程做一次快速模拟，然后再 BFS 检查“新蛇头 -> 新蛇尾”是否可达；
 *          若不可达，说明可能把自己封死（吃到食物后没有退路），判为不安全。
 * - 第三步：若吃食物不安全/不可达，则改为“追尾保命”（BFS 找蛇头到蛇尾的路，尽量让自己保持可循环空间）。
 * - 第四步：若追尾也不可达，则选一个不撞的方向，使得下一步的“可达空地面积（flood fill）”最大化。
 *
 * 这个混合策略在小尺寸棋盘上稳定性较好：能频繁吃到食物，同时显著降低自锁死概率。
 */

(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const scoreEl = document.getElementById("score");
  const lenEl = document.getElementById("len");
  const spdLabelEl = document.getElementById("spdLabel");
  const statusEl = document.getElementById("status");
  const speedEl = document.getElementById("speed");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");

  // 固定网格大小（渲染时用 cellSize 自适配屏幕）
  const COLS = 25;
  const ROWS = 25;

  const DIRS = [
    { x: 0, y: -1, name: "U" },
    { x: 1, y: 0, name: "R" },
    { x: 0, y: 1, name: "D" },
    { x: -1, y: 0, name: "L" },
  ];

  const opposite = (d) => (d + 2) % 4;
  const keyOf = (p) => `${p.x},${p.y}`;
  const inBounds = (p) => p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < ROWS;

  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  let cellSize = 20;
  let padX = 0;
  let padY = 0;

  const state = {
    running: true,
    gameOver: false,
    score: 0,
    tickMs: 100,
    // snake[0] 是头
    snake: [],
    dir: 1,          // 当前方向（索引）
    pendingDir: null // 允许短暂手动干预
  };

  function resize() {
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(320, Math.floor(rect.height));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    // 让棋盘在画布内居中，格子尽量大
    cellSize = Math.floor(Math.min(canvas.width / COLS, canvas.height / ROWS));
    padX = Math.floor((canvas.width - cellSize * COLS) / 2);
    padY = Math.floor((canvas.height - cellSize * ROWS) / 2);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function randInt(n) {
    return (Math.random() * n) | 0;
  }

  function placeFood() {
    const occupied = new Set(state.snake.map(keyOf));
    for (let tries = 0; tries < 9999; tries++) {
      const p = { x: randInt(COLS), y: randInt(ROWS) };
      if (!occupied.has(keyOf(p))) return p;
    }
    return null; // 理论上几乎不会发生（满图）
  }

  function reset() {
    state.running = true;
    state.gameOver = false;
    state.score = 0;
    state.dir = 1;
    state.pendingDir = null;

    const mid = { x: (COLS / 2) | 0, y: (ROWS / 2) | 0 };
    state.snake = [
      { x: mid.x - 2, y: mid.y },
      { x: mid.x - 1, y: mid.y },
      { x: mid.x, y: mid.y },
    ];
    state.food = placeFood();
    updateHUD();
  }

  function updateHUD() {
    scoreEl.textContent = String(state.score);
    lenEl.textContent = String(state.snake.length);
    spdLabelEl.textContent = String(Math.round(1000 / state.tickMs));
    if (state.gameOver) statusEl.textContent = "结束";
    else statusEl.textContent = state.running ? "运行中" : "暂停";
  }

  function buildBlockedSet(snake, allowTail) {
    // allowTail：如果为 true，则把蛇尾视为可走（典型：下一步不吃到食物时尾巴会移动）
    const blocked = new Set();
    for (let i = 0; i < snake.length; i++) {
      if (allowTail && i === snake.length - 1) continue;
      blocked.add(keyOf(snake[i]));
    }
    return blocked;
  }

  function bfsPath(start, goal, blockedSet) {
    // 返回包含 start->...->goal 的点数组；不可达则 null
    const q = [];
    const prev = new Map();
    const seen = new Set();

    const startK = keyOf(start);
    q.push(start);
    seen.add(startK);

    while (q.length) {
      const cur = q.shift();
      const ck = keyOf(cur);
      if (cur.x === goal.x && cur.y === goal.y) {
        const path = [];
        let k = ck;
        while (k) {
          const [x, y] = k.split(",").map(Number);
          path.push({ x, y });
          k = prev.get(k) || null;
        }
        path.reverse();
        return path;
      }

      for (let di = 0; di < 4; di++) {
        const nx = cur.x + DIRS[di].x;
        const ny = cur.y + DIRS[di].y;
        const np = { x: nx, y: ny };
        if (!inBounds(np)) continue;

        const nk = keyOf(np);
        if (seen.has(nk)) continue;
        if (blockedSet.has(nk) && nk !== keyOf(goal)) continue;

        seen.add(nk);
        prev.set(nk, ck);
        q.push(np);
      }
    }
    return null;
  }

  function dirFromStep(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    for (let di = 0; di < 4; di++) {
      if (DIRS[di].x === dx && DIRS[di].y === dy) return di;
    }
    return null;
  }

  function willEat(nextHead) {
    return state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;
  }

  function isCollision(nextHead, snake) {
    if (!inBounds(nextHead)) return true;

    // 若不吃，尾巴会移动，所以允许走进“当前尾巴格”
    const eat = state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;
    const tail = snake[snake.length - 1];
    const tailK = keyOf(tail);

    for (let i = 0; i < snake.length; i++) {
      const k = keyOf(snake[i]);
      if (!eat && k === tailK) continue;
      if (snake[i].x === nextHead.x && snake[i].y === nextHead.y) return true;
    }
    return false;
  }

  function simulateEatPath(snake, food, path) {
    // path: snakeHead->...->food（包含头和食物）
    let s = snake.map(p => ({ x: p.x, y: p.y }));
    let f = { x: food.x, y: food.y };

    for (let i = 1; i < path.length; i++) {
      const nh = { x: path[i].x, y: path[i].y };
      const eat = nh.x === f.x && nh.y === f.y;

      // 碰撞检查：模拟时也要考虑尾巴是否移动
      const tail = s[s.length - 1];
      const tailK = keyOf(tail);
      for (let j = 0; j < s.length; j++) {
        const k = keyOf(s[j]);
        if (!eat && k === tailK) continue;
        if (s[j].x === nh.x && s[j].y === nh.y) return null;
      }
      if (!inBounds(nh)) return null;

      s.unshift(nh);
      if (!eat) s.pop();
    }

    return s;
  }

  function headToTailReachable(snake) {
    const head = snake[0];
    const tail = snake[snake.length - 1];
    const blocked = buildBlockedSet(snake, true); // 追尾时允许走到尾巴
    const path = bfsPath(head, tail, blocked);
    return path !== null;
  }

  function floodFillArea(start, blocked) {
    const q = [start];
    const seen = new Set([keyOf(start)]);
    let count = 0;
    while (q.length) {
      const cur = q.shift();
      count++;
      for (let di = 0; di < 4; di++) {
        const np = { x: cur.x + DIRS[di].x, y: cur.y + DIRS[di].y };
        if (!inBounds(np)) continue;
        const k = keyOf(np);
        if (seen.has(k)) continue;
        if (blocked.has(k)) continue;
        seen.add(k);
        q.push(np);
      }
    }
    return count;
  }

  function chooseAutoDir() {
    const snake = state.snake;
    const head = snake[0];
    const food = state.food;

    // 1) BFS 到食物（尾巴允许腾空）
    if (food) {
      const blockedForFood = buildBlockedSet(snake, true);
      blockedForFood.delete(keyOf(head)); // 起点不应阻塞
      const pathToFood = bfsPath(head, food, blockedForFood);

      if (pathToFood && pathToFood.length >= 2) {
        // 安全性：模拟“沿最短路吃到食物”，然后检查新局面 head->tail 是否可达
        const simSnake = simulateEatPath(snake, food, pathToFood);
        if (simSnake && headToTailReachable(simSnake)) {
          const nd = dirFromStep(pathToFood[0], pathToFood[1]);
          if (nd !== null) return nd;
        }
      }
    }

    // 2) 追尾保命（BFS 到尾巴）
    const tail = snake[snake.length - 1];
    const blockedForTail = buildBlockedSet(snake, true);
    blockedForTail.delete(keyOf(head));
    const pathToTail = bfsPath(head, tail, blockedForTail);
    if (pathToTail && pathToTail.length >= 2) {
      const nd = dirFromStep(pathToTail[0], pathToTail[1]);
      if (nd !== null) return nd;
    }

    // 3) 兜底：挑一个不撞的方向，使下一步可达面积最大
    let best = null;
    for (let di = 0; di < 4; di++) {
      if (di === opposite(state.dir)) continue; // 避免直接反向（更稳定）
      const nh = { x: head.x + DIRS[di].x, y: head.y + DIRS[di].y };
      if (isCollision(nh, snake)) continue;

      // 模拟走一步
      const eat = food && nh.x === food.x && nh.y === food.y;
      const s2 = snake.map(p => ({ x: p.x, y: p.y }));
      s2.unshift(nh);
      if (!eat) s2.pop();

      const blocked = buildBlockedSet(s2, false);
      blocked.delete(keyOf(s2[0]));
      const area = floodFillArea(s2[0], blocked);

      if (!best || area > best.area) best = { di, area };
    }

    // 如果真的无路可走，返回当前方向（会在 step 中判定 game over）
    return best ? best.di : state.dir;
  }

  function applyDir(desiredDir) {
    if (desiredDir == null) return;
    if (desiredDir === opposite(state.dir)) return;
    state.dir = desiredDir;
  }

  function step() {
    if (!state.running || state.gameOver) return;

    // 先吃手动输入（如果有），否则自动驾驶
    if (state.pendingDir != null) {
      applyDir(state.pendingDir);
      state.pendingDir = null;
    } else {
      applyDir(chooseAutoDir());
    }

    const head = state.snake[0];
    const nextHead = { x: head.x + DIRS[state.dir].x, y: head.y + DIRS[state.dir].y };

    if (isCollision(nextHead, state.snake)) {
      state.gameOver = true;
      state.running = false;
      updateHUD();
      return;
    }

    const eat = willEat(nextHead);
    state.snake.unshift(nextHead);

    if (eat) {
      state.score += 1;
      state.food = placeFood();
    } else {
      state.snake.pop();
    }

    updateHUD();
  }

  function draw() {
    // 背景
    ctx.fillStyle = "#0a0f1f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 棋盘底
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(padX, padY, cellSize * COLS, cellSize * ROWS);

    // 网格线（轻量）
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      const px = padX + x * cellSize + 0.5;
      ctx.moveTo(px, padY);
      ctx.lineTo(px, padY + ROWS * cellSize);
    }
    for (let y = 0; y <= ROWS; y++) {
      const py = padY + y * cellSize + 0.5;
      ctx.moveTo(padX, py);
      ctx.lineTo(padX + COLS * cellSize, py);
    }
    ctx.stroke();

    // 食物
    if (state.food) {
      const fx = padX + state.food.x * cellSize;
      const fy = padY + state.food.y * cellSize;
      const r = Math.max(4, Math.floor(cellSize * 0.22));
      const cx = fx + (cellSize / 2);
      const cy = fy + (cellSize / 2);
      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, cellSize * 0.6);
      grad.addColorStop(0, "rgba(251, 191, 36, 0.95)");
      grad.addColorStop(1, "rgba(251, 113, 133, 0.18)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 蛇
    const s = state.snake;
    for (let i = s.length - 1; i >= 0; i--) {
      const p = s[i];
      const x = padX + p.x * cellSize;
      const y = padY + p.y * cellSize;
      const inset = Math.max(1, Math.floor(cellSize * 0.10));
      const w = cellSize - inset * 2;
      const h = cellSize - inset * 2;
      const rr = Math.max(4, Math.floor(cellSize * 0.22));

      if (i === 0) {
        ctx.fillStyle = "rgba(52, 211, 153, 0.95)";
        ctx.shadowColor = "rgba(52, 211, 153, 0.35)";
        ctx.shadowBlur = 12;
      } else {
        const t = i / Math.max(1, s.length - 1);
        ctx.fillStyle = `rgba(125, 211, 252, ${0.90 - t * 0.35})`;
        ctx.shadowBlur = 0;
      }

      roundRect(ctx, x + inset, y + inset, w, h, rr);
      ctx.fill();
    }

    // Game over overlay
    if (state.gameOver) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const msg = "游戏结束";
      const msg2 = "点击“重开”继续（自动驾驶会立即开始）";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.floor(canvas.height * 0.06)}px ${getComputedStyle(document.body).fontFamily}`;
      ctx.fillText(msg, canvas.width / 2, canvas.height / 2 - 18 * dpr);

      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = `${Math.floor(canvas.height * 0.028)}px ${getComputedStyle(document.body).fontFamily}`;
      ctx.fillText(msg2, canvas.width / 2, canvas.height / 2 + 22 * dpr);
    }
  }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  // 输入：键盘 + 触控滑动（可临时干预）
  function installInput() {
    window.addEventListener("keydown", (e) => {
      if (e.key === " " || e.code === "Space") {
        togglePause();
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") state.pendingDir = 0;
      else if (e.key === "ArrowRight") state.pendingDir = 1;
      else if (e.key === "ArrowDown") state.pendingDir = 2;
      else if (e.key === "ArrowLeft") state.pendingDir = 3;
    });

    // 触控防滚动（只要在游戏区域触摸就不滚）
    const prevent = (ev) => {
      if (ev.cancelable) ev.preventDefault();
    };
    canvas.addEventListener("touchstart", prevent, { passive: false });
    canvas.addEventListener("touchmove", prevent, { passive: false });
    canvas.addEventListener("touchend", prevent, { passive: false });

    // 触控滑动换向
    let touchStart = null;
    canvas.addEventListener("pointerdown", (e) => {
      touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    canvas.addEventListener("pointerup", (e) => {
      if (!touchStart) return;
      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      const dt = performance.now() - touchStart.t;
      touchStart = null;

      // 短按：暂停/继续（避免误触）
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 250) {
        togglePause();
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        state.pendingDir = dx > 0 ? 1 : 3;
      } else {
        state.pendingDir = dy > 0 ? 2 : 0;
      }
    });

    // iOS Safari 有时需要更强的全局阻止滚动
    document.addEventListener(
      "touchmove",
      (e) => {
        if (e.target === canvas && e.cancelable) e.preventDefault();
      },
      { passive: false }
    );
  }

  function setSpeedFromUI() {
    const v = Number(speedEl.value || 10);
    // tickMs 越小越快；把 UI 的“速度”映射到步进频率
    // 3..25 -> 220ms..55ms
    const ms = Math.round(260 - v * 8.2);
    state.tickMs = Math.max(45, Math.min(260, ms));
    updateHUD();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.running = !state.running;
    pauseBtn.textContent = state.running ? "暂停" : "继续";
    updateHUD();
  }

  function installUI() {
    speedEl.addEventListener("input", () => setSpeedFromUI());
    pauseBtn.addEventListener("click", () => togglePause());
    resetBtn.addEventListener("click", () => {
      reset();
      pauseBtn.textContent = "暂停";
      state.running = true;
      updateHUD();
    });
  }

  // 主循环：用 rAF + 累计时间实现稳定 tick（不依赖 setInterval 精度）
  let last = performance.now();
  let acc = 0;

  function loop(now) {
    const dt = now - last;
    last = now;
    acc += dt;

    const maxSteps = 5; // 防止标签页切回后补太多步
    let steps = 0;
    while (acc >= state.tickMs && steps < maxSteps) {
      acc -= state.tickMs;
      step();
      steps++;
    }

    draw();
    requestAnimationFrame(loop);
  }

  // init
  function init() {
    resize();
    window.addEventListener("resize", resize);

    installInput();
    installUI();

    setSpeedFromUI();
    reset();
    updateHUD();

    requestAnimationFrame(loop);
  }

  init();
})();
