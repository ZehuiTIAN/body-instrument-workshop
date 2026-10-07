# 把身体变成乐器 🎵🤚

**用 AI 视觉做一件不存在的乐器 —— 3 天 Creative Coding Workshop Starter Kit**

摄像头 → 手部关键点识别 → 坐标 → 映射 → 声音。全部在浏览器里运行，不需要 Python、不需要 GPU、不需要 API key、不需要联网（模型和库都已打包在 repo 里）。

## 1. 这是什么

10 个递进的 checkpoint，每个都是一个**可以独立运行的小乐器**。从"打开摄像头"开始，到"双手 + 手势 + 效果器的完整乐器"结束。每个 checkpoint 代码很短、注释很多，专门设计成**适合让 Coding Agent（Claude Code / Codex 等）帮你修改**。

## 2. 怎么启动（重要！）

**不要直接双击 html 文件。** 摄像头和 JavaScript 模块在 `file://` 下会被浏览器禁用，必须通过本地服务器打开。

### 方法一：VS Code Live Server（推荐）

1. 用 VS Code 打开 `body-instrument-workshop` 文件夹
2. 安装扩展 **Live Server**（ritwickdey.LiveServer）
3. 右键任意 checkpoint 的 `index.html` → **Open with Live Server**
4. 浏览器会打开类似 `http://127.0.0.1:5500/01-camera/` 的地址

### 方法二：命令行

```bash
cd body-instrument-workshop
npx serve -l 8000 .
```

然后打开 `http://localhost:8000/01-camera/` 等。
（Windows 也可以双击 `start-windows.bat`，Mac 双击 `start-mac.command`，效果相同。）

### 切换 checkpoint

每个 checkpoint 是一个文件夹，改 URL 里的文件夹名即可，例如：
`http://localhost:8000/07-pinch-gesture/`

## 3. 浏览器要求

- **推荐**：最新版 Chrome 或 Edge（Windows / Mac 都可以）
- Safari 16.4+ 也能跑（会自动用较慢的降级模式）
- 摄像头权限弹窗请点**允许**
- 有声音的 checkpoint（04 起）：**先点页面里的 ▶ Start Audio 按钮**，再挥手

## 4. 每个 checkpoint 教什么

| # | 文件夹 | 你会学到 |
|---|---|---|
| 01 | `01-camera` | 摄像头权限和浏览器环境自检 |
| 02 | `02-hand-landmarks` | 模型输出的不是"手"，是 21 个坐标点 |
| 03 | `03-hand-controls-circle` | 身体动作 → 数字 → 界面元素 |
| 04 | `04-hand-controls-pitch` | 手指高度 → 连续音高（220–880 Hz）；autoplay policy |
| 05 | `05-musical-scale` | 连续坐标 → 五声音阶；`scale` 数组随便改 |
| 06 | `06-two-hand-instrument` | 双手：右手音高、左手音量；inputs→outputs 映射层 |
| 07 | `07-pinch-gesture` | 捏合 = 两点距离；迟滞双阈值防抖动；NOTE ON/OFF |
| 08 | `08-smoothing` | AI 输出在抖；一行指数平滑公式；raw vs smoothed 对比 |
| 09 | `09-effects` | 完整乐器：音阶 + 捏合 + filter + reverb |
| 10 | `10-creative-starter` | Day 3 自由创作的模块化起点；参数集中在 `config.js` |

## 5. Workshop 前如何验证环境（讲师/参与者通用）

1. 启动本地服务器，打开 `01-camera/` → 看到自己 = 摄像头 OK
2. 打开 `02-hand-landmarks/` → 手上出现 21 个点 = 模型 OK（第一次加载约 2–5 秒）
3. 打开 `04-hand-controls-pitch/`，点 Start Audio，挥手 → 听到音高变化 = 音频 OK
4. 打开 `09-effects/` 玩一分钟 → 完整链路 OK
5. 看 Debug 面板的 **FPS**：≥25 流畅；<15 请看常见问题第 6 条

## 6. 常见问题（FAQ）

**Q1: 页面打不开 / 摄像头没反应？**
九成是双击了 html。回到第 2 节，用本地服务器。

**Q2: 提示"摄像头权限被拒绝了"？**
点浏览器地址栏左边的 🔒 图标 → 网站设置 → 摄像头改为"允许" → 刷新。

**Q3: 提示"摄像头被其他程序占用"？**
关掉 Zoom、微信、Teams、其他浏览器标签页，刷新。

**Q4: 挥手没有声音？**
先点 **▶ Start Audio**。浏览器规定：没有用户点击，网页不准出声。

**Q5: 模型一直卡在"正在加载"？**
正常第一次加载 2–5 秒。超过 30 秒：确认你是用本地服务器打开的（见 Q1），并且 `shared/vendor/` 文件夹完整存在。还不行就刷新；再不行换 Chrome。

**Q6: 很卡 / FPS 很低？**
关掉其他占资源的程序；Windows 请插上电源（省电模式会降频）；确认没被视频会议软件占用摄像头。

**Q7: 声音突然很大 / 刺耳？**
默认音量已经很保守（-12dB）。如果你改过代码里的音量参数，先把音箱/耳机音量调小再刷新。Debug 面板会实时显示当前音量。

**Q8: 左右手标反了？**
大概率不是 bug：页面是镜像显示的（像照镜子），标签 LEFT 指的是**你自己的左手**。少数情况下模型会在双手交叉时标错——这是概率模型的正常行为，06 课会讲。

## 7. Windows / macOS 注意事项

- **Windows**：插上电源（省电模式让推理变慢）；注意 Zoom/微信可能后台占用摄像头；`npx serve` 首次运行需要联网下载 serve 包，之后就缓存了。
- **macOS**：第一次打开摄像头会弹系统级权限，允许后刷新页面；如果 VS Code / 终端没出现在"系统设置 → 隐私与安全性 → 摄像头"里，先运行一次再去看。

## 8. 改代码的建议姿势

- 每个 checkpoint 独立：改坏一个不影响其他。改之前可以让 Agent "先把当前文件备份成 main.js.bak"。
- 最好玩的修改入口：05 的 `scale` 数组、07 的阈值、10 的 `config.js` 和 `main.js` 底部的 `mapping()` 函数。
- 直接对 Agent 说人话就行，比如："把两手距离改成控制音量"、"把音阶换成小调"、"捏合时触发鼓声"。

## 9. 仓库结构

```
body-instrument-workshop/
  README.md              ← 你在这里
  TECH_RESEARCH.md       ← 技术调研（为什么选这套栈）
  TECH_PLAN.md           ← 实现方案与架构约定
  TEST_CHECKLIST.md      ← 现场测试清单
  WORKSHOP_NOTES.md      ← 讲师逐课教案
  WORKSHOP_RISK_REPORT.md← 30 人现场风险评估
  shared/                ← 共用代码和库（vendor = 离线模型/库）
  01-camera/ … 10-creative-starter/
```
