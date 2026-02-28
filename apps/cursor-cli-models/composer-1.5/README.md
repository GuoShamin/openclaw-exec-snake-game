# 贪吃蛇 · 自动驾驶

静态网页版贪吃蛇，支持自动驾驶、移动端触屏、GitHub Pages 部署。

## 最简运行方式

### 本地

**方式一：直接打开**
```bash
# 在项目目录下，用浏览器打开
open index.html
# 或双击 index.html
```

**方式二：静态服务器（推荐，避免部分浏览器对 file:// 的限制）**
```bash
# Python 3
python3 -m http.server 8080

# 或 Python 2
python -m SimpleHTTPServer 8080

# 或 npx
npx serve -p 8080
```

然后访问 `http://localhost:8080` 或 `http://localhost:8080/index.html`。

### GitHub Pages 部署

1. 将本目录推送到 GitHub 仓库
2. 仓库设置 → Pages → Source 选择该分支，根目录或 `/docs`（若放在 docs 下）
3. 若放在子目录（如 `snake/`），则访问 `https://<username>.github.io/<repo>/snake/` 或对应路径

**路径说明**：所有资源均为相对路径，部署到任意子目录均可直接运行。

## 自动驾驶策略

- **BFS 寻路**：从蛇头到食物找最短路径
- **安全检验**：若走该路径吃食物后，蛇头能否到达蛇尾（避免吃完后被困死）
- **跟随蛇尾**：若去食物不安全，则向蛇尾方向移动以保持活动空间
- **兜底**：若两者都不可行，选一个不会立刻撞墙/撞自己的方向

## 文件清单

| 相对路径 | 说明 |
|---------|------|
| `index.html` | 主页面（含样式与脚本） |
| `README.md` | 本说明文件 |
