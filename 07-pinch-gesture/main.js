// 07 · Pinch Gesture
//
// 手势识别不需要额外的 AI 模型！
// 两个关键点的距离 = 一个数。距离够小，就是"捏合"：
//
//   thumb tip (4号点) ←—distance—→ index tip (8号点)
//   distance < threshold  →  PINCH（捏住）→ NOTE ON
//   distance ≥ threshold  →  OPEN （松开）→ NOTE OFF

import { initHands, detectHands, drawHands, INDEX_TIP, THUMB_TIP } from "../shared/hands.js";

// ★ 捏合阈值：landmark 坐标是 0~1 的，0.07 大概是"指尖刚好碰上"。
// 太容易触发就调小，太难触发就调大。
const PINCH_THRESHOLD = 0.07;

const LOW_FREQ = 220;
const HIGH_FREQ = 880;

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const pinchState = document.getElementById("pinchState");
const startButton = document.getElementById("startButton");

// ---- 声音 ----
// 这次用 Synth 的持续模式：triggerAttack() 开始响，triggerRelease() 停止。
// 捏住不放 = 音一直响，松开 = 音消失。像按住琴键。
const synth = new Tone.Synth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.02, decay: 0.1, sustain: 1.0, release: 0.4 },
});
synth.toDestination();
Tone.Destination.volume.value = -12;

let audioStarted = false;
let noteIsOn = false;
startButton.addEventListener("click", async () => {
  await Tone.start();
  audioStarted = true;
  startButton.disabled = true;
  startButton.textContent = "🔊 声音已启动";
});

try {
  await startCamera(video);
  status.textContent = "正在加载手部模型…";
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const landmarker = await initHands(2);
  status.textContent = "捏合 🤏 发声，松开静音";
  status.className = "status ok";

  function loop() {
    const result = detectHands(landmarker, video);
    if (!result) return requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hands = drawHands(ctx, result, canvas.width, canvas.height);

    if (hands.length > 0) {
      const landmarks = hands[0].landmarks;
      const thumb = landmarks[THUMB_TIP];
      const index = landmarks[INDEX_TIP];

      // ★ 手势就是一道数学题：两点距离
      const dx = thumb.x - index.x;
      const dy = thumb.y - index.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const pinch = distance < PINCH_THRESHOLD;

      // 手的高度仍然控制音高（连续频率）
      const freq = HIGH_FREQ * Math.pow(LOW_FREQ / HIGH_FREQ, index.y);
      synth.frequency.rampTo(freq, 0.05);

      // ★ 捏合 → NOTE ON，松开 → NOTE OFF（只在状态变化时触发）
      if (audioStarted && pinch && !noteIsOn) {
        synth.triggerAttack(freq);
        noteIsOn = true;
      }
      if (!pinch && noteIsOn) {
        synth.triggerRelease();
        noteIsOn = false;
      }

      // 在两个指尖之间画一条线，捏合时变绿变粗
      ctx.strokeStyle = pinch ? "#7dffa8" : "#ffffff";
      ctx.lineWidth = pinch ? 6 : 2;
      ctx.beginPath();
      ctx.moveTo(thumb.x * canvas.width, thumb.y * canvas.height);
      ctx.lineTo(index.x * canvas.width, index.y * canvas.height);
      ctx.stroke();

      pinchState.textContent = pinch ? "PINCH 🤏" : "OPEN";
      pinchState.style.color = pinch ? "#7dffa8" : "#e8e8f0";
      DebugPanel.show({
        "thumb.x": thumb.x,
        "thumb.y": thumb.y,
        "index.x": index.x,
        "index.y": index.y,
        "distance": distance,
        "threshold": PINCH_THRESHOLD,
        "pinch": pinch,
        "frequency (Hz)": Math.round(freq),
      });
    } else {
      // 手消失时如果音还响着，必须关掉——否则它会永远响下去
      if (noteIsOn) {
        synth.triggerRelease();
        noteIsOn = false;
      }
      pinchState.textContent = "OPEN";
      pinchState.style.color = "#e8e8f0";
      DebugPanel.show({ "提示": "没有检测到手" });
    }

    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  status.textContent = err.message;
  status.className = "status error";
}
