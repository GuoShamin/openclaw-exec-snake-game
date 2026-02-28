(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const canvas = $('#game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const topbar = $('.topbar');
  const controls = $('.controls');
  const hint = $('.hint');
  const app = $('.app');

  const scoreEl = $('#score');
  const speedEl = $('#speed');
  const statusEl = $('#status');

  const btnStart = $('#btnStart');
  const btnPause = $('#btnPause');
  const btnRestart = $('#btnRestart');

  const overlay = $('#overlay');
  const finalScoreEl = $('#finalScore');
  const btnOverlayRestart = $('#btnOverlayRestart');

  const BASE_SPEED = 6;
  const MAX_SPEED = 20;
  const SCORE_PER_SPEED = 4;

  let cell = 20;
  let cols = 24;
  let boardSize = 480;
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  let snake = [];
  let food = { x: 0, y: 0 };
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };

  let score = 0;
  let speed = BASE_SPEED;

  let started = false;
  let paused = false;
  let gameOver = false;

  let lastTs = 0;
  let acc = 0;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    speedEl.textContent = `${(speed / BASE_SPEED).toFixed(1)}x`;
    btnPause.textContent = paused ? 'Resume' : 'Pause';
  }

  function layoutCanvas() {
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

    const chrome =
      topbar.getBoundingClientRect().height +
      controls.getBoundingClientRect().height +
      hint.getBoundingClientRect().height +
      72;

    const maxW = Math.min(720, window.innerWidth - 28);
    const maxH = window.innerHeight - chrome;
    const cssSize = Math.max(260, Math.floor(Math.min(maxW, maxH)));

    const desiredCells = cssSize < 380 ? 20 : 26;
    const nextCell = clamp(Math.floor(cssSize / desiredCells), 12, 30);
    let nextCols = Math.floor(cssSize / nextCell);
    nextCols = clamp(nextCols, 16, 44);

    cell = nextCell;
    cols = nextCols;
    boardSize = cols * cell;

    canvas.style.width = `${boardSize}px`;
    canvas.style.height = `${boardSize}px`;
    canvas.width = Math.floor(boardSize * dpr);
    canvas.height = Math.floor(boardSize * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function posKey(p) {
    return `${p.x},${p.y}`;
  }

  function isSame(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function placeFood() {
    const taken = new Set(snake.map(posKey));
    for (let i = 0; i < 10_000; i++) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * cols);
      if (!taken.has(`${x},${y}`)) {
        food = { x, y };
        return;
      }
    }
    food = { x: 0, y: 0 };
  }

  function resetGameState() {
    score = 0;
    speed = BASE_SPEED;
    paused = false;
    gameOver = false;
    lastTs = 0;
    acc = 0;

    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };

    const mid = Math.floor(cols / 2);
    const len = clamp(Math.floor(cols / 4), 4, 8);
    snake = [];
    for (let i = 0; i < len; i++) {
      snake.push({ x: mid - i, y: mid });
    }

    placeFood();
  }

  function showOverlay() {
    finalScoreEl.textContent = String(score);
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function startGame() {
    started = true;
    hideOverlay();
    resetGameState();
    setStatus('Running');
    updateHud();
    render();
  }

  function setGameOver() {
    gameOver = true;
    paused = false;
    setStatus('Game Over');
    updateHud();
    showOverlay();
  }

  function togglePause() {
    if (!started || gameOver) return;
    paused = !paused;
    setStatus(paused ? 'Paused' : 'Running');
    updateHud();
  }

  function attemptTurn(dx, dy) {
    if (!started || gameOver) return;
    if (dx === 0 && dy === 0) return;
    if (dx !== 0 && dy !== 0) return;
    if (dx === -dir.x && dy === -dir.y) return;
    nextDir = { x: dx, y: dy };
  }

  function tick() {
    dir = nextDir;
    const head = snake[0];
    const next = { x: head.x + dir.x, y: head.y + dir.y };

    if (next.x < 0 || next.y < 0 || next.x >= cols || next.y >= cols) {
      setGameOver();
      return;
    }

    const willEat = isSame(next, food);
    const checkLen = snake.length - (willEat ? 0 : 1);
    for (let i = 0; i < checkLen; i++) {
      if (snake[i].x === next.x && snake[i].y === next.y) {
        setGameOver();
        return;
      }
    }

    snake.unshift(next);
    if (willEat) {
      score += 1;
      speed = clamp(BASE_SPEED + Math.floor(score / SCORE_PER_SPEED), BASE_SPEED, MAX_SPEED);
      placeFood();
      updateHud();
    } else {
      snake.pop();
    }
  }

  function rr(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function render() {
    const w = boardSize;
    const h = boardSize;

    ctx.fillStyle = '#081022';
    ctx.fillRect(0, 0, w, h);

    const gridAlpha = 0.08;
    ctx.strokeStyle = `rgba(255,255,255,${gridAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= cols; i++) {
      const p = i * cell + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, h);
      ctx.moveTo(0, p);
      ctx.lineTo(w, p);
    }
    ctx.stroke();

    const fx = food.x * cell;
    const fy = food.y * cell;
    rr(fx + 3, fy + 3, cell - 6, cell - 6, Math.max(6, cell * 0.25));
    ctx.fillStyle = '#ff4d6d';
    ctx.fill();

    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const x = s.x * cell;
      const y = s.y * cell;
      const inset = i === 0 ? 2 : 3;
      rr(x + inset, y + inset, cell - inset * 2, cell - inset * 2, Math.max(7, cell * 0.32));

      if (i === 0) {
        ctx.fillStyle = '#6ee7ff';
      } else {
        ctx.fillStyle = i % 2 === 0 ? '#8b5cf6' : '#a78bfa';
      }
      ctx.fill();
    }

    if (!started) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '700 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Canvas 贪吃蛇', w / 2, h / 2 - 14);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '13px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
      ctx.fillText('按 Start 或等待自动开始', w / 2, h / 2 + 14);
    } else if (paused && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '800 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Paused', w / 2, h / 2);
    }
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!started) {
      render();
      return;
    }

    if (lastTs === 0) {
      lastTs = ts;
      render();
      return;
    }

    const dt = ts - lastTs;
    lastTs = ts;

    if (paused || gameOver) {
      render();
      return;
    }

    acc += dt;
    const stepMs = 1000 / speed;
    while (acc >= stepMs) {
      tick();
      acc -= stepMs;
      if (gameOver) break;
    }

    render();
  }

  function handleKeydown(e) {
    const k = e.key;
    const lower = k.toLowerCase();

    const prevent = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (k === 'ArrowUp' || lower === 'w') {
      attemptTurn(0, -1);
      prevent();
      return;
    }
    if (k === 'ArrowDown' || lower === 's') {
      attemptTurn(0, 1);
      prevent();
      return;
    }
    if (k === 'ArrowLeft' || lower === 'a') {
      attemptTurn(-1, 0);
      prevent();
      return;
    }
    if (k === 'ArrowRight' || lower === 'd') {
      attemptTurn(1, 0);
      prevent();
      return;
    }

    if (k === ' ' || k === 'Spacebar') {
      if (gameOver) startGame();
      else togglePause();
      prevent();
    }
  }

  function bindUi() {
    btnStart.addEventListener('click', () => {
      if (!started || gameOver) startGame();
      else if (paused) togglePause();
    });
    btnPause.addEventListener('click', () => {
      if (!started && !gameOver) {
        startGame();
        return;
      }
      if (gameOver) return;
      togglePause();
    });
    btnRestart.addEventListener('click', () => startGame());

    overlay.addEventListener('click', () => startGame());
    btnOverlayRestart.addEventListener('click', (e) => {
      e.preventDefault();
      startGame();
    });

    window.addEventListener('keydown', handleKeydown, { passive: false });

    let touchStart = null;
    const THRESH = 24;

    canvas.addEventListener(
      'touchstart',
      (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        touchStart = { x: t.clientX, y: t.clientY };
        e.preventDefault();
      },
      { passive: false }
    );

    canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!touchStart || !e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);

        if (Math.max(ax, ay) >= THRESH) {
          if (ax > ay) attemptTurn(dx > 0 ? 1 : -1, 0);
          else attemptTurn(0, dy > 0 ? 1 : -1);
          touchStart = { x: t.clientX, y: t.clientY };
        }
        e.preventDefault();
      },
      { passive: false }
    );

    canvas.addEventListener(
      'touchend',
      () => {
        touchStart = null;
      },
      { passive: true }
    );

    let resizeT = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => {
        const prevCols = cols;
        layoutCanvas();

        if (!started) {
          render();
          return;
        }

        const out =
          snake.some((p) => p.x < 0 || p.y < 0 || p.x >= cols || p.y >= cols) ||
          food.x < 0 ||
          food.y < 0 ||
          food.x >= cols ||
          food.y >= cols;

        if (out || prevCols !== cols) {
          startGame();
        } else {
          render();
        }
      }, 140);
    });
  }

  function boot() {
    layoutCanvas();
    setStatus('Ready');
    updateHud();
    bindUi();
    render();
    requestAnimationFrame(loop);

    window.setTimeout(() => {
      if (!started) startGame();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

