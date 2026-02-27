const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const gameOverElement = document.getElementById('gameOver');

// 游戏配置
const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// 游戏状态
let snake = [{ x: 10, y: 10 }];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 15, y: 15 };
let score = 0;
let gameRunning = true;
let paused = false;
let gameSpeed = 100;

// 生成随机食物位置
function generateFood() {
    food = {
        x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
    };

    // 确保食物不在蛇身上
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 绘制蛇
    ctx.fillStyle = '#4CAF50';
    snake.forEach((segment, index) => {
        ctx.fillRect(
            segment.x * GRID_SIZE,
            segment.y * GRID_SIZE,
            GRID_SIZE - 2,
            GRID_SIZE - 2
        );

        // 蛇头颜色更深
        if (index === 0) {
            ctx.fillStyle = '#2E7D32';
            ctx.fillRect(
                segment.x * GRID_SIZE,
                segment.y * GRID_SIZE,
                GRID_SIZE - 2,
                GRID_SIZE - 2
            );
            ctx.fillStyle = '#4CAF50';
        }
    });

    // 绘制食物
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(
        food.x * GRID_SIZE,
        food.y * GRID_SIZE,
        GRID_SIZE - 2,
        GRID_SIZE - 2
    );
}

// 更新游戏状态
function update() {
    if (!gameRunning || paused) return;

    // 更新方向
    direction = nextDirection;

    // 计算新的蛇头位置
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // 检查撞墙
    if (head.x < 0 || head.x >= CANVAS_SIZE / GRID_SIZE ||
        head.y < 0 || head.y >= CANVAS_SIZE / GRID_SIZE) {
        gameOver();
        return;
    }

    // 检查撞到自己
    for (let segment of snake) {
        if (segment.x === head.x && segment.y === head.y) {
            gameOver();
            return;
        }
    }

    // 添加新蛇头
    snake.unshift(head);

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();

        // 加速
        if (gameSpeed > 50) {
            gameSpeed -= 2;
        }
    } else {
        // 移除蛇尾
        snake.pop();
    }
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverElement.classList.remove('hidden');
}

// 重新开始
function restart() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    gameSpeed = 100;
    gameRunning = true;
    paused = false;
    scoreElement.textContent = score;
    gameOverElement.classList.add('hidden');
    generateFood();
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    // 防止方向键滚动页面
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction.y === 0) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction.y === 0) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction.x === 0) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction.x === 0) nextDirection = { x: 1, y: 0 };
            break;
        case 'p':
        case 'P':
            if (gameRunning) paused = !paused;
            break;
        case 'r':
        case 'R':
            restart();
            break;
    }
});

// 游戏循环
let lastTime = 0;
function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    const deltaTime = currentTime - lastTime;

    if (deltaTime >= gameSpeed) {
        lastTime = currentTime;
        update();
        draw();
    }
}

// 启动游戏
generateFood();
draw();
requestAnimationFrame(gameLoop);
