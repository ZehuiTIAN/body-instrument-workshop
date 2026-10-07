// 05 · Musical Scale
//
// 上一课：手的高度 → 连续频率（像滑哨，什么音都有）。
// 这一课：手的高度 → 音阶里的一个音符（像琴键，只有"对"的音）。
//
// 五声音阶（pentatonic）怎么弹都和谐，是身体乐器的好起点。

import { initHands, detectHands, drawHands, INDEX_TIP } from "../shared/hands.js";

// ★★★ 这就是音阶！改这个数组，就改了整件乐器 ★★★
// 可以叫 Coding Agent 帮你换成别的：
//   大调:     ["C4","D4","E4","F4","G4","A4","B4","C5"]
//   小调:     ["A3","B3","C4","D4","E4","F4","G4","A4"]
//   布鲁斯:   ["A3","C4","D4","D#4","E4","G4","A4"]
const scale = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"];

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const noteValue = document.getElementById("noteValue");
const startButton = document.getElementById("startButton");

// ---- 声音 ----
// Tone.Synth 是带音量包络的合成器：triggerAttackRelease 触发一个音，
// 音更换时自动断开旧的、弹新的（像换人按键）。
const synth = new Tone.Synth({
  oscillator: { type: "triangle" },
  envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.3 },
});
const volume = new Tone.Volume(-Infinity); // 没检测到手时静音
synth.connect(volume);
volume.toDestination();
Tone.Destination.volume.value = -12;

let audioStarted = false;
startButton.addEventListener("click", async () => {
  await Tone.start();
  audioStarted = true;
  startButton.disabled = true;
  startButton.textContent = "🔊 声音已启动";
});

let currentNote = null; // 记住当前音，只有换了音才重新触发

try {
  await startCamera(video);
  status.textContent = "正在加载手部模型…";
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const landmarker = await initHands(2);
  status.textContent = "上下移动手，一次一个音 🎹";
  status.className = "status ok";

  function loop() {
    const result = detectHands(landmarker, video);
    if (!result) return requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hands = drawHands(ctx, result, canvas.width, canvas.height);

    if (hands.length > 0) {
      const tip = hands[0].landmarks[INDEX_TIP];
      const handY = Math.min(Math.max(tip.y, 0), 1); // 夹到 0~1，防止手出画面时越界

      // ★ 映射：连续的 Y → 音阶数组里的下标（0 ~ scale.length-1）
      // 手在最上面 → 最后一个音（最高），最下面 → 第一个音（最低）
      const index = Math.floor((1 - handY) * scale.length);
      const safeIndex = Math.min(index, scale.length - 1);
      const note = scale[safeIndex];

      // 只有音符变化时才弹新音（否则每帧触发 60 次会炸）
      if (audioStarted && note !== currentNote) {
        synth.triggerAttackRelease(note, "8n");
        currentNote = note;
      }
      volume.volume.rampTo(-6, 0.1);

      // 画面：把音阶画成横条，当前音高亮——身体就是键盘
      const rowHeight = canvas.height / scale.length;
      for (let i = 0; i < scale.length; i++) {
        const rowTop = canvas.height - (i + 1) * rowHeight; // 低音在下
        ctx.fillStyle = i === safeIndex ? "#4f7cff" : "rgba(255,255,255,0.07)";
        ctx.fillRect(0, rowTop, canvas.width, rowHeight - 2);
        ctx.fillStyle = i === safeIndex ? "#fff" : "#666";
        ctx.font = "14px monospace";
        ctx.fillText(scale[i], 8, rowTop + rowHeight / 2 + 5);
      }

      noteValue.textContent = note;
      DebugPanel.show({
        "indexFinger.y": handY,
        "scale index": safeIndex,
        "note": note,
        "音阶数组长度": scale.length,
      });
    } else {
      volume.volume.rampTo(-Infinity, 0.2);
      currentNote = null; // 手再回来时，允许重新触发同一个音
      noteValue.textContent = "——";
      DebugPanel.show({ "提示": "没有检测到手（已静音）" });
    }

    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  status.textContent = err.message;
  status.className = "status error";
}
