// 02 · Hand Landmarks
//
// 核心概念：AI 模型输出的是【一组坐标】，不是"手"这个概念。
// 每只手 = 21 个点，每个点 = { x, y, z }，x 和 y 都是 0~1 之间的数
// （0 = 画面左/上边缘，1 = 画面右/下边缘）。

import { initHands, detectHands, drawHands } from "../shared/hands.js";

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const handCount = document.getElementById("handCount");

// --- 启动：先开摄像头，再加载模型 ---
try {
  await startCamera(video);
  status.textContent = "正在加载手部模型（第一次会花几秒钟）…";

  // 让画布和摄像头画面一样大
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const landmarker = await initHands(2); // 最多同时识别 2 只手
  status.textContent = "模型就绪，把手放进画面 ✋";
  status.className = "status ok";

  // --- 主循环：每一帧 → 检测 → 画出来 ---
  function loop() {
    const result = detectHands(landmarker, video);

    if (result) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const hands = drawHands(ctx, result, canvas.width, canvas.height);

      handCount.textContent = hands.length;

      // Debug 面板：让大家盯着第一只手的 0 号点（手腕）的坐标看
      const first = hands[0];
      DebugPanel.show({
        "检测到的手": hands.length,
        "手腕 wrist.x": first ? first.landmarks[0].x : null,
        "手腕 wrist.y": first ? first.landmarks[0].y : null,
        "左右手标签": first ? first.label : null,
      });
    }

    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  status.textContent = err.message;
  status.className = "status error";
}
