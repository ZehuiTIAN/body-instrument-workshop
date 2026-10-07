// 07 · Pinch Gesture
//
// 手势识别不需要额外的 AI 模型！
// 两个关键点的距离 = 一个数。距离够小，就是"捏合"：
//
//   thumb tip (4号点) ←—distance—→ index tip (8号点)
//   distance < threshold  →  PINCH（捏住）→ NOTE ON
//   distance ≥ threshold  →  OPEN （松开）→ NOTE OFF

import { initHands, detectHands, drawHands, INDEX_TIP, THUMB_TIP } from "../shared/hands.js";

// ★ 捏合判断的参数。landmark 坐标是 0~1 的，0.06 大概是"指尖刚好碰上"。
//
// 为什么是两个阈值而不是一个？
// 如果只有 distance < threshold，手停在阈值附近时，检测结果会在
// 0.069 / 0.071 之间抖 → pinch 疯狂开关 → 声音变成"哒哒哒"。
// 解决办法叫【迟滞 hysteresis】：进来走小门，出去走大门——
//   距离 < ON 阈值  → 判定为捏合
//   距离 > OFF 阈值 → 才判定为松开（OFF > ON，中间是"保持现状"的缓冲区）
const PINCH_ON_THRESHOLD = 0.06;  // 捏合：距离要小于这个才算"捏上"
const PINCH_OFF_THRESHOLD = 0.09; // 松开：距离要大于这个才算"放开"
const MIN_HOLD_MS = 150;          // 最短保持：捏上后至少响 150ms，防止瞬间抖动误触发

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
let pinch = false;        // 捏合状态要跨帧记住，所以声明在循环外面
let pinchStartTime = 0;
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
      const distance = Math.hypot(thumb.x - index.x, thumb.y - index.y);

      // ★ 迟滞 + 最短保持：稳定的手势状态机（参数含义见文件顶部）
      const now = performance.now();
      if (!pinch && distance < PINCH_ON_THRESHOLD) {
        pinch = true;
        pinchStartTime = now;
      } else if (pinch && distance > PINCH_OFF_THRESHOLD && now - pinchStartTime > MIN_HOLD_MS) {
        pinch = false;
      }

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
        "on 阈值": PINCH_ON_THRESHOLD,
        "off 阈值": PINCH_OFF_THRESHOLD,
        "pinch": pinch,
        "audio": audioStarted ? (noteIsOn ? "🔊 发声中" : "已启动·静音") : "未启动",
        "frequency (Hz)": Math.round(freq),
      });
    } else {
      // 手消失时如果音还响着，必须关掉——否则它会永远响下去
      if (noteIsOn) {
        synth.triggerRelease();
        noteIsOn = false;
      }
      pinch = false;
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
