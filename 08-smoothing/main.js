// 08 · Smoothing
//
// AI 视觉的输出每一帧都在轻微抖动（jitter）——就算你的手完全不动，
// y 坐标也会在 0.512 / 0.498 / 0.507 之间跳。直接映射到音高，声音会抖。
//
// 解决办法简单到只有一行：
//
//   smoothed = alpha * current + (1 - alpha) * previous
//
// alpha 小 → 很稳但反应慢（像在水里挥手）
// alpha 大 → 反应快但抖（alpha = 1 等于没平滑）
//
// 页面里：红点 = raw（抖），绿点 = smoothed（稳）。开关可以随时对比。

import { initHands, detectHands, drawHands, INDEX_TIP } from "../shared/hands.js";

const LOW_FREQ = 220;
const HIGH_FREQ = 880;

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const startButton = document.getElementById("startButton");
const smoothingToggle = document.getElementById("smoothingToggle");
const alphaSlider = document.getElementById("alphaSlider");
const alphaValue = document.getElementById("alphaValue");
const rawValue = document.getElementById("rawValue");
const smoothValue = document.getElementById("smoothValue");

let alpha = Number(alphaSlider.value);
alphaSlider.addEventListener("input", () => {
  alpha = Number(alphaSlider.value);
  alphaValue.textContent = alpha.toFixed(2);
});

// ---- 声音 ----
const osc = new Tone.Oscillator(440, "sine");
const volume = new Tone.Volume(-Infinity);
osc.connect(volume);
volume.toDestination();
Tone.Destination.volume.value = -12;

let audioStarted = false;
startButton.addEventListener("click", async () => {
  await Tone.start();
  osc.start();
  audioStarted = true;
  startButton.disabled = true;
  startButton.textContent = "🔊 声音已启动";
});

let smoothedY = null; // 上一帧的平滑值；还没有时为 null

try {
  await startCamera(video);
  status.textContent = "正在加载手部模型…";
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const landmarker = await initHands(2);
  status.textContent = "手保持不动，观察两个点的差别 🔴🟢";
  status.className = "status ok";

  function loop() {
    const result = detectHands(landmarker, video);
    if (!result) return requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hands = drawHands(ctx, result, canvas.width, canvas.height);

    if (hands.length > 0) {
      const rawY = hands[0].landmarks[INDEX_TIP].y;
      const screenX = 1 - hands[0].landmarks[INDEX_TIP].x;

      // ★ 就这一行：exponential moving average
      if (smoothedY === null) smoothedY = rawY; // 第一帧：直接采用
      smoothedY = alpha * rawY + (1 - alpha) * smoothedY;

      // 声音用哪个值，由开关决定——课堂上关掉开关，立刻能听到抖动
      const yForSound = smoothingToggle.checked ? smoothedY : rawY;
      const freq = HIGH_FREQ * Math.pow(LOW_FREQ / HIGH_FREQ, yForSound);
      osc.frequency.rampTo(freq, 0.05);
      volume.volume.rampTo(-6, 0.1);

      // 红点 = raw，绿点 = smoothed
      ctx.fillStyle = "#ff5f5f";
      ctx.beginPath();
      ctx.arc(screenX * canvas.width, rawY * canvas.height, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#7dffa8";
      ctx.beginPath();
      ctx.arc(screenX * canvas.width, smoothedY * canvas.height, 14, 0, Math.PI * 2);
      ctx.fill();

      rawValue.textContent = rawY.toFixed(3);
      smoothValue.textContent = smoothedY.toFixed(3);
      DebugPanel.show({
        "raw y": rawY,
        "smoothed y": smoothedY,
        "两者差距": Math.abs(rawY - smoothedY),
        "alpha": alpha,
        "smoothing": smoothingToggle.checked ? "ON" : "OFF",
        "frequency (Hz)": Math.round(freq),
      });
    } else {
      volume.volume.rampTo(-Infinity, 0.2);
      smoothedY = null; // 手消失了就重置，下次从新的位置重新开始
      rawValue.textContent = "——";
      smoothValue.textContent = "——";
      DebugPanel.show({ "提示": "没有检测到手（已静音）" });
    }

    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  status.textContent = err.message;
  status.className = "status error";
}
