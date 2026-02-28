/**
 * 贪吃蛇 AI 自动驾驶逻辑
 * 策略说明：
 * 1. 寻找路径：使用 BFS (广度优先搜索) 寻找从蛇头到食物的最短路径。
 * 2. 安全检查：如果找到路径，模拟移动一步后，检查蛇是否还能找到通往蛇尾的路径（保证不进入死胡同）。
 * 3. 备选方案：如果没有直达食物的路径或路径不安全，则尝试跟随蛇尾移动（蛇尾通常是安全的，因为它会随着移动腾出空间）。
 * 4. 兜底方案：如果以上都不可行，随机选择一个存活时间最长的方向。
 */

const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const resetBtn = document.getElementById('resetBtn');
const speedBtn = document.getElementById('speedBtn');

// 游戏配置
const GRID_SIZE = 20;
let width, height, cols, rows;
let snake = [];
let food = { x: 0, y: 0 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop;
let speed = 100; // 毫秒
let isGameOver = false;

function initCanvas() {
    // 动态计算画布大小，适配移动端
    const padding = 20;
    const availableWidth = window.innerWidth - padding * 2;
    const availableHeight = window.innerHeight - 200; // 留出 UI 空间
    
    width = Math.floor(Math.min(availableWidth, 400) / GRID_SIZE) * GRID_SIZE;
    height = Math.floor(Math.min(availableHeight, 400) / GRID_SIZE) * GRID_SIZE;
    
    canvas.width = width;
    canvas.height = height;
    cols = width / GRID_SIZE;
    rows = height / GRID_SIZE;
}

function resetGame() {
    initCanvas();
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    scoreEl.innerText = score;
    highScoreEl.innerText = highScore;
    spawnFood();
    isGameOver = false;
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, speed);
}

function spawnFood() {
    while (true) {
        food = {
            x: Math.floor(Math.random() * cols),
            y: Math.floor(Math.random() * rows)
        };
        // 确保食物不在蛇身上
        let onSnake = snake.some(segment => segment.x === food.x && segment.y === food.y);
        if (!onSnake) break;
    }
}

function gameStep() {
    if (isGameOver) return;

    // AI 决策
    const aiDir = getAIDirection();
    if (aiDir) {
        direction = aiDir;
    }

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // 碰撞检测
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || 
        snake.some((seg, index) => index !== snake.length - 1 && seg.x === head.x && seg.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.innerText = score;
        if (score > highScore) {
            highScore = score;
            highScoreEl.innerText = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        spawnFood();
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // 画食物
    ctx.fillStyle = '#f44336';
    ctx.fillRect(food.x * GRID_SIZE + 1, food.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);

    // 画蛇
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#4caf50' : '#81c784';
        ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
}

function gameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', width / 2, height / 2);
    ctx.font = '20px Arial';
    ctx.fillText('点击重置开始', width / 2, height / 2 + 40);
}

// AI 核心逻辑
function getAIDirection() {
    const head = snake[0];
    
    // 1. 尝试寻找食物的最短路径
    const pathToFood = bfs(head, food);
    
    if (pathToFood && pathToFood.length > 0) {
        // 模拟走一步，看是否安全
        const virtualSnake = [...snake];
        const nextStep = pathToFood[0];
        
        // 简单模拟移动
        const newHead = { x: nextStep.x, y: nextStep.y };
        const virtualSnakeAfterMove = [newHead, ...virtualSnake.slice(0, -1)];
        
        // 检查移动后是否还能找到蛇尾（保证不自闭）
        const tail = virtualSnakeAfterMove[virtualSnakeAfterMove.length - 1];
        if (bfs(newHead, tail, virtualSnakeAfterMove)) {
            return { x: nextStep.x - head.x, y: nextStep.y - head.y };
        }
    }

    // 2. 如果无法直达食物或不安全，尝试跟随蛇尾
    const tail = snake[snake.length - 1];
    const pathToTail = bfs(head, tail);
    if (pathToTail && pathToTail.length > 0) {
        return { x: pathToTail[0].x - head.x, y: pathToTail[0].y - head.y };
    }

    // 3. 最后的挣扎：找个空位钻
    const directions = [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ];
    
    for (let d of directions) {
        const nx = head.x + d.x;
        const ny = head.y + d.y;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && 
            !snake.some(seg => seg.x === nx && seg.y === ny)) {
            return d;
        }
    }

    return null;
}

function bfs(start, target, customSnake = snake) {
    const queue = [[start]];
    const visited = new Set();
    visited.add(`${start.x},${start.y}`);

    while (queue.length > 0) {
        const path = queue.shift();
        const curr = path[path.length - 1];

        if (curr.x === target.x && curr.y === target.y) {
            return path.slice(1);
        }

        const neighbors = [
            { x: curr.x + 1, y: curr.y },
            { x: curr.x - 1, y: curr.y },
            { x: curr.x, y: curr.y + 1 },
            { x: curr.x, y: curr.y - 1 }
        ];

        for (let next of neighbors) {
            if (next.x >= 0 && next.x < cols && next.y >= 0 && next.y < rows && 
                !visited.has(`${next.x},${next.y}`) && 
                !customSnake.some(seg => seg.x === next.x && seg.y === next.y)) {
                visited.add(`${next.x},${next.y}`);
                queue.push([...path, next]);
            }
        }
    }
    return null;
}

// 交互事件
resetBtn.addEventListener('click', resetGame);

speedBtn.addEventListener('click', () => {
    if (speed === 100) speed = 30;
    else if (speed === 30) speed = 200;
    else speed = 100;
    
    speedBtn.innerText = `速度: ${speed === 30 ? '快' : speed === 200 ? '慢' : '中'}`;
    if (!isGameOver) {
        clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, speed);
    }
});

// 阻止移动端滚动
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

window.addEventListener('resize', () => {
    if (!isGameOver) {
        initCanvas();
        draw();
    }
});

// 启动游戏
resetGame();
