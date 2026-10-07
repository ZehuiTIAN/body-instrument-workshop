// 10 · Creative Starter — main.js
//
// 这是 Day 3 自由创作的起点。结构：
//
//   config.js         ← 所有可改参数
//   input/hands.js    ← 摄像头 + 手部数据（outputs 一个 inputs 对象）
//   input/gestures.js ← 捏合、距离等手势
//   sound/synth.js    ← 发声体
//   sound/effects.js  ← filter + reverb
//   sound/scales.js   ← 音阶
//   visual/           ← 画骨架、画粒子
//
// 本文件只负责"接线"：input → mapping → output。
// ★ 默认映射在底部的 mapping() 函数里，改乐器行为就改它 ★

import { config } from "./config.js";
import { initInput, readInputs } from "./input/hands.js";
import { yToNote } from "./sound/scales.js";
import { createSynth } from "./sound/synth.js";
import { createEffects } from "./sound/effects.js";
import { drawHands } from "./visual/landmarks.js";
import { burst, drawParticles } from "./visual/particles.js";

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const noteValue = document.getElementById("noteValue");
const pinchValue = document.getElementById("pinchValue");
const startButton = document.getElementById("startButton");

// ---- 组装声音链 ----
Tone.Destination.volume.value = config.masterVolumeDb;
const effects = createEffects(config);
const synth = createSynth(config, effects.input);

let audioStarted = false;
startButton.addEventListener("click", async () => {
  await Tone.start();
  await effects.ready();
  audioStarted = true;
  startButton.disabled = true;
  startButton.textContent = "🔊 声音已启动";
});

try {
  await startCamera(video);
  status.textContent = "正在加载手部模型…";
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  await initInput(2, config);
  status.textContent = "右手捏合发声 🤏 左手调音色，两手拉开加混响";
  status.className = "status ok";

  function loop() {
    const inputs = readInputs(video, config);
    if (!inputs) return requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHands(ctx, inputs._raw, canvas.width, canvas.height);
    drawParticles(ctx);

    const outputs = mapping(inputs);
    applyOutputs(outputs, inputs);

    noteValue.textContent = outputs.noteOn ? outputs.note : outputs.note || "——";
    pinchValue.textContent = inputs.rightHand ? (inputs.rightHand.pinch ? " 🤏" : " ✋") : "";
    DebugPanel.show({
      "rightHand.x": inputs.rightHand?.x,
      "rightHand.y": inputs.rightHand?.y,
      "leftHand.x": inputs.leftHand?.x,
      "leftHand.y": inputs.leftHand?.y,
      "handDistance": inputs.handDistance,
      "pinch": inputs.rightHand?.pinch,
      "→ note": outputs.note,
      "→ filter": outputs.filter,
      "→ reverb": outputs.reverb,
      "audio": audioStarted ? (synth.isPlaying ? "🔊 发声中" : "已启动·静音") : "未启动",
    });

    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  status.textContent = err.message;
  status.className = "status error";
}

// ================================================================
// ★ MAPPING — 整件乐器最值得改的地方 ★
//
// 输入（身体数据，全是 0~1 的数或 true/false）：
//   inputs.rightHand  { x, y, pinch }   — null 表示右手不在画面里
//   inputs.leftHand   { x, y }          — null 表示左手不在
//   inputs.handDistance                 — 两食指尖距离，null 表示不是两只手
//
// 输出（乐器的旋钮）：
//   note     音名（"G4"）或 null
//   noteOn   true = 发声，false = 静音
//   filter   0~1 → 音色从闷到亮
//   reverb   0~1 → 混响从小到大
//
// 试试对 Coding Agent 说：
//   "把两手距离改成控制音量"
//   "右手左右移动控制 filter，上下控制音高不变"
//   "握拳（pinch）时触发鼓声而不是长音"
// ================================================================
function mapping(inputs) {
  const outputs = { note: null, noteOn: false, filter: null, reverb: null };

  if (inputs.rightHand) {
    outputs.note = yToNote(inputs.rightHand.y, config.scale);
    outputs.noteOn = inputs.rightHand.pinch;
  }
  if (inputs.leftHand) {
    outputs.filter = inputs.leftHand.x;
  }
  if (inputs.handDistance !== null) {
    // 距离 0.1~0.9 映射到 0~1
    outputs.reverb = (inputs.handDistance - 0.1) / 0.8;
  }
  return outputs;
}

// ---- 把 mapping 的结果应用到声音和视觉（一般不用改这里）----
function applyOutputs(outputs, inputs) {
  if (!audioStarted) return;

  if (outputs.noteOn && outputs.note) {
    if (!synth.isPlaying) {
      synth.noteOn(outputs.note);
      if (config.particlesOnNoteOn && inputs.rightHand) {
        burst(inputs.rightHand.x * canvas.width, inputs.rightHand.y * canvas.height);
      }
    } else {
      synth.setNote(outputs.note);
    }
  } else {
    synth.noteOff();
  }

  if (outputs.filter !== null) effects.setFilter(outputs.filter);
  if (outputs.reverb !== null) effects.setReverb(outputs.reverb);
}
