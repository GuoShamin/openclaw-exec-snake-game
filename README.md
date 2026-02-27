# OpenClaw Code Lab

这个仓库用于存放 **OpenClaw 相关**的可直接部署（GitHub Pages）的纯前端小项目。

## 项目：贪吃蛇（对比版）

同一个需求：**可以自动运行的贪吃蛇游戏 + 移动端适配**，分别由不同 CLI 生成：

- `apps/claude/` → Claude Code
- `apps/codex/` → Codex
- `apps/gemini/` → Gemini CLI
- `apps/qwen/` → Qwen Code

根目录 `index.html` 是一个入口页，用于跳转到各版本。

## 部署（GitHub Pages）

这是纯静态站点：push 到默认分支后，GitHub Pages 会自动更新。

## 本地运行

在仓库根目录执行：

```bash
python3 -m http.server 5173
# 然后打开 http://localhost:5173
```

> 直接用 `file://` 打开在某些浏览器会有资源/权限差异，建议用本地 server。
