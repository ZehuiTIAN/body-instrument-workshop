// 04 · Hand Controls Pitch
//
// 核心概念：mapping（映射）
// 食指指尖的 Y 坐标（0~1 的数）→ 频率（220~880 Hz 的数）
//
// 手在高处 → 880 Hz（高音）
// 手在低处 → 220 Hz（低音）

import { initHands, detectHands, drawHands, INDEX_TIP } from "../shared/hands.js";

// ---- 可以随便改的参数 ----
const LOW_FREQ = 220;  // 手在最低处时的频率 (Hz)
const HIGH_FREQ = 880; // 手在最高处时的频率 (Hz)

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const freqValue = document.getElementById("freqValue");
const yValue = document.getElementById("yValue");
const startButton = document.getElementById("startButton");

// ---- 声音 ----
// 一个振荡器（持续发声的简单波形）→ 音量控制 → 扬声器
// Tone.js 的节点用 .connect() 像接线一样串起来。
const osc = new Tone.Oscillator(440, "sine");
const volume = new Tone.Volume(-Infinity); // 一开始静音，检测到手才出声
osc.connect(volume);
volume.toDestination();
Tone.Destination.volume.value = -12; // 总音量保守一点，防止现场爆音

let audioStarted = false;
startButton.addEventListener("click", async () => {
  // 浏览器要求：必须有一次真实点击，音频上下文才会解锁
  await Tone.start();
  osc.start();
  audioStarted = true;
  startButton.disabled = true;
  startButton.textContent = "🔊 声音已启动";
});

// ---- 视觉 + 检测 ----
try {
  await startCamera(video);
  status.textContent = "正在加载手部模型…";
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const landmarker = await initHands(2);
  status.textContent = audioStarted ? "上下移动你的手 🎵" : "先点 Start Audio，再上下移动手";
  status.className = "status ok";

  function loop() {
    const result = detectHands(landmarker, video);
    if (!result) return requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hands = drawHands(ctx, result, canvas.width, canvas.height);

    if (hands.length > 0) {
      const tip = hands[0].landmarks[INDEX_TIP];
      const handY = tip.y; // 0 = 手在画面顶部，1 = 底部

      // ★ 映射：Y (0~1) → 频率 (HIGH~LOW)
      // 用指数插值而不是线性，因为人耳对音高的感知是对数的：
      // 220→440→880 听起来是"均匀的"两个八度，线性的听起来不是。
      const freq = HIGH_FREQ * Math.pow(LOW_FREQ / HIGH_FREQ, handY);

      // rampTo 而不是直接赋值：频率变化在 0.05 秒内平滑过渡，不会"咯噔"
      osc.frequency.rampTo(freq, 0.05);
      volume.volume.rampTo(-6, 0.1); // 手出现了，淡入到可听音量

      // 在指尖位置画一个随着音高变色的圆
      ctx.fillStyle = `hsl(${(handY * 240 + 120) % 360}, 80%, 60%)`;
      ctx.beginPath();
      ctx.arc((1 - tip.x) * canvas.width, handY * canvas.height, 24, 0, Math.PI * 2);
      ctx.fill();

      freqValue.textContent = Math.round(freq);
      yValue.textContent = handY.toFixed(3);
      DebugPanel.show({
        "indexFinger.y": handY,
        "frequency (Hz)": Math.round(freq),
        "audio started": audioStarted,
      });
    } else {
      // 手消失了：淡出到静音。绝对不能让声音卡住或爆掉。
      volume.volume.rampTo(-Infinity, 0.2);
      freqValue.textContent = "——";
      yValue.textContent = "——";
      DebugPanel.show({ "提示": "没有检测到手（已静音）" });
    }

    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  status.textContent = err.message;
  status.className = "status error";
}
