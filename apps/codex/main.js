(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const meta = document.getElementById('meta');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');

  if (!canvas || !meta || !btnStart || !btnPause || !btnRestart) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    meta.textContent = '当前浏览器不支持 Canvas。';
    return;
  }

  const isVirtualTime =
    typeof window.__vt_pending !== 'undefined' || typeof window.__drainVirtualTimePending === 'function';

  const config = {
    gridSize: 24,
    baseSpeed: 7, // cells per second
    speedEveryScore: 4,
    maxSpeed: 18,
    autoStartDelayMs: 280,
    swipeMinPx: 18,
  };

  const palette = {
    bg: '#0b0c10',
    board: '#11131a',
    grid: 'rgba(255,255,255,.05)',
    snakeHead: '#7c5cff',
    snakeBody: '#5dd6c1',
    food: '#ff5c7a',
    text: 'rgba(255,255,255,.92)',
    subText: 'rgba(255,255,255,.72)',
  };

  const metrics = {
    dpr: 1,
    w: canvas.width,
    h: canvas.height,
    cell: 0,
    ox: 0,
    oy: 0,
    board: 0,
  };

  /** @type {{x:number,y:number}[]} */
  let snake = [];
  /** @type {{x:number,y:number}} */
  let dir = { x: 1, y: 0 };
  /** @type {{x:number,y:number}[]} */
  let dirQueue = [];
  /** @type {{x:number,y:number}|null} */
  let food = null;

  let score = 0;
  let speed = config.baseSpeed;
  let running = false;
  let paused = false;
  let gameOver = false;
  let accumulatorMs = 0;

  const overlay = ensureOverlay();

  function ensureOverlay() {
    const host = canvas.closest('.board') || canvas.parentElement || document.body;
    let el = document.getElementById('overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'overlay';
      el.className = 'overlay';
      el.hidden = true;
      el.innerHTML = `
        <div class="overlayCard" role="dialog" aria-live="polite">
          <div class="overlayTitle" data-ol-title>Game Over</div>
          <div class="overlayDesc" data-ol-desc>Tap to restart</div>
          <div class="overlayActions">
            <button class="btn primary" type="button" data-ol-btn>Restart</button>
          </div>
        </div>
      `.trim();
      host.appendChild(el);
    }
    const btn = el.querySelector('[data-ol-btn]');
    if (btn) btn.addEventListener('click', () => restart(), { passive: true });
    el.addEventListener(
      'click',
      (e) => {
        if (e.target === el) restart();
      },
      { passive: true },
    );
    return el;
  }

  function setOverlay(visible, title, desc) {
    if (!overlay) return;
    const titleEl = overlay.querySelector('[data-ol-title]');
    const descEl = overlay.querySelector('[data-ol-desc]');
    if (titleEl && typeof title === 'string') titleEl.textContent = title;
    if (descEl && typeof desc === 'string') descEl.textContent = desc;
    overlay.hidden = !visible;
  }

  function updateMeta() {
    const status = gameOver ? 'Game Over' : paused ? 'Paused' : running ? 'Running' : 'Ready';
    meta.textContent = `Score: ${score}  ·  Speed: ${speed} /s  ·  ${status}`;
    syncControls();
  }

  function syncControls() {
    btnStart.disabled = running && !paused && !gameOver;
    btnPause.disabled = !running || paused || gameOver;
  }

  function computeSpeed(nextScore) {
    const inc = Math.floor(nextScore / config.speedEveryScore);
    return Math.min(config.maxSpeed, config.baseSpeed + inc);
  }

  function resetGame() {
    const mid = Math.floor(config.gridSize / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dir = { x: 1, y: 0 };
    dirQueue = [];
    score = 0;
    speed = computeSpeed(score);
    running = false;
    paused = false;
    gameOver = false;
    accumulatorMs = 0;
    food = placeFood();
    setOverlay(false);
    updateMeta();
  }

  function start() {
    if (gameOver) resetGame();
    if (!running) accumulatorMs = 0;
    running = true;
    paused = false;
    setOverlay(false);
    updateMeta();
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    updateMeta();
  }

  function restart() {
    resetGame();
    start();
  }

  function endGame(reason) {
    running = false;
    paused = false;
    gameOver = true;
    const desc =
      reason === 'win'
        ? `You win! Score: ${score}. Tap to restart.`
        : `Score: ${score}. Tap to restart.`;
    setOverlay(true, reason === 'win' ? 'You Win' : 'Game Over', desc);
    updateMeta();
  }

  function placeFood() {
    const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
    const n = config.gridSize;
    for (let i = 0; i < 500; i += 1) {
      const x = (Math.random() * n) | 0;
      const y = (Math.random() * n) | 0;
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (!occupied.has(`${x},${y}`)) return { x, y };
      }
    }
    return null;
  }

  function queueDir(next) {
    if (gameOver) return;
    const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if (next.x === last.x && next.y === last.y) return;
    if (next.x === -last.x && next.y === -last.y) return; // 禁止 180° 反向
    if (dirQueue.length >= 2) return;
    dirQueue.push(next);
  }

  function tick() {
    if (dirQueue.length) dir = dirQueue.shift();

    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    if (nx < 0 || nx >= config.gridSize || ny < 0 || ny >= config.gridSize) {
      endGame('wall');
      return;
    }

    const willEat = !!food && nx === food.x && ny === food.y;
    const bodyToCheck = willEat ? snake : snake.slice(0, -1);
    if (bodyToCheck.some((s) => s.x === nx && s.y === ny)) {
      endGame('self');
      return;
    }

    snake.unshift({ x: nx, y: ny });
    if (willEat) {
      score += 1;
      speed = computeSpeed(score);
      food = placeFood();
      if (!food) {
        endGame('win');
        return;
      }
    } else {
      snake.pop();
    }
    updateMeta();
  }

  function stepTime(ms) {
    if (!running || paused || gameOver) return;
    accumulatorMs += ms;
    const stepMs = 1000 / Math.max(1, speed);
    while (accumulatorMs >= stepMs) {
      tick();
      accumulatorMs -= stepMs;
      if (gameOver) break;
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    metrics.dpr = dpr;
    metrics.w = w;
    metrics.h = h;

    const board = Math.min(w, h);
    const cell = Math.max(1, Math.floor(board / config.gridSize));
    const snappedBoard = cell * config.gridSize;
    metrics.cell = cell;
    metrics.board = snappedBoard;
    metrics.ox = ((w - snappedBoard) / 2) | 0;
    metrics.oy = ((h - snappedBoard) / 2) | 0;
  }

  function roundRectPath(x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function draw() {
    const { w, h, cell, ox, oy, board } = metrics;

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = palette.board;
    ctx.fillRect(ox, oy, board, board);

    // subtle grid
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < config.gridSize; i += 1) {
      const x = ox + i * cell + 0.5;
      const y = oy + i * cell + 0.5;
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + board);
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + board, y);
    }
    ctx.stroke();

    if (food) {
      const fx = ox + food.x * cell;
      const fy = oy + food.y * cell;
      ctx.fillStyle = palette.food;
      const r = cell * 0.36;
      ctx.beginPath();
      ctx.arc(fx + cell / 2, fy + cell / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = snake.length - 1; i >= 0; i -= 1) {
      const seg = snake[i];
      const x = ox + seg.x * cell;
      const y = oy + seg.y * cell;
      const pad = Math.max(1, Math.floor(cell * 0.12));
      const r = Math.max(4, Math.floor(cell * 0.22));
      ctx.fillStyle = i === 0 ? palette.snakeHead : palette.snakeBody;
      roundRectPath(x + pad, y + pad, cell - pad * 2, cell - pad * 2, r);
      ctx.fill();
    }

    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,.42)';
      ctx.fillRect(ox, oy, board, board);
      drawCenteredText('PAUSED', 'Press Start / Space to continue');
    } else if (!running && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,.32)';
      ctx.fillRect(ox, oy, board, board);
      drawCenteredText('READY', 'Swipe / Arrow Keys / WASD');
    }
  }

  function drawCenteredText(title, subtitle) {
    const { ox, oy, board } = metrics;
    const cx = ox + board / 2;
    const cy = oy + board / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.text;
    ctx.font =
      `${Math.max(18, Math.floor(board * 0.08))}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText(title, cx, cy - Math.floor(board * 0.04));

    ctx.fillStyle = palette.subText;
    ctx.font =
      `${Math.max(12, Math.floor(board * 0.034))}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText(subtitle, cx, cy + Math.floor(board * 0.05));
  }

  function loop(ts) {
    const dt = Math.min(50, ts - loop._lastTs);
    loop._lastTs = ts;

    if (!isVirtualTime) stepTime(dt);

    draw();
    requestAnimationFrame(loop);
  }
  loop._lastTs = performance.now();

  function wireControls() {
    btnStart.addEventListener('click', () => start(), { passive: true });
    btnPause.addEventListener('click', () => togglePause(), { passive: true });
    btnRestart.addEventListener('click', () => restart(), { passive: true });

    window.addEventListener('keydown', (e) => {
      const key = e.key;
      if (key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        if (!running && !gameOver) start();
        else togglePause();
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        start();
        return;
      }
      if (key === 'r' || key === 'R') {
        restart();
        return;
      }

      const dirFromKey = keyToDir(key);
      if (!dirFromKey) return;
      e.preventDefault();
      if (!running && !gameOver) start();
      queueDir(dirFromKey);
    });

    // swipe (touch)
    let touchStart = null;
    canvas.addEventListener(
      'touchstart',
      (e) => {
        if (!e.changedTouches || !e.changedTouches.length) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        touchStart = { x: t.clientX, y: t.clientY };
      },
      { passive: false },
    );
    canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
      },
      { passive: false },
    );
    canvas.addEventListener(
      'touchend',
      (e) => {
        if (!touchStart || !e.changedTouches || !e.changedTouches.length) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        touchStart = null;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const min = config.swipeMinPx;
        if (absX < min && absY < min) return;

        const next = absX > absY ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
        if (!running && !gameOver) start();
        queueDir(next);
      },
      { passive: false },
    );
    canvas.addEventListener(
      'touchcancel',
      (e) => {
        e.preventDefault();
        touchStart = null;
      },
      { passive: false },
    );
  }

  function keyToDir(key) {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return { x: 0, y: -1 };
      case 'ArrowDown':
      case 's':
      case 'S':
        return { x: 0, y: 1 };
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return { x: -1, y: 0 };
      case 'ArrowRight':
      case 'd':
      case 'D':
        return { x: 1, y: 0 };
      default:
        return null;
    }
  }

  function init() {
    resizeCanvas();
    resetGame();
    wireControls();
    requestAnimationFrame(loop);
    setTimeout(() => start(), isVirtualTime ? 0 : config.autoStartDelayMs);
  }

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(canvas);
  }
  window.addEventListener('resize', () => resizeCanvas(), { passive: true });
  window.addEventListener('orientationchange', () => resizeCanvas(), { passive: true });

  window.render_game_to_text = () =>
    JSON.stringify({
      mode: gameOver ? 'gameover' : paused ? 'paused' : running ? 'running' : 'ready',
      grid: { size: config.gridSize, origin: 'top-left', x: 'right', y: 'down' },
      snake: { head: snake[0] || null, length: snake.length, dir: { ...dir } },
      food,
      score,
      speed,
    });

  // Playwright skill uses `window.advanceTime(1000/60)` per frame; make it deterministic in test mode.
  window.advanceTime = async (ms) => {
    stepTime(ms);
    draw();
  };

  init();
})();
