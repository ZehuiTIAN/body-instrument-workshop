# TECH_PLAN.md — 技术方案

> 目标读者：讲师 / 助教 / Coding Agent。
> 第一优先级：**30 个零编程基础的参与者在 workshop 现场能跑起来、能改。**

## 1. 技术选型（已验证）

| 需求 | 选择 | 理由 |
|---|---|---|
| 手部关键点 | **MediaPipe Tasks Vision `HandLandmarker`**（`@mediapipe/tasks-vision@0.10.14`） | Google 官方维护，浏览器端 WASM 推理，21 个关键点 + handedness，免费、无 API key、纯本地推理 |
| 声音 | **Tone.js 15**（全局 `Tone` 对象，普通 script 标签） | 零构建，API 直白（Oscillator / Synth / Reverb / Filter），autoplay 合规只需一次 `Tone.start()` |
| 视觉反馈 | **原生 Canvas 2D** |  checkpoint 1–9 不需要 p5.js；Canvas API 足够短，少一个依赖 |
| 框架 | **无框架，vanilla JS + ES Modules** | 浏览器原生支持模块，不需要打包工具 |
| 模型/库的加载 | **全部 vendor 到 `shared/vendor/`** | 已下载：vision_bundle.mjs、WASM 运行时（SIMD + 降级版）、hand_landmarker.task（约 8MB）、Tone.js。**现场断网也能跑。** |

### 为什么不用其他方案

- **TensorFlow.js hand-pose-detection**：功能等价但包更大、API 更绕，workshop 场景没有优势。
- **ml5.js**：对零基础友好，但底层模型版本旧、双手支持不稳定，现场风险高。
- **p5.js**：sound 部分依赖 WebAudio 封装不如 Tone.js 稳定；视觉用原生 Canvas 已足够短。
- **React / Vite / npm build**：对零基础参与者是纯负担，明确排除。

## 2. 运行方式

- 静态文件 + 任意本地 HTTP 服务器（摄像头权限要求 secure context，`localhost` 满足）。
- 推荐：VS Code **Live Server** 插件（参与者大概率已装 VS Code + Coding Agent），或 `npx serve`。
- 提供 `start-windows.bat` / `start-mac.command` 双击脚本（内部调用 `npx serve`）。
- **不要**直接双击 html（`file://` 下摄像头和 ES Modules 都会被浏览器拒绝）。

## 3. 架构

```
body-instrument-workshop/
  shared/            ← 所有 checkpoint 共用的"无聊但必要"的代码
    vendor/          ← 模型 + 库（离线可用）
    hands.js         ← ES module：加载模型、检测、画关键点
    camera.js        ← 全局函数 startCamera(video)
    debug.js         ← 全局 DebugPanel（实时数值面板）
    style.css
  01-camera/ … 09-effects/
    index.html       ← UI 骨架（每个 checkpoint 独立）
    main.js          ← 该 checkpoint 的教学核心，尽量短
  10-creative-starter/
    config.js        ← 所有可改参数集中在这里
    input/ sound/ visual/  main.js
```

设计约定：

- **教学逻辑放在 checkpoint 自己的 `main.js` 里**，shared/ 只放"每次都一样、讲了也没营养"的部分（加载模型、画 21 个点）。
- 镜像问题统一约定：video 和 canvas 都用 CSS `scaleX(-1)` 镜像显示；逻辑代码里用 `screenX = 1 - landmark.x`，让 x 和参与者在屏幕上看到的方向一致。**只有这一处需要理解镜像。**
- 推理节奏：`requestAnimationFrame` 渲染，但只在 `video.currentTime` 变化时跑模型（≈30fps 摄像头 = 30 次/秒推理），8GB 无独显笔记本轻松跑满。
- 模型配置：`delegate: "GPU"` 失败自动降级 `"CPU"`；`numHands: 2` 从 checkpoint 02 起就固定（06 不需要改模型配置）。
- 声音安全：默认音量保守（`Tone.Destination.volume = -12dB`，单音增益 ≤0.2），所有频率/音量变化用 `rampTo` 平滑，检测不到手时静音/保持，绝不爆音。

## 4. 依赖清单（全部已 vendor，无运行时外部请求）

| 文件 | 来源 | 大小 |
|---|---|---|
| `shared/vendor/vision_bundle.mjs` | @mediapipe/tasks-vision@0.10.14 | 137 KB |
| `shared/vendor/wasm/*` | 同上（SIMD + nosimd 降级） | ~19 MB |
| `shared/vendor/hand_landmarker.task` | Google MediaPipe 模型仓库（float16） | 7.8 MB |
| `shared/vendor/Tone.js` | tone@15.1.22 | 345 KB |

## 5. 实现顺序

1. **Prototype 链路**（= checkpoint 01→04 的骨架）：camera → landmarks → 指尖 Y → Tone.js 振荡器。验证通过后再继续。
2. 按 05→09 顺序扩展，每个 checkpoint 完成后：无 console error + 前一 checkpoint 仍可运行。
3. 最后做 10（模块化重组，不引入新能力）+ README + WORKSHOP_NOTES。

## 6. 已知风险与对策

| 风险 | 对策 |
|---|---|
| Safari 对 WASM SIMD / OffscreenCanvas 支持差异 | vendor 里带 nosimd 降级版；HandLandmarker 用主线程 + video 输入（兼容性最好的用法）；README 注明 Safari 需要 16.4+，现场优先 Chrome/Edge |
| 摄像头被拒 | camera.js 给出明确中文错误提示（权限/被占用/无摄像头） |
| 手消失瞬间音频爆音或卡住 | 所有音频参数 rampTo；无手时 oscillator 音量 ramp 到 0 |
| handedness 左右手判断偶发翻转 | 06 里优先用模型 handedness，缺失时退回"屏幕位置左右"兜底；代码里注释说明 |
| 参与者改坏某个 checkpoint | 每个 checkpoint 独立文件夹，改坏一个不影响其他；建议现场 git init 或让 Agent 改之前先复制 |
