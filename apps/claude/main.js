(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const meta = document.getElementById('meta');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');

  // 高 DPI 适配
  const dpr = window.devicePixelRatio || 1;
  const displaySize = 480;
  canvas.width = displaySize * dpr;
  canvas.height = displaySize * dpr;
  ctx.scale(dpr, dpr);

  // 游戏配置
  const gridSize = 20;
  const tileCount = displaySize / gridSize;

  // 游戏状态
  let snake = [{ x: 10, y: 10 }];
  let food = { x: 15, y: 15 };
  let dx = 1;
  let dy = 0;
  let nextDx = 1;
  let nextDy = 0;
  let score = 0;
  let speed = 150;
  let gameLoop = null;
  let isPaused = false;
  let isGameOver = false;

  // 生成随机食物位置
  function generateFood() {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }

  // 绘制游戏
  function draw() {
    // 清空画布
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(0, 0, displaySize, displaySize);

    // 绘制蛇
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#4CAF50' : '#8BC34A';
      ctx.fillRect(
        segment.x * gridSize + 1,
        segment.y * gridSize + 1,
        gridSize - 2,
        gridSize - 2
      );
    });

    // 绘制食物
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.arc(
      food.x * gridSize + gridSize / 2,
      food.y * gridSize + gridSize / 2,
      gridSize / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // 更新游戏状态
  function update() {
    if (isPaused || isGameOver) return;

    // 应用方向变化
    dx = nextDx;
    dy = nextDy;

    // 计算新头部位置
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // 碰撞检测：撞墙
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
      gameOver();
      return;
    }

    // 碰撞检测：撞自己
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      gameOver();
      return;
    }

    // 移动蛇
    snake.unshift(head);

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      food = generateFood();

      // 增加速度（每吃 3 个食物加速一次）
      if (score % 30 === 0 && speed > 50) {
        speed -= 10;
        clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, speed);
      }

      updateMeta();
    } else {
      snake.pop();
    }

    draw();
  }

  // 游戏循环
  function gameStep() {
    update();
  }

  // 更新元信息显示
  function updateMeta() {
    const level = Math.floor(score / 30) + 1;
    meta.textContent = `Score: ${score} | Level: ${level} | Speed: ${Math.round(1000 / speed)}`;
  }

  // 游戏结束
  function gameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    gameLoop = null;

    // 绘制游戏结束提示
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, displaySize, displaySize);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over!', displaySize / 2, displaySize / 2 - 30);

    ctx.font = '20px sans-serif';
    ctx.fillText(`Final Score: ${score}`, displaySize / 2, displaySize / 2 + 10);
    ctx.fillText('Click Restart to play again', displaySize / 2, displaySize / 2 + 40);

    meta.textContent = `Game Over! Final Score: ${score}`;
  }

  // 开始游戏
  function startGame() {
    if (gameLoop || isGameOver) return;

    isPaused = false;
    gameLoop = setInterval(gameStep, speed);
    updateMeta();
    btnStart.disabled = true;
    btnPause.disabled = false;
  }

  // 暂停游戏
  function pauseGame() {
    if (!gameLoop || isGameOver) return;

    isPaused = !isPaused;
    btnPause.textContent = isPaused ? 'Resume' : 'Pause';

    if (isPaused) {
      meta.textContent = `Paused | Score: ${score}`;
    } else {
      updateMeta();
    }
  }

  // 重启游戏
  function restartGame() {
    clearInterval(gameLoop);
    gameLoop = null;

    snake = [{ x: 10, y: 10 }];
    food = generateFood();
    dx = 1;
    dy = 0;
    nextDx = 1;
    nextDy = 0;
    score = 0;
    speed = 150;
    isPaused = false;
    isGameOver = false;

    btnStart.disabled = false;
    btnPause.disabled = true;
    btnPause.textContent = 'Pause';

    draw();
    updateMeta();

    // 自动开始
    setTimeout(() => startGame(), 100);
  }

  // 改变方向（阻止 180° 反向）
  function changeDirection(newDx, newDy) {
    // 防止反向移动
    if (newDx === -dx && newDy === -dy) return;
    // 防止同一帧多次改变方向
    if (newDx === nextDx && newDy === nextDy) return;

    nextDx = newDx;
    nextDy = newDy;
  }

  // 键盘控制
  document.addEventListener('keydown', (e) => {
    if (isGameOver) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        changeDirection(0, -1);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        changeDirection(0, 1);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        changeDirection(-1, 0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        changeDirection(1, 0);
        break;
    }
  });

  // 触摸控制
  let touchStartX = 0;
  let touchStartY = 0;
  const minSwipeDistance = 30;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (isGameOver) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (Math.max(absDeltaX, absDeltaY) < minSwipeDistance) return;

    if (absDeltaX > absDeltaY) {
      // 水平滑动
      changeDirection(deltaX > 0 ? 1 : -1, 0);
    } else {
      // 垂直滑动
      changeDirection(0, deltaY > 0 ? 1 : -1);
    }
  }, { passive: false });

  // 按钮事件
  btnStart.addEventListener('click', startGame);
  btnPause.addEventListener('click', pauseGame);
  btnRestart.addEventListener('click', restartGame);

  // 初始化
  draw();
  updateMeta();

  // 自动开始（1秒后）
  setTimeout(() => {
    startGame();
  }, 1000);
})();
