// 06 · Two-Hand Instrument
//
// 两只手 = 两个输入通道。从这里开始，代码里有一个明确的【映射层】：
//
//   inputs  = { rightHandY, leftHandY }   ← 身体给了什么数据
//   outputs = { pitch, volume }           ← 乐器有哪些旋钮
//
// 想改乐器行为，只改"inputs → outputs"那几行，不用动其他地方。

import { initHands, detectHands, drawHands, INDEX_TIP } from "../shared/hands.js";

const LOW_FREQ = 220;
const HIGH_FREQ = 880;

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const freqValue = document.getElementById("freqValue");
const volValue = document.getElementById("volValue");
const startButton = document.getElementById("startButton");

// ---- 声音：持续振荡器，频率和音量都实时可调 ----
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

try {
  await startCamera(video);
  status.textContent = "正在加载手部模型…";
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const landmarker = await initHands(2);
  status.textContent = "右手高度 = 音高，左手高度 = 音量 🙌";
  status.className = "status ok";

  function loop() {
    const result = detectHands(landmarker, video);
    if (!result) return requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hands = drawHands(ctx, result, canvas.width, canvas.height);

    // ---- 从检测结果里找出左手和右手 ----
    // 模型的 handedness 标签是按"自拍视角"给的：Left = 你自己的左手。
    // 如果模型没给标签（少见），就按屏幕位置兜底：偏右的算右手。
    let rightHand = hands.find((h) => h.label === "Right");
    let leftHand = hands.find((h) => h.label === "Left");
    if (hands.length === 2 && (!rightHand || !leftHand)) {
      const byScreenX = [...hands].sort(
        (a, b) => (1 - b.landmarks[INDEX_TIP].x) - (1 - a.landmarks[INDEX_TIP].x)
      );
      rightHand = rightHand || byScreenX[0];
      leftHand = leftHand || byScreenX[1];
    }

    // ---- inputs：身体给出的数据（都整理成 0~1 的数）----
    const inputs = {
      rightHandY: rightHand ? rightHand.landmarks[INDEX_TIP].y : null,
      leftHandY: leftHand ? leftHand.landmarks[INDEX_TIP].y : null,
    };

    // ---- outputs：乐器的旋钮 ----
    const outputs = { pitch: null, volume: null };

    // ★ 映射层：想改乐器，就改这里 ★
    if (inputs.rightHandY !== null) {
      outputs.pitch = HIGH_FREQ * Math.pow(LOW_FREQ / HIGH_FREQ, inputs.rightHandY);
    }
    if (inputs.leftHandY !== null) {
      // 左手高 = 大声。y=0 在顶部，所以翻一下；范围 -30dB ~ -6dB
      outputs.volume = -30 + (1 - inputs.leftHandY) * 24;
    }

    // ---- 应用到声音 ----
    if (outputs.pitch !== null) {
      osc.frequency.rampTo(outputs.pitch, 0.05);
      // 右手负责出声；左手在就接管音量，不在就用默认音量
      volume.volume.rampTo(outputs.volume !== null ? outputs.volume : -12, 0.1);
    } else {
      volume.volume.rampTo(-Infinity, 0.2); // 右手消失 → 静音
    }

    freqValue.textContent = outputs.pitch !== null ? Math.round(outputs.pitch) : "——";
    volValue.textContent = outputs.volume !== null ? Math.round(outputs.volume) + " dB" : "——";
    DebugPanel.show({
      "rightHand.y": inputs.rightHandY,
      "leftHand.y": inputs.leftHandY,
      "→ pitch (Hz)": outputs.pitch !== null ? Math.round(outputs.pitch) : null,
      "→ volume (dB)": outputs.volume,
      "检测到的手": hands.length,
      "audio": audioStarted ? "🔊 已启动" : "未启动",
    });

    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  status.textContent = err.message;
  status.className = "status error";
}
