# TECH_RESEARCH.md — 技术调研记录

> 写给讲师和助教：为什么是这个技术栈，参考了哪些已有项目，现场最容易翻车的地方在哪。

## 0. 已有项目调研

动手之前参考了几个成熟的 gesture → music 项目：

| 项目 | 技术 | 可借鉴的模式 |
|---|---|---|
| **Google Creatability / Body Synth**（Google Creative Lab，2019 Webby 奖） | TensorFlow.js PoseNet + Tone.js，全部浏览器端 | ① 身体部位直接映射到音符，灵敏度做成可调参数；② 纯本地推理 = 隐私卖点，也意味着无网络依赖；③ 配套开源组件库和教程，证明"浏览器端 AI + Tone.js"在真实教学/无障碍场景大规模验证过 |
| **ml5.js HandPose 教学示例**（如 Pippin Barr 的课程笔记） | ml5.handpose（21 关键点）+ p5.js | ① 21 关键点直接画在画面上是最有效的"模型输出可视化"；② 但 ml5 封装的双手支持和模型更新滞后是已知短板 |
| **大量 air-theremin / hand-MIDI 开源 demo**（GitHub: `mediapipe hands tone.js`） | MediaPipe Hands + Tone.js | 共同套路：手高度→音高、拇指食指距离→某个参数、指数映射频率、rampTo 平滑。这套映射约定已是事实标准，本 kit 沿用 |

共同教训（直接影响了本 kit 的设计）：

1. **镜像问题人人踩**：video 镜像显示但坐标不镜像，是所有教程里参与者第一个卡住的地方。本 kit 统一约定"CSS 镜像显示 + 逻辑代码 `1 - x`"。
2. **handedness 不稳定时别硬撑**：交叉手、侧身手都会导致左右手标签翻转。成熟做法是标签优先 + 位置兜底（本 kit 06 起全部这样做）。
3. **pinch 裸阈值必抖**：所有只写 `distance < threshold` 的 demo 在阈值附近都会 note on/off 连发。本 kit 用迟滞双阈值 + 最短保持（07 课会专门讲）。
4. **声音不跟随渲染帧**：用 Web Audio 自己的调度（Tone.js 的 `rampTo`/`triggerAttack`），渲染帧只负责"下指令"，绝不在 `requestAnimationFrame` 里做音频定时。

## 1. 推荐技术栈（最终选择）

| 层 | 选择 | 版本 |
|---|---|---|
| 手部识别 | MediaPipe Tasks Vision `HandLandmarker` | @mediapipe/tasks-vision **0.10.14** |
| 模型 | hand_landmarker.task（float16） | Google 官方 v1 |
| 声音 | Tone.js | **15.1.22** |
| 视觉 | 原生 Canvas 2D | 浏览器自带 |
| 框架 | 无（vanilla JS + ES Modules） | — |
| 分发 | 全部 vendor 在 `shared/vendor/`，零 CDN 依赖 | — |

## 2. 为什么选它

- **HandLandmarker**：Google 官方维护的现役方案（旧的 `@mediapipe/hands` 已进入维护模式）。WASM 推理，无独显的 8GB 笔记本实测可满帧（本 repo 在无独显 Windows + headless Chrome 下 59–60 FPS）。21 关键点 + handedness + 双手，开箱即用。
- **Tone.js**：`Oscillator`/`Synth`/`Filter`/`Reverb` 四个类就覆盖全部课程需求；`rampTo` 内建参数平滑，天然防爆音；一次 `Tone.start()` 解决 autoplay policy。
- **原生 Canvas**：画点和线只需要 `arc`/`moveTo`/`lineTo`，引入 p5.js 只会让参与者多学一套坐标系约定。
- **vendor 一切**：workshop 现场网络是最不可控的变量。模型（8MB）+ WASM（19MB）+ Tone.js（345KB）全部在 repo 里，断网也能上课。

## 3. 备选方案（以及为什么没用）

| 方案 | 放弃原因 |
|---|---|
| TensorFlow.js hand-pose-detection | 功能等价，但包体更大、加载链路更长，现场风险高 |
| ml5.js | 对零基础友好，但底层模型版本旧、双手/handedness 支持不稳定，v1 后 API 变动大 |
| 旧的 @mediapipe/hands (legacy solution) | 官方已转向 Tasks Vision，旧版只该用于维护老项目 |
| p5.js（视觉）/ p5.sound（音频） | Canvas 已够用；p5.sound 的音频调度不如 Tone.js 稳 |
| MediaPipe GestureRecognizer（手势分类） | 能直接识别 "Closed_Fist" 等手势，但模型更重、延迟更高；两点距离的几何方法更透明、更好教 |
| React/Vite/npm | 对零基础参与者是纯负担 |

## 4. 已知风险

1. **Safari 的 WASM SIMD**：Safari 16.4 之前不支持 WASM SIMD，会自动降级到 nosimd（vendor 里已带），推理变慢 2–3 倍但仍可用。Safari < 16.4 直接劝退。
2. **handedness 标签翻转**：交叉手、快速挥动时偶发。已有位置兜底，但标签仍可能瞬间跳变——课堂上别用来讲"绝对可靠"，而是讲"概率输出"。
3. **低光/逆光**：模型置信度下降，表现为关键点抖动加剧、丢手。Smoothing（08）能缓解但不能根治；现场灯光比代码重要。
4. **笔记本性能模式**：Windows 省电模式下 CPU 降频，推理帧率腰斩。课前提醒插电。
5. **摄像头被占用**：Zoom/微信/Teams 常驻后台会独占摄像头（Windows 上尤其常见）。

## 5. 现场 workshop 最容易翻车的地方（按概率排序）

1. **直接双击 html 打开**（file:// 协议下摄像头和 ES Modules 都被禁）→ 必须用本地服务器，README 第一节就讲这个。
2. **没点 Start Audio 就挥手** → autoplay policy 导致无声，参与者以为坏了。每个有声 checkpoint 的按钮都做成大且显眼。
3. **摄像头权限点错"拒绝"** → camera.js 的中文错误提示里写了怎么改回来。
4. **音频爆音** → 默认 -12dB 总音量 + 所有参数 rampTo + 手消失自动静音，三重保险；但参与者的修改可能绕过它们，讲师要提醒"改音量相关的代码前先摘耳机/调小音箱"。
5. **30 人同时打开页面时有人用了 CDN 版本教程** → 本 repo 不依赖 CDN，规避。

## 6. 浏览器与硬件最低要求

| 项 | 最低 | 推荐 |
|---|---|---|
| 浏览器 | Chrome 100+ / Edge 100+ / Safari 16.4+ | 最新 Chrome 或 Edge |
| 内存 | 8GB（关掉无关标签页） | 16GB |
| CPU | 任意近 5 年的 x64 / Apple Silicon | — |
| 摄像头 | 任意内置/外置 webcam | 光线充足的环境 |
| 网络 | **不需要**（vendor 全本地） | — |
| 操作系统 | Windows 10+ / macOS 12+ | — |

## 7. 参考资料

- Creatability 项目介绍：[Ryan Burke](https://www.ryanburke.work/work/creatability)、[Use All Five](https://www.useallfive.com/work/creatability)、[Body Synth 开发记录](https://www.torinblankensmith.com/projects/body-synth-google-creative-lab)
- ml5 HandPose 教学示例：[Pippin Barr's course notes](http://pippinbarr.com/cart263/topics/ai/ml5js-handpose.html)
- MediaPipe Tasks Vision 文档：https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
- Tone.js 文档：https://tonejs.github.io/
