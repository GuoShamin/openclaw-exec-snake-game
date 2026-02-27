(() => {
  'use strict';

  // Canvas 与 DPI 适配
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const meta = document.getElementById('meta');

  const GRID_SIZE = 20;
  let tileCount = 20;
  let tileSize = 24;

  // 游戏状态
  let snake = [];
  let food = { x: 0, y: 0 };
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let score = 0;
  let speed = 5;
  let gameRunning = false;
  let gamePaused = false;
  let gameOver = false;
  let lastTime = 0;
  let accumulator = 0;

  // 初始化 Canvas 尺寸（高 DPI 适配）
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const displaySize = Math.min(rect.width, rect.height);
    tileCount = GRID_SIZE;
    tileSize = displaySize / tileCount;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // 初始化游戏
  function initGame() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    speed = 5;
    gameOver = false;
    placeFood();
    updateMeta();
  }

  // 放置食物（避开蛇身）
  function placeFood() {
    let valid = false;
    while (!valid) {
      food.x = Math.floor(Math.random() * tileCount);
      food.y = Math.floor(Math.random() * tileCount);
      valid = !snake.some(seg => seg.x === food.x && seg.y === food.y);
    }
  }

  // 更新分数显示
  function updateMeta() {
    meta.textContent = `分数：${score} | 速度：${speed}`;
  }

  // 游戏主循环
  function gameLoop(currentTime) {
    if (!gameRunning) return;

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (!gamePaused && !gameOver) {
      accumulator += deltaTime;
      const tickRate = 1000 / speed;

      while (accumulator >= tickRate) {
        update();
        accumulator -= tickRate;
      }
    }

    draw();
    requestAnimationFrame(gameLoop);
  }

  // 更新游戏状态
  function update() {
    direction = { ...nextDirection };

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // 碰撞检测（墙壁）
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
      endGame();
      return;
    }

    // 碰撞检测（自身）
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);

    // 吃到食物
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      speed = Math.min(20, 5 + Math.floor(score / 50));
      updateMeta();
      placeFood();
    } else {
      snake.pop();
    }
  }

  // 绘制游戏
  function draw() {
    const rect = canvas.getBoundingClientRect();
    const displaySize = Math.min(rect.width, rect.height);
    const currentTileSize = displaySize / tileCount;

    // 清空画布
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('background').trim() || 'rgba(0,0,0,.06)';
    ctx.fillRect(0, 0, displaySize, displaySize);

    // 绘制网格（可选，淡色）
    ctx.strokeStyle = 'rgba(127,127,127,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= tileCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * currentTileSize, 0);
      ctx.lineTo(i * currentTileSize, displaySize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * currentTileSize);
      ctx.lineTo(displaySize, i * currentTileSize);
      ctx.stroke();
    }

    // 绘制食物
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    const foodCx = food.x * currentTileSize + currentTileSize / 2;
    const foodCy = food.y * currentTileSize + currentTileSize / 2;
    ctx.arc(foodCx, foodCy, currentTileSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 绘制蛇
    snake.forEach((seg, index) => {
      ctx.fillStyle = index === 0 ? '#2ecc71' : '#27ae60';
      const padding = 1;
      ctx.fillRect(
        seg.x * currentTileSize + padding,
        seg.y * currentTileSize + padding,
        currentTileSize - padding * 2,
        currentTileSize - padding * 2
      );

      // 蛇头眼睛
      if (index === 0) {
        ctx.fillStyle = '#fff';
        const eyeSize = currentTileSize * 0.15;
        const eyeOffset = currentTileSize * 0.2;
        
        let ex1, ey1, ex2, ey2;
        if (direction.x === 1) {
          ex1 = seg.x * currentTileSize + currentTileSize * 0.65;
          ey1 = seg.y * currentTileSize + currentTileSize * 0.3;
          ex2 = seg.x * currentTileSize + currentTileSize * 0.65;
          ey2 = seg.y * currentTileSize + currentTileSize * 0.7;
        } else if (direction.x === -1) {
          ex1 = seg.x * currentTileSize + currentTileSize * 0.35;
          ey1 = seg.y * currentTileSize + currentTileSize * 0.3;
          ex2 = seg.x * currentTileSize + currentTileSize * 0.35;
          ey2 = seg.y * currentTileSize + currentTileSize * 0.7;
        } else if (direction.y === -1) {
          ex1 = seg.x * currentTileSize + currentTileSize * 0.3;
          ey1 = seg.y * currentTileSize + currentTileSize * 0.35;
          ex2 = seg.x * currentTileSize + currentTileSize * 0.7;
          ey2 = seg.y * currentTileSize + currentTileSize * 0.35;
        } else {
          ex1 = seg.x * currentTileSize + currentTileSize * 0.3;
          ey1 = seg.y * currentTileSize + currentTileSize * 0.65;
          ex2 = seg.x * currentTileSize + currentTileSize * 0.7;
          ey2 = seg.y * currentTileSize + currentTileSize * 0.65;
        }
        
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
        ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 游戏结束覆盖层
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, displaySize, displaySize);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px ui-sans-serif, system-ui, -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束!', displaySize / 2, displaySize / 2 - 20);
      
      ctx.font = '18px ui-sans-serif, system-ui, -apple-system';
      ctx.fillText(`最终分数：${score}`, displaySize / 2, displaySize / 2 + 15);
      ctx.fillText('点击 Restart 重新开始', displaySize / 2, displaySize / 2 + 45);
    }

    // 暂停覆盖层
    if (gamePaused && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, displaySize, displaySize);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px ui-sans-serif, system-ui, -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText('已暂停', displaySize / 2, displaySize / 2);
    }
  }

  // 结束游戏
  function endGame() {
    gameRunning = false;
    gameOver = true;
    draw();
  }

  // 开始游戏
  function startGame() {
    if (gameOver) {
      initGame();
    }
    if (!gameRunning) {
      gameRunning = true;
      gamePaused = false;
      lastTime = performance.now();
      requestAnimationFrame(gameLoop);
    }
  }

  // 暂停/继续游戏
  function togglePause() {
    if (!gameRunning || gameOver) return;
    gamePaused = !gamePaused;
    if (!gamePaused) {
      lastTime = performance.now();
    }
    draw();
  }

  // 重启游戏
  function restartGame() {
    initGame();
    gameRunning = true;
    gamePaused = false;
    gameOver = false;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  // 键盘控制
  function handleKeydown(e) {
    const key = e.key.toLowerCase();
    
    let newDir = null;
    
    if (key === 'arrowup' || key === 'w') {
      newDir = { x: 0, y: -1 };
    } else if (key === 'arrowdown' || key === 's') {
      newDir = { x: 0, y: 1 };
    } else if (key === 'arrowleft' || key === 'a') {
      newDir = { x: -1, y: 0 };
    } else if (key === 'arrowright' || key === 'd') {
      newDir = { x: 1, y: 0 };
    }

    if (newDir) {
      e.preventDefault();
      // 禁止 180° 反向
      if (newDir.x !== -direction.x || newDir.y !== -direction.y) {
        nextDirection = newDir;
      }
    }

    if (key === ' ') {
      e.preventDefault();
      togglePause();
    }
  }

  document.addEventListener('keydown', handleKeydown);

  // 触摸滑动控制
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }

  function handleTouchMove(e) {
    e.preventDefault(); // 禁止页面滚动
  }

  function handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const elapsed = Date.now() - touchStartTime;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // 最小滑动距离
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

    // 防止快速滑动误触
    if (elapsed > 500) return;

    let newDir = null;

    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平滑动
      newDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      // 垂直滑动
      newDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }

    // 禁止 180° 反向
    if (newDir && (newDir.x !== -direction.x || newDir.y !== -direction.y)) {
      nextDirection = newDir;
    }
  }

  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

  // 按钮控制
  document.getElementById('btnStart').addEventListener('click', startGame);
  document.getElementById('btnPause').addEventListener('click', togglePause);
  document.getElementById('btnRestart').addEventListener('click', restartGame);

  // 点击画布也可重启（游戏结束时）
  canvas.addEventListener('click', () => {
    if (gameOver) {
      restartGame();
    }
  });

  // 初始化并自动开始
  initGame();
  draw();
  setTimeout(() => {
    startGame();
  }, 500);
})();
