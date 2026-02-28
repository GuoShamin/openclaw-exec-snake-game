const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restartBtn');

// 游戏配置
const COLS = 20;
const ROWS = 20;
let TILE_SIZE = 20; // 会根据屏幕大小动态调整
const GAME_SPEED = 50; // 毫秒/帧，越小越快

// 游戏状态
let snake = [];
let food = null;
let score = 0;
let isGameOver = false;
let gameLoopId = null;

// 方向常量
const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };
const LEFT = { x: -1, y: 0 };
const RIGHT = { x: 1, y: 0 };

// 初始化画布大小
function resizeCanvas() {
    const maxWidth = window.innerWidth - 20;
    const maxHeight = window.innerHeight * 0.75; // 留出 UI 空间
    
    // 计算合适的方块大小
    const sizeByWidth = Math.floor(maxWidth / COLS);
    const sizeByHeight = Math.floor(maxHeight / ROWS);
    TILE_SIZE = Math.min(sizeByWidth, sizeByHeight);
    
    canvas.width = TILE_SIZE * COLS;
    canvas.height = TILE_SIZE * ROWS;
    
    draw(); // 重绘
}

window.addEventListener('resize', resizeCanvas);

// 初始化游戏
function initGame() {
    resizeCanvas();
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    score = 0;
    scoreEl.textContent = score;
    isGameOver = false;
    statusEl.textContent = "自动驾驶中...";
    statusEl.style.color = "#aaa";
    spawnFood();
    
    if (gameLoopId) clearInterval(gameLoopId);
    gameLoopId = setInterval(update, GAME_SPEED);
}

// 生成食物
function spawnFood() {
    let valid = false;
    while (!valid) {
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * ROWS);
        
        // 检查是否生成在蛇身上
        let onSnake = false;
        for (let segment of snake) {
            if (segment.x === x && segment.y === y) {
                onSnake = true;
                break;
            }
        }
        
        if (!onSnake) {
            food = { x, y };
            valid = true;
        }
    }
}

// 游戏主循环
function update() {
    if (isGameOver) return;

    const nextMove = getAutoPilotMove();
    
    if (nextMove) {
        move(nextMove);
    } else {
        // 无路可走，尝试随便走一步合法的
        const safeMove = getAnySafeMove();
        if (safeMove) {
            move(safeMove);
        } else {
            gameOver();
        }
    }
    
    draw();
}

// 移动逻辑
function move(dir) {
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    
    // 撞墙检查
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        gameOver();
        return;
    }
    
    // 撞自己检查
    // 注意：移动时尾巴会收缩，所以撞尾巴其实是安全的（除非刚吃完食物）
    // 但为了简单，我们这里严谨判断，除了最后一个尾节点（因为它即将移走）
    for (let i = 0; i < snake.length - 1; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head); // 加入新头

    // 吃食物
    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        spawnFood();
        // 吃食物时不移除尾巴，蛇变长
    } else {
        snake.pop(); // 移除尾巴
    }
}

function gameOver() {
    isGameOver = true;
    statusEl.textContent = "游戏结束 (撞击)";
    statusEl.style.color = "#ff4444";
    clearInterval(gameLoopId);
}

// 渲染
function draw() {
    // 清空背景
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画蛇
    for (let i = 0; i < snake.length; i++) {
        // 蛇头颜色不同
        ctx.fillStyle = i === 0 ? '#4CAF50' : '#81C784';
        const seg = snake[i];
        ctx.fillRect(seg.x * TILE_SIZE, seg.y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
    }

    // 画食物
    if (food) {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        const cx = food.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = food.y * TILE_SIZE + TILE_SIZE / 2;
        ctx.arc(cx, cy, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- 自动驾驶算法 (Auto Pilot) ---

// 获取下一步最佳移动
function getAutoPilotMove() {
    const head = snake[0];
    
    // 1. 尝试用 BFS 寻找去食物的最短路径
    const path = bfs(head, food, snake);
    
    if (path && path.length > 0) {
        // 简单策略：如果有路，就走第一步
        // 进阶策略（可选）：模拟走一步后，是否还能找到尾巴（避免死胡同）。
        // 这里为了保持代码轻量，使用直接 BFS。如果蛇很长，可能会把自己围死。
        return path[0];
    }
    
    // 2. 如果找不到食物（被围住了），尝试向离食物最远的地方走，或者找尾巴
    // 这里简化为：找一个合法的邻居，且该邻居离食物最远（贪心逃离）
    return getSurvivalMove();
}

// 任意合法移动（兜底）
function getAnySafeMove() {
    const head = snake[0];
    const moves = [UP, DOWN, LEFT, RIGHT];
    for (let move of moves) {
        if (isSafe(head.x + move.x, head.y + move.y, snake)) {
            return move;
        }
    }
    return null;
}

// 生存模式移动：找不到路时，尽量活久一点
function getSurvivalMove() {
    const head = snake[0];
    const moves = [UP, DOWN, LEFT, RIGHT];
    let bestMove = null;
    let maxDist = -1;

    for (let move of moves) {
        const nx = head.x + move.x;
        const ny = head.y + move.y;
        
        if (isSafe(nx, ny, snake)) {
            // 计算到食物的曼哈顿距离，选最远的
            const dist = Math.abs(nx - food.x) + Math.abs(ny - food.y);
            // 也可以加入空闲空间评估（Flood Fill），但计算量大。
            // 简单版本：选离食物远的，通常意味着往空旷处走
            if (dist > maxDist) {
                maxDist = dist;
                bestMove = move;
            }
        }
    }
    return bestMove;
}

// 广度优先搜索 (BFS) 找最短路径
function bfs(start, target, currentSnake) {
    const queue = [[{x: start.x, y: start.y}, []]]; // [currentPos, path]
    const visited = new Set();
    visited.add(`${start.x},${start.y}`);
    
    // 将蛇身视为障碍物
    const obstacles = new Set();
    // 注意：蛇尾在移动一步后会空出来，所以 BFS 时可以视尾巴为空（除非刚吃食物）
    // 保守起见，把整个蛇身都当障碍
    for (let seg of currentSnake) {
        obstacles.add(`${seg.x},${seg.y}`);
    }

    while (queue.length > 0) {
        const [curr, path] = queue.shift();
        
        if (curr.x === target.x && curr.y === target.y) {
            return path;
        }
        
        const moves = [UP, DOWN, LEFT, RIGHT];
        for (let move of moves) {
            const nx = curr.x + move.x;
            const ny = curr.y + move.y;
            const key = `${nx},${ny}`;
            
            // 检查边界
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                // 检查障碍物（如果是目标点，即使是障碍物逻辑上也应该允许到达，但在贪吃蛇里食物不会在蛇身上）
                if (!obstacles.has(key) && !visited.has(key)) {
                    visited.add(key);
                    const newPath = [...path, move];
                    queue.push([{x: nx, y: ny}, newPath]);
                }
            }
        }
    }
    return null; // 没找到路径
}

// 检查坐标是否安全
function isSafe(x, y, currentSnake) {
    // 撞墙
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    
    // 撞自己
    for (let i = 0; i < currentSnake.length - 1; i++) { // 忽略尾巴，因为它会移走
        if (x === currentSnake[i].x && y === currentSnake[i].y) return false;
    }
    return true;
}

// 绑定按钮事件
restartBtn.addEventListener('click', initGame);
// 触摸事件防止默认行为（虽然主要是自动驾驶，但防止用户误触滚动）
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// 启动
initGame();
