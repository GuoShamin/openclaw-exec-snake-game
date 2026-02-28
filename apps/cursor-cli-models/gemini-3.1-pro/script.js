const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const toggleAutoBtn = document.getElementById('toggle-auto');
const restartBtn = document.getElementById('restart');

// 游戏配置
const gridSize = 20;
const tileCount = canvas.width / gridSize;
let speed = 15; // 游戏速度

// 游戏状态
let snake = [];
let food = {};
let dx = 0;
let dy = 0;
let score = 0;
let isAutoPilot = true;
let gameLoopTimeout;
let isGameOver = false;

// 触摸控制变量
let touchStartX = 0;
let touchStartY = 0;

// 初始化游戏
function initGame() {
    snake = [
        { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) }
    ];
    dx = 0;
    dy = -1; // 初始向上
    score = 0;
    scoreElement.innerText = score;
    isGameOver = false;
    placeFood();
    clearTimeout(gameLoopTimeout);
    gameLoop();
}

// 放置食物
function placeFood() {
    let valid = false;
    while (!valid) {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        valid = true;
        // 确保食物不在蛇身上
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                valid = false;
                break;
            }
        }
    }
}

// 游戏主循环
function gameLoop() {
    if (isGameOver) return;

    if (isAutoPilot) {
        calculateAutoPilotMove();
    }

    moveSnake();
    
    if (checkCollision()) {
        gameOver();
        return;
    }

    clearCanvas();
    drawFood();
    drawSnake();

    gameLoopTimeout = setTimeout(gameLoop, 1000 / speed);
}

// 自动驾驶算法 (BFS)
// 策略说明：使用广度优先搜索寻找到达食物的最短路径。
// 如果找到路径，则走向路径的第一步。
// 如果找不到路径（被困住），则尝试寻找一个不会立即死亡的相邻格子（贪心保命）。
function calculateAutoPilotMove() {
    const head = snake[0];
    
    // 构建网格地图以表示障碍物
    const grid = Array(tileCount).fill(0).map(() => Array(tileCount).fill(0));
    // 标记蛇身为障碍物 (尾巴在移动时会空出来，但为了安全简化处理，将其视作障碍)
    for (let i = 0; i < snake.length; i++) {
        grid[snake[i].y][snake[i].x] = 1;
    }

    const queue = [];
    const visited = Array(tileCount).fill(0).map(() => Array(tileCount).fill(false));
    const parent = {};

    queue.push({ x: head.x, y: head.y });
    visited[head.y][head.x] = true;

    const dirs = [
        { dx: 0, dy: -1 }, // 上
        { dx: 0, dy: 1 },  // 下
        { dx: -1, dy: 0 }, // 左
        { dx: 1, dy: 0 }   // 右
    ];

    let foundPath = false;
    let targetNode = null;

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.x === food.x && current.y === food.y) {
            foundPath = true;
            targetNode = current;
            break;
        }

        for (let dir of dirs) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;

            // 检查边界和碰撞
            if (nx >= 0 && nx < tileCount && ny >= 0 && ny < tileCount && !visited[ny][nx]) {
                if (grid[ny][nx] === 0 || (nx === food.x && ny === food.y)) {
                    visited[ny][nx] = true;
                    queue.push({ x: nx, y: ny });
                    parent[`${nx},${ny}`] = { x: current.x, y: current.y, dir: dir };
                }
            }
        }
    }

    if (foundPath) {
        // 回溯寻找第一步
        let curr = targetNode;
        let pathDirs = [];
        while (curr.x !== head.x || curr.y !== head.y) {
            const p = parent[`${curr.x},${curr.y}`];
            pathDirs.push(p.dir);
            curr = { x: p.x, y: p.y };
        }
        const nextMove = pathDirs.pop();
        if(nextMove) {
             if (nextMove.dx !== -dx || nextMove.dy !== -dy) {
                 dx = nextMove.dx;
                 dy = nextMove.dy;
             }
        }
    } else {
        // 找不到路，执行保命策略（随便找个空的相邻格子）
        let safeMove = null;
        for (let dir of dirs) {
             // 防止直接反向自杀
             if (dir.dx === -dx && dir.dy === -dy && snake.length > 1) continue;
             
             const nx = head.x + dir.dx;
             const ny = head.y + dir.dy;
             if (nx >= 0 && nx < tileCount && ny >= 0 && ny < tileCount && grid[ny][nx] === 0) {
                 safeMove = dir;
                 break; // 找到一个就走
             }
        }
        if (safeMove) {
            dx = safeMove.dx;
            dy = safeMove.dy;
        }
    }
}

// 移动蛇
function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head); // 添加新头

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.innerText = score;
        placeFood();
    } else {
        snake.pop(); // 没吃到食物，移除尾巴
    }
}

// 检查碰撞
function checkCollision() {
    const head = snake[0];

    // 撞墙
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return true;
    }

    // 撞自己 (从索引1开始，因为0是头)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }

    return false;
}

// 游戏结束
function gameOver() {
    isGameOver = true;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2);
    
    if (isAutoPilot) {
        // 自动模式下，1.5秒后自动重启
        setTimeout(() => {
            if (isAutoPilot) initGame();
        }, 1500);
    }
}

// 清除画布
function clearCanvas() {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 绘制食物
function drawFood() {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2 - 2, 0, 2 * Math.PI);
    ctx.fill();
}

// 绘制蛇
function drawSnake() {
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#2ecc71' : '#27ae60';
        ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
    });
}

// 键盘控制
window.addEventListener('keydown', e => {
    if (isAutoPilot) return;
    
    switch (e.key) {
        case 'ArrowUp':
            if (dy !== 1) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
            if (dy !== -1) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
            if (dx !== 1) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
            if (dx !== -1) { dx = 1; dy = 0; }
            break;
    }
});

// 触摸控制
canvas.addEventListener('touchstart', e => {
    if (isAutoPilot) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

canvas.addEventListener('touchend', e => {
    if (isAutoPilot) return;
    
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    
    let diffX = touchEndX - touchStartX;
    let diffY = touchEndY - touchStartY;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && dx !== -1) { dx = 1; dy = 0; } 
        else if (diffX < 0 && dx !== 1) { dx = -1; dy = 0; }
    } else {
        if (diffY > 0 && dy !== -1) { dx = 0; dy = 1; } 
        else if (diffY < 0 && dy !== 1) { dx = 0; dy = -1; }
    }
}, { passive: false });

// 防止整个页面的默认触摸滚动
document.addEventListener('touchmove', function(e) {
    if (e.target.tagName !== 'BUTTON') {
        e.preventDefault();
    }
}, { passive: false });

// 按钮事件
toggleAutoBtn.addEventListener('click', () => {
    isAutoPilot = !isAutoPilot;
    toggleAutoBtn.innerText = `切换模式 (当前: ${isAutoPilot ? '自动' : '手动'})`;
    if (isGameOver && isAutoPilot) {
        initGame(); // 切换回自动时如果已结束则重启
    }
});

restartBtn.addEventListener('click', () => {
    initGame();
});

// 启动游戏
initGame();