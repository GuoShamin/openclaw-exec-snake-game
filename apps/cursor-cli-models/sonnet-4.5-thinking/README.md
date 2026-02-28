# 自动驾驶贪吃蛇游戏

一个完全自动运行的贪吃蛇小游戏，使用 BFS 算法实现 AI 自动寻路。

## 特性

- ✅ 完全自动驾驶，无需人工操作
- ✅ 支持移动端触屏设备
- ✅ 适配 GitHub Pages 部署
- ✅ 智能 AI 算法（BFS + 安全性检查）
- ✅ 响应式设计
- ✅ 本地存储最高分记录

## AI 策略说明

游戏采用了混合策略：

1. **BFS 寻路算法**：计算从蛇头到食物的最短路径
2. **安全性检查**：模拟吃掉食物后的状态，检查是否还能到达蛇尾（确保有足够的生存空间）
3. **备选策略**：如果没有安全路径到达食物，则选择远离食物的方向，保持游走状态
4. **死锁避免**：确保每一步移动后都有逃生路径，避免把自己困死

## 本地运行

### 方法 1：直接打开（推荐）

直接在浏览器中打开 `index.html` 文件即可运行。

### 方法 2：使用 Python 静态服务器

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

然后访问 `http://localhost:8000`

### 方法 3：使用 Node.js

```bash
npx http-server
```

## GitHub Pages 部署

1. 将此项目推送到 GitHub 仓库
2. 进入仓库的 Settings → Pages
3. Source 选择要部署的分支（如 main）
4. 保存后等待几分钟
5. 访问 `https://你的用户名.github.io/仓库名/`

## 文件清单

```
.
└── index.html    # 包含 HTML、CSS、JavaScript 的单文件应用
```

## 技术栈

- 纯原生 JavaScript（无依赖）
- HTML5 Canvas
- CSS3（响应式设计）
- LocalStorage（记录最高分）

## 浏览器支持

- Chrome/Edge（推荐）
- Safari
- Firefox
- 移动端浏览器

## 协议

MIT
