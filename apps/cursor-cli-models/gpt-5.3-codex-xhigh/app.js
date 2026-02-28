"use strict";

(() => {
  const GRID_SIZE = 20;
  const CANVAS_SIZE = 420;
  const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
  const TICK_MS = 95;
  const RESTART_DELAY_MS = 800;

  const DIRS = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }
  };
  const DIR_NAMES = ["up", "right", "down", "left"];
  const OPPOSITE = {
    up: "down",
    down: "up",
    left: "right",
    right: "left"
  };

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const roundEl = document.getElementById("round");
  const statusEl = document.getElementById("status");
  const autoBtn = document.getElementById("autoBtn");
  const restartBtn = document.getElementById("restartBtn");
  const controlsEl = document.querySelector(".manual-controls");
  const gameAreaEl = document.getElementById("game-area");

  let snake = [];
  let food = { x: 0, y: 0 };
  let direction = "right";
  let pendingDirection = "right";
  let score = 0;
  let bestScore = loadBestScore();
  let round = 1;
  let autoPilot = true;
  let crashTimer = null;

  let touchStart = null;

  bestEl.textContent = String(bestScore);

  startRound(false);
  draw();
  setupInput();
  setInterval(tick, TICK_MS);

  function setupInput() {
    autoBtn.addEventListener("click", () => {
      autoPilot = !autoPilot;
      autoBtn.setAttribute("aria-pressed", String(autoPilot));
      autoBtn.textContent = autoPilot ? "自动驾驶：开" : "自动驾驶：关";
      setStatus(autoPilot ? "自动驾驶已接管。" : "手动模式。可用方向键/滑动/按钮控制。");
    });

    restartBtn.addEventListener("click", () => {
      stopCrashTimer();
      startRound(true);
      setStatus(autoPilot ? "已重开，自动驾驶运行中。" : "已重开，当前是手动模式。");
    });

    document.addEventListener("keydown", (event) => {
      const map = {
        ArrowUp: "up",
        ArrowRight: "right",
        ArrowDown: "down",
        ArrowLeft: "left",
        w: "up",
        d: "right",
        s: "down",
        a: "left",
        W: "up",
        D: "right",
        S: "down",
        A: "left"
      };
      const next = map[event.key];
      if (!next) {
        return;
      }
      event.preventDefault();
      if (!autoPilot) {
        requestDirection(next);
      }
    });

    controlsEl.addEventListener("pointerdown", (event) => {
      const btn = event.target.closest("button[data-dir]");
      if (!btn) {
        return;
      }
      event.preventDefault();
      if (!autoPilot) {
        requestDirection(btn.dataset.dir);
      }
    });
    controlsEl.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-dir]");
      if (!btn || autoPilot) {
        return;
      }
      requestDirection(btn.dataset.dir);
    });

    canvas.addEventListener(
      "touchstart",
      (event) => {
        if (!event.changedTouches || event.changedTouches.length === 0) {
          return;
        }
        const t = event.changedTouches[0];
        touchStart = { x: t.clientX, y: t.clientY };
      },
      { passive: true }
    );

    canvas.addEventListener(
      "touchend",
      (event) => {
        if (autoPilot || !touchStart || !event.changedTouches || event.changedTouches.length === 0) {
          touchStart = null;
          return;
        }
        const t = event.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        touchStart = null;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (Math.max(absX, absY) < 24) {
          return;
        }
        if (absX > absY) {
          requestDirection(dx > 0 ? "right" : "left");
          return;
        }
        requestDirection(dy > 0 ? "down" : "up");
      },
      { passive: true }
    );

    // 阻止触摸拖动时页面滚动，保证移动端体验稳定。
    gameAreaEl.addEventListener(
      "touchmove",
      (event) => {
        event.preventDefault();
      },
      { passive: false }
    );
  }

  function tick() {
    if (crashTimer) {
      return;
    }

    if (autoPilot) {
      const botDirection = chooseAutoDirection();
      if (botDirection) {
        pendingDirection = botDirection;
      }
    }

    if (canTurn(direction, pendingDirection)) {
      direction = pendingDirection;
    }

    const nextHead = movePoint(snake[0], DIRS[direction]);
    const willEat = samePoint(nextHead, food);
    if (hitsWall(nextHead) || hitsSelf(nextHead, snake, willEat ? 0 : 1)) {
      handleCrash();
      return;
    }

    snake.unshift(nextHead);
    if (willEat) {
      score += 1;
      if (score > bestScore) {
        bestScore = score;
        bestEl.textContent = String(bestScore);
        saveBestScore(bestScore);
      }
      if (snake.length >= GRID_SIZE * GRID_SIZE) {
        setStatus("已填满棋盘，自动开始下一局。");
        draw();
        stopCrashTimer();
        crashTimer = setTimeout(() => {
          crashTimer = null;
          startRound(true);
        }, RESTART_DELAY_MS);
        return;
      }
      food = spawnFood(snake);
    } else {
      snake.pop();
    }

    scoreEl.textContent = String(score);
    draw();
  }

  function handleCrash() {
    setStatus("撞到了，正在自动重开...", true);
    stopCrashTimer();
    crashTimer = setTimeout(() => {
      crashTimer = null;
      startRound(true);
      setStatus(autoPilot ? "自动驾驶已继续。" : "手动模式，等待你的操作。");
    }, RESTART_DELAY_MS);
  }

  function stopCrashTimer() {
    if (crashTimer) {
      clearTimeout(crashTimer);
      crashTimer = null;
    }
  }

  function startRound(increaseRound) {
    if (increaseRound) {
      round += 1;
    }
    snake = buildInitialSnake();
    food = spawnFood(snake);
    direction = "right";
    pendingDirection = "right";
    score = 0;
    scoreEl.textContent = "0";
    roundEl.textContent = String(round);
  }

  function buildInitialSnake() {
    const mid = Math.floor(GRID_SIZE / 2);
    return [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid }
    ];
  }

  function requestDirection(next) {
    if (!DIRS[next]) {
      return;
    }
    if (canTurn(direction, next)) {
      pendingDirection = next;
    }
  }

  function canTurn(fromDir, toDir) {
    if (!DIRS[toDir]) {
      return false;
    }
    if (snake.length <= 1) {
      return true;
    }
    return OPPOSITE[fromDir] !== toDir;
  }

  // 自动驾驶策略（混合）：
  // 1) BFS 寻找“头 -> 食物”最短路；
  // 2) 模拟沿该路径吃到食物后，检查“头 -> 尾”仍可达，避免把自己困死；
  // 3) 若不安全，则改为 BFS 追尾延长生存；
  // 4) 若仍无路，选“可达空间更大且更靠近食物”的安全方向兜底。
  function chooseAutoDirection() {
    const head = snake[0];
    const tail = snake[snake.length - 1];
    const blocked = new Set(snake.slice(1, -1).map(pointKey));

    const pathToFood = bfsPath(head, food, blocked);
    if (pathToFood && pathToFood.length > 1) {
      const simulated = simulatePathToFood(snake, pathToFood);
      if (headCanReachTail(simulated)) {
        return directionFromStep(pathToFood[0], pathToFood[1]);
      }
    }

    const pathToTail = bfsPath(head, tail, blocked);
    if (pathToTail && pathToTail.length > 1) {
      return directionFromStep(pathToTail[0], pathToTail[1]);
    }

    const candidates = [];
    for (const dirName of DIR_NAMES) {
      if (!canTurn(direction, dirName)) {
        continue;
      }
      const nextHead = movePoint(head, DIRS[dirName]);
      const willEat = samePoint(nextHead, food);
      if (hitsWall(nextHead) || hitsSelf(nextHead, snake, willEat ? 0 : 1)) {
        continue;
      }
      const nextSnake = simulateOneStep(snake, nextHead, willEat);
      const freeArea = estimateFreeArea(nextHead, nextSnake);
      const foodDistance = manhattan(nextHead, food);
      const wallPenalty = isOnEdge(nextHead) ? 2 : 0;
      const scoreValue = freeArea * 3 - foodDistance * 2 - wallPenalty;
      candidates.push({ dirName, scoreValue });
    }

    if (candidates.length === 0) {
      return direction;
    }

    candidates.sort((a, b) => b.scoreValue - a.scoreValue);
    return candidates[0].dirName;
  }

  function bfsPath(start, goal, blocked) {
    const startKey = pointKey(start);
    const goalKey = pointKey(goal);
    if (startKey === goalKey) {
      return [start];
    }

    const queue = [start];
    const visited = new Set([startKey]);
    const parent = new Map();

    for (let i = 0; i < queue.length; i += 1) {
      const cur = queue[i];
      for (const dirName of DIR_NAMES) {
        const next = movePoint(cur, DIRS[dirName]);
        if (hitsWall(next)) {
          continue;
        }
        const key = pointKey(next);
        if (visited.has(key)) {
          continue;
        }
        if (blocked.has(key) && key !== goalKey) {
          continue;
        }
        visited.add(key);
        parent.set(key, pointKey(cur));
        if (key === goalKey) {
          return restorePath(parent, startKey, goalKey);
        }
        queue.push(next);
      }
    }
    return null;
  }

  function restorePath(parent, startKey, goalKey) {
    const path = [];
    let cur = goalKey;
    while (cur) {
      path.push(parseKey(cur));
      if (cur === startKey) {
        break;
      }
      cur = parent.get(cur);
    }
    path.reverse();
    if (path.length === 0 || pointKey(path[0]) !== startKey) {
      return null;
    }
    return path;
  }

  function simulatePathToFood(originSnake, path) {
    const sim = originSnake.map(copyPoint);
    for (let i = 1; i < path.length; i += 1) {
      const step = copyPoint(path[i]);
      sim.unshift(step);
      const isLastStep = i === path.length - 1;
      if (!isLastStep) {
        sim.pop();
      }
    }
    return sim;
  }

  function headCanReachTail(simSnake) {
    if (simSnake.length < 2) {
      return true;
    }
    const head = simSnake[0];
    const tail = simSnake[simSnake.length - 1];
    const blocked = new Set(simSnake.slice(1, -1).map(pointKey));
    const path = bfsPath(head, tail, blocked);
    return !!path;
  }

  function simulateOneStep(originSnake, nextHead, willEat) {
    const sim = originSnake.map(copyPoint);
    sim.unshift(copyPoint(nextHead));
    if (!willEat) {
      sim.pop();
    }
    return sim;
  }

  function estimateFreeArea(start, simSnake) {
    const blocked = new Set(simSnake.slice(1).map(pointKey));
    const queue = [start];
    const visited = new Set([pointKey(start)]);
    const limit = GRID_SIZE * GRID_SIZE;

    for (let i = 0; i < queue.length && visited.size < limit; i += 1) {
      const cur = queue[i];
      for (const dirName of DIR_NAMES) {
        const next = movePoint(cur, DIRS[dirName]);
        const key = pointKey(next);
        if (hitsWall(next) || blocked.has(key) || visited.has(key)) {
          continue;
        }
        visited.add(key);
        queue.push(next);
      }
    }
    return visited.size;
  }

  function directionFromStep(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    for (const dirName of DIR_NAMES) {
      const d = DIRS[dirName];
      if (d.x === dx && d.y === dy) {
        return dirName;
      }
    }
    return direction;
  }

  function spawnFood(body) {
    const occupied = new Set(body.map(pointKey));
    const free = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const p = { x, y };
        if (!occupied.has(pointKey(p))) {
          free.push(p);
        }
      }
    }
    if (free.length === 0) {
      return { x: 0, y: 0 };
    }
    const idx = Math.floor(Math.random() * free.length);
    return free[idx];
  }

  function hitsWall(p) {
    return p.x < 0 || p.x >= GRID_SIZE || p.y < 0 || p.y >= GRID_SIZE;
  }

  function hitsSelf(p, body, ignoreTailCells) {
    const max = body.length - ignoreTailCells;
    for (let i = 0; i < max; i += 1) {
      if (samePoint(p, body[i])) {
        return true;
      }
    }
    return false;
  }

  function isOnEdge(p) {
    return p.x === 0 || p.y === 0 || p.x === GRID_SIZE - 1 || p.y === GRID_SIZE - 1;
  }

  function movePoint(p, d) {
    return { x: p.x + d.x, y: p.y + d.y };
  }

  function copyPoint(p) {
    return { x: p.x, y: p.y };
  }

  function samePoint(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function pointKey(p) {
    return `${p.x},${p.y}`;
  }

  function parseKey(key) {
    const parts = key.split(",");
    return { x: Number(parts[0]), y: Number(parts[1]) };
  }

  function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function setStatus(text, isDanger) {
    statusEl.textContent = text;
    statusEl.classList.toggle("status-danger", !!isDanger);
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i += 1) {
      const k = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, k);
      ctx.lineTo(CANVAS_SIZE, k);
      ctx.stroke();
    }

    ctx.fillStyle = "#f43f5e";
    drawCell(food.x, food.y, 0.2);

    for (let i = snake.length - 1; i >= 0; i -= 1) {
      const part = snake[i];
      ctx.fillStyle = i === 0 ? "#34d399" : "#10b981";
      drawCell(part.x, part.y, 0.12);
    }
  }

  function drawCell(x, y, insetRatio) {
    const inset = CELL_SIZE * insetRatio;
    ctx.fillRect(
      x * CELL_SIZE + inset,
      y * CELL_SIZE + inset,
      CELL_SIZE - inset * 2,
      CELL_SIZE - inset * 2
    );
  }

  function loadBestScore() {
    try {
      const raw = localStorage.getItem("snake_autopilot_best");
      const num = Number(raw || "0");
      return Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0;
    } catch (_err) {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem("snake_autopilot_best", String(value));
    } catch (_err) {
      // 忽略本地存储失败（例如隐私模式）。
    }
  }
})();
