(() => {
  "use strict";

  const GRID = 24;

  const STATUS = {
    READY: "Ready",
    RUNNING: "Running",
    PAUSED: "Paused",
    OVER: "Game Over",
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const mScore = document.getElementById("mScore");
  const mSpeed = document.getElementById("mSpeed");
  const mStatus = document.getElementById("mStatus");

  const btnStart = document.getElementById("btnStart");
  const btnPause = document.getElementById("btnPause");
  const btnRestart = document.getElementById("btnRestart");

  const overlay = document.getElementById("overlay");
  const ovScore = document.getElementById("ovScore");
  const ovRestart = document.getElementById("ovRestart");

  let status = STATUS.READY;

  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 0, y: 0 };

  let score = 0;
  let foodsEaten = 0;

  let speed = 0;      // moves per second
  let stepMs = 0;

  let lastT = 0;
  let acc = 0;

  let boardCssSize = 0; // in CSS px
  let cell = 0;
  let inset = 0;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function recomputeSpeed() {
    // 合理曲线：前期加速明显，中后期趋缓，并有上限
    const base = 7.0;
    const cap = 18.0;
    const n = foodsEaten;

    const curved = base + n * 0.45 + Math.sqrt(n) * 0.75;
    speed = clamp(curved, base, cap);
    stepMs = 1000 / speed;
  }

  function setStatus(s) {
    status = s;
    mStatus.textContent = s;
    updateButtons();
  }

  function updateMeta() {
    mScore.textContent = String(score);
    mSpeed.textContent = speed ? speed.toFixed(1) : "0";
    mStatus.textContent = status;
  }

  function updateButtons() {
    if (status === STATUS.RUNNING) {
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnPause.textContent = "Pause";
    } else if (status === STATUS.PAUSED) {
      btnStart.disabled = false;
      btnPause.disabled = false;
      btnPause.textContent = "Resume";
    } else if (status === STATUS.OVER) {
      btnStart.disabled = false;
      btnPause.disabled = true;
      btnPause.textContent = "Pause";
    } else {
      btnStart.disabled = false;
      btnPause.disabled = true;
      btnPause.textContent = "Pause";
    }
  }

  function showOverlay(show) {
    if (show) {
      overlay.classList.add("show");
      overlay.setAttribute("aria-hidden", "false");
    } else {
      overlay.classList.remove("show");
      overlay.setAttribute("aria-hidden", "true");
    }
  }

  function keyOf(p) {
    return `${p.x},${p.y}`;
  }

  function snakeHas(x, y) {
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === x && snake[i].y === y) return true;
    }
    return false;
  }

  function placeFood() {
    const max = GRID * GRID;
    for (let tries = 0; tries < max; tries++) {
      const x = (Math.random() * GRID) | 0;
      const y = (Math.random() * GRID) | 0;
      if (!snakeHas(x, y)) {
        food = { x, y };
        return;
      }
    }
    // 理论上不会发生：占满全图
    food = { x: 0, y: 0 };
  }

  function resetGame() {
    score = 0;
    foodsEaten = 0;

    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };

    const cx = (GRID / 2) | 0;
    const cy = (GRID / 2) | 0;

    snake = [
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
      { x: cx - 3, y: cy },
    ];

    recomputeSpeed();
    placeFood();
    setStatus(STATUS.READY);
    showOverlay(false);
    updateMeta();

    acc = 0;
    lastT = performance.now();
  }

  function startGame() {
    if (status === STATUS.RUNNING) return;
    if (status === STATUS.OVER) {
      resetGame();
    }
    setStatus(STATUS.RUNNING);
    updateMeta();
  }

  function pauseGame() {
    if (status !== STATUS.RUNNING) return;
    setStatus(STATUS.PAUSED);
    updateMeta();
  }

  function togglePause() {
    if (status === STATUS.RUNNING) {
      pauseGame();
      return;
    }
    if (status === STATUS.PAUSED || status === STATUS.READY) {
      startGame();
      return;
    }
  }

  function restartGame() {
    resetGame();
    startGame();
  }

  function gameOver() {
    setStatus(STATUS.OVER);
    ovScore.textContent = String(score);
    showOverlay(true);
    updateMeta();
  }

  function requestDirection(dx, dy) {
    if (dx === 0 && dy === 0) return;

    // 禁止 180° 反向：以“当前方向”为准
    if (dx === -dir.x && dy === -dir.y) return;

    // 也要避免“同帧连续输入”造成的反向：以 nextDir 为准
    if (dx === -nextDir.x && dy === -nextDir.y) return;

    nextDir = { x: dx, y: dy };
  }

  function step() {
    dir = nextDir;

    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    // 撞墙
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
      gameOver();
      return;
    }

    // 撞自己（尾巴是否移动取决于是否吃到）
    const willEat = nx === food.x && ny === food.y;

    // 允许“头进入当前尾巴位置”仅当尾巴这步会移动（未吃到）
    const tail = snake[snake.length - 1];
    const enteringTail = !willEat && nx === tail.x && ny === tail.y;

    if (!enteringTail && snakeHas(nx, ny)) {
      gameOver();
      return;
    }

    snake.unshift({ x: nx, y: ny });

    if (willEat) {
      score += 10;
      foodsEaten += 1;
      recomputeSpeed();
      placeFood();
    } else {
      snake.pop();
    }

    updateMeta();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const cssSize = Math.floor(Math.min(rect.width, rect.height));

    // 让画面更“移动端优先”：最大不超过 620px（桌面也合适）
    boardCssSize = clamp(cssSize, 220, 620);

    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = Math.floor(boardCssSize * dpr);
    canvas.height = Math.floor(boardCssSize * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 内边距让边缘更舒服
    inset = Math.floor(boardCssSize * 0.04);
    const inner = boardCssSize - inset * 2;

    // 保证单元格整数像素，避免抖动
    cell = Math.floor(inner / GRID);
  }

  function drawRoundedRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function draw() {
    // 背景
    ctx.fillStyle = "#0b0f1a";
    ctx.fillRect(0, 0, boardCssSize, boardCssSize);

    // 面板底
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    drawRoundedRect(0, 0, boardCssSize, boardCssSize, 18);
    ctx.fill();

    const innerSize = cell * GRID;
    const ox = Math.floor((boardCssSize - innerSize) / 2);
    const oy = Math.floor((boardCssSize - innerSize) / 2);

    // 网格（轻微）
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      const x = ox + i * cell + 0.5;
      const y = oy + i * cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + innerSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + innerSize, y);
      ctx.stroke();
    }

    // 食物
    {
      const fx = ox + food.x * cell;
      const fy = oy + food.y * cell;
      const pad = Math.max(2, Math.floor(cell * 0.16));
      const s = cell - pad * 2;
      ctx.fillStyle = "#ff6b6b";
      drawRoundedRect(fx + pad, fy + pad, s, s, Math.floor(s * 0.32));
      ctx.fill();

      // 小高光
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      const hs = Math.floor(s * 0.35);
      drawRoundedRect(fx + pad + 2, fy + pad + 2, hs, hs, Math.floor(hs * 0.45));
      ctx.fill();
    }

    // 蛇
    for (let i = 0; i < snake.length; i++) {
      const p = snake[i];
      const x = ox + p.x * cell;
      const y = oy + p.y * cell;

      const pad = Math.max(1, Math.floor(cell * 0.14));
      const s = cell - pad * 2;

      const t = i === 0 ? 0 : i / (snake.length - 1 || 1);
      const baseR = Math.floor(s * 0.34);

      // 颜色渐变：头更亮
      const headColor = "rgba(183,208,255,0.96)";
      const bodyColor = "rgba(122,168,255,0.92)";
      ctx.fillStyle = i === 0 ? headColor : bodyColor;

      // 轻微阴影
      ctx.shadowColor = "rgba(0,0,0,0.20)";
      ctx.shadowBlur = Math.max(0, Math.floor(cell * 0.10));
      ctx.shadowOffsetY = 1;

      drawRoundedRect(x + pad, y + pad, s, s, baseR);
      ctx.fill();

      // 取消阴影避免影响其他
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (i === 0) {
        // 眼睛（随方向）
        const ex = x + pad + Math.floor(s * 0.26);
        const ey = y + pad + Math.floor(s * 0.30);
        const e2x = x + pad + Math.floor(s * 0.62);
        const e2y = ey;

        const off = Math.floor(s * 0.10);
        const dx = dir.x * off;
        const dy = dir.y * off;

        ctx.fillStyle = "rgba(10,12,18,0.75)";
        drawRoundedRect(ex + dx, ey + dy, Math.max(2, (s * 0.16) | 0), Math.max(2, (s * 0.22) | 0), 3);
        ctx.fill();
        drawRoundedRect(e2x + dx, e2y + dy, Math.max(2, (s * 0.16) | 0), Math.max(2, (s * 0.22) | 0), 3);
        ctx.fill();
      }

      // 尾部稍暗一点（细微）
      if (t > 0.7) {
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        drawRoundedRect(x + pad, y + pad, s, s, baseR);
        ctx.fill();
      }
    }

    // 状态文字（在 Ready/Paused 时提示）
    if (status === STATUS.READY || status === STATUS.PAUSED) {
      const text = status === STATUS.READY ? "Ready" : "Paused";
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = `700 ${Math.max(14, Math.floor(boardCssSize * 0.05))}px ui-sans-serif, system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, boardCssSize / 2, boardCssSize / 2);
      ctx.restore();
    }
  }

  function bindInputs() {
    // Buttons
    btnStart.addEventListener("click", () => startGame());
    btnPause.addEventListener("click", () => togglePause());
    btnRestart.addEventListener("click", () => restartGame());

    // Overlay interactions
    overlay.addEventListener("click", () => restartGame());
    ovRestart.addEventListener("click", (e) => {
      e.stopPropagation();
      restartGame();
    });
    overlay.querySelector(".overlayCard").addEventListener("click", (e) => e.stopPropagation());

    // Keyboard
    window.addEventListener("keydown", (e) => {
      const k = e.key;

      if (k === " " || k === "Spacebar") {
        e.preventDefault();
        togglePause();
        return;
      }

      let handled = true;
      switch (k) {
        case "ArrowUp":
        case "w":
        case "W":
          requestDirection(0, -1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          requestDirection(0, 1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          requestDirection(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          requestDirection(1, 0);
          break;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        // 如果还没开始，方向输入视作“准备开始”
        if (status === STATUS.READY) startGame();
      }
    }, { passive: false });

    // Touch swipe on canvas (阻止触摸滚动)
    let touchStartX = 0;
    let touchStartY = 0;
    let touching = false;

    canvas.addEventListener("touchstart", (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touching = true;
      // 触发时也阻止浏览器“回弹/滚动”
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      // 关键要求：必须阻止触摸滚动
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
      if (!touching) return;
      touching = false;

      const changed = e.changedTouches && e.changedTouches[0];
      if (!changed) return;

      const dx = changed.clientX - touchStartX;
      const dy = changed.clientY - touchStartY;

      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      const threshold = 12;
      if (adx < threshold && ady < threshold) return;

      if (adx > ady) {
        requestDirection(dx > 0 ? 1 : -1, 0);
      } else {
        requestDirection(0, dy > 0 ? 1 : -1);
      }

      if (status === STATUS.READY) startGame();
      e.preventDefault();
    }, { passive: false });
  }

  function loop(t) {
    if (!lastT) lastT = t;
    const dt = t - lastT;
    lastT = t;

    if (status === STATUS.RUNNING) {
      acc += dt;
      const maxSteps = 6; // 防止后台切回时“一口气走太多”
      let steps = 0;
      while (acc >= stepMs && steps < maxSteps && status === STATUS.RUNNING) {
        step();
        acc -= stepMs;
        steps++;
      }
    }

    draw();
    requestAnimationFrame(loop);
  }

  function init() {
    bindInputs();
    resetGame();

    const onResize = () => {
      resize();
      draw();
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });

    // 初次布局完成后再测量
    requestAnimationFrame(() => {
      resize();
      draw();
    });

    // 页面加载后约 300ms 自动开始
    setTimeout(() => {
      startGame();
    }, 300);

    requestAnimationFrame(loop);
  }

  init();
})();
