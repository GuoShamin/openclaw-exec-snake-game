# OpenClaw 贪吃蛇（移动端适配 + 自动模式）

这是一个纯前端的贪吃蛇小游戏（HTML/CSS/JavaScript + Canvas），由 OpenClaw 生成并维护。

## 在线使用

GitHub Pages：
- https://guoshamin.github.io/openclaw-exec-snake-game/

## 本地运行

### 方法 1：直接打开

直接双击 `index.html` 用浏览器打开即可。

### 方法 2：本地服务器

在目录内运行：

```bash
python3 -m http.server 8000
```

然后访问：`http://localhost:8000`

## 操作说明

### 键盘

- 移动：方向键 / WASD
- 暂停：`P`
- 重新开始：`R`
- 自动模式：`M`（自动寻路吃食物）

### 手机

- 移动：在画布上滑动，或点击下方方向键
- 暂停/继续：点击「暂停/继续」按钮
- 自动模式：点击「自动：开/关」按钮

## 文件结构

```
openclaw-exec-snake-game/
├── index.html
├── style.css
├── main.js
└── README.md
```
