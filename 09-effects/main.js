// 09 · Effects — 把前面所有课组装成一件完整的乐器
//
//   右手高度  → 音高（五声音阶）
//   右手捏合  → NOTE ON / OFF
//   左手左右  → filter cutoff（音色明暗）
//   两手距离  → reverb（空间大小）
//
// 这节课的重点不是效果器本身，而是看清这条链：
//   input（身体数据）→ mapping（映射层）→ output（声音参数）

import { initHands, detectHands, drawHands, INDEX_TIP, THUMB_TIP } from "../shared/hands.js";

// ---- 可改参数 ----
const scale = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"];
// 捏合用迟滞双阈值（原理见 07 课）：防止在阈值附近抖动导致 note on/off 连发
const PINCH_ON_THRESHOLD = 0.06;
const PINCH_OFF_THRESHOLD = 0.09;
const MIN_HOLD_MS = 150;
const SMOOTH_ALPHA = 0.2;       // 08 课的平滑，这里固定开着
const FILTER_MIN = 200;         // filter cutoff 范围 (Hz)
const FILTER_MAX = 6000;

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const noteValue = document.getElementById("noteValue");
const filterValue = document.getElementById("filterValue");
const reverbValue = document.getElementById("reverbValue");
const startButton = document.getElementById("startButton");

// ---- 声音链：synth → filter → reverb → 扬声器 ----
// 效果器就是信号路上的"站"：声音从 synth 出发，依次经过每一站。
const synth = new Tone.Synth({
  oscillator: { type: "sawtooth" },
  envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.3 },
});
const filter = new Tone.Filter(1000, "lowpass"); // 低通滤波：cutoff 越低越闷
const reverb = new Tone.Reverb({ decay: 4, wet: 0 }); // wet=0 表示一开始没有混响
synth.chain(filter, reverb, Tone.Destination);
Tone.Destination.volume.value = -12;

let audioStarted = false;
let noteIsOn = false;
startButton.addEventListener("click", async () => {
  await Tone.start();
  await reverb.ready; // 混响需要先生成一段"房间样本"，等它准备好
  audioStarted = true;
  startButton.disabled = true;
  startButton.textContent = "🔊 声音已启动";
});

let smoothedY = null;
let pinchState = false;
let pinchStartTime = 0;

try {
  await startCamera(video);
  status.textContent = "正在加载手部模型…";
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const landmarker = await initHands(2);
  status.textContent = "右手捏合发声 🤏 左手左右调音色，两手拉开加混响";
  status.className = "status ok";

  function loop() {
    const result = detectHands(landmarker, video);
    if (!result) return requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hands = drawHands(ctx, result, canvas.width, canvas.height);

    let rightHand = hands.find((h) => h.label === "Right");
    let leftHand = hands.find((h) => h.label === "Left");
    if (hands.length === 2 && (!rightHand || !leftHand)) {
      const byScreenX = [...hands].sort(
        (a, b) => (1 - b.landmarks[INDEX_TIP].x) - (1 - a.landmarks[INDEX_TIP].x)
      );
      rightHand = rightHand || byScreenX[0];
      leftHand = leftHand || byScreenX[1];
    }

    // ============ INPUTS：身体给了什么数据 ============
    const inputs = {
      rightHandY: null,
      leftHandX: null,
      handDistance: null,
      pinch: false,
    };

    if (rightHand) {
      const rawY = rightHand.landmarks[INDEX_TIP].y;
      if (smoothedY === null) smoothedY = rawY;
      smoothedY = SMOOTH_ALPHA * rawY + (1 - SMOOTH_ALPHA) * smoothedY;
      inputs.rightHandY = smoothedY;

      const thumb = rightHand.landmarks[THUMB_TIP];
      const index = rightHand.landmarks[INDEX_TIP];
      const d = Math.hypot(thumb.x - index.x, thumb.y - index.y);
      const now = performance.now();
      if (!pinchState && d < PINCH_ON_THRESHOLD) {
        pinchState = true;
        pinchStartTime = now;
      } else if (pinchState && d > PINCH_OFF_THRESHOLD && now - pinchStartTime > MIN_HOLD_MS) {
        pinchState = false;
      }
      inputs.pinch = pinchState;
    } else {
      smoothedY = null;
      pinchState = false;
    }

    if (leftHand) {
      inputs.leftHandX = 1 - leftHand.landmarks[INDEX_TIP].x; // 镜像修正
    }

    if (rightHand && leftHand) {
      const r = rightHand.landmarks[INDEX_TIP];
      const l = leftHand.landmarks[INDEX_TIP];
      inputs.handDistance = Math.hypot(r.x - l.x, r.y - l.y); // 0~1 之间，约
    }

    // ============ MAPPING：input → output（想改乐器就改这里）============
    const outputs = { note: null, noteOn: false, filterCutoff: null, reverbWet: null };

    if (inputs.rightHandY !== null) {
      const y = Math.min(Math.max(inputs.rightHandY, 0), 1);
      const index = Math.min(Math.floor((1 - y) * scale.length), scale.length - 1);
      outputs.note = scale[index];
      outputs.noteOn = inputs.pinch;
    }
    if (inputs.leftHandX !== null) {
      // 指数映射：滤波器听起来更自然（理由和音高一样，人耳是对数的）
      outputs.filterCutoff = FILTER_MIN * Math.pow(FILTER_MAX / FILTER_MIN, inputs.leftHandX);
    }
    if (inputs.handDistance !== null) {
      // 两手距离 0.1~0.9 → reverb 0%~80%（拉到最满会糊，保守一点）
      const t = Math.min(Math.max((inputs.handDistance - 0.1) / 0.8, 0), 1);
      outputs.reverbWet = t * 0.8;
    }

    // ============ OUTPUTS：应用到声音 ============
    if (audioStarted) {
      if (outputs.noteOn && !noteIsOn) {
        synth.triggerAttack(outputs.note);
        noteIsOn = true;
      }
      if (outputs.noteOn && noteIsOn) {
        synth.frequency.rampTo(Tone.Frequency(outputs.note).toFrequency(), 0.05);
      }
      if (!outputs.noteOn && noteIsOn) {
        synth.triggerRelease();
        noteIsOn = false;
      }
      if (outputs.filterCutoff !== null) filter.frequency.rampTo(outputs.filterCutoff, 0.1);
      if (outputs.reverbWet !== null) reverb.wet.rampTo(outputs.reverbWet, 0.1);
    }

    noteValue.textContent = outputs.noteOn ? outputs.note : outputs.note || "——";
    filterValue.textContent = outputs.filterCutoff !== null ? Math.round(outputs.filterCutoff) : "——";
    reverbValue.textContent = outputs.reverbWet !== null ? Math.round(outputs.reverbWet * 100) + "%" : "——";
    DebugPanel.show({
      "input.rightHandY": inputs.rightHandY,
      "input.leftHandX": inputs.leftHandX,
      "input.handDistance": inputs.handDistance,
      "input.pinch": inputs.pinch,
      "→ note": outputs.note,
      "→ filter (Hz)": outputs.filterCutoff !== null ? Math.round(outputs.filterCutoff) : null,
      "→ reverb wet": outputs.reverbWet,
      "audio": audioStarted ? (noteIsOn ? "🔊 发声中" : "已启动·静音") : "未启动",
    });

    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  status.textContent = err.message;
  status.className = "status error";
}
