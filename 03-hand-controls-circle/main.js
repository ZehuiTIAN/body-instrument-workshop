// 03 · Hand Controls Circle
//
// 核心概念：physical movement → numeric data → interface
// 食指指尖（8 号点）的坐标，直接决定屏幕上圆的位置。

import { initHands, detectHands, drawHands, INDEX_TIP } from "../shared/hands.js";

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");
const xValue = document.getElementById("xValue");
const yValue = document.getElementById("yValue");

try {
  await startCamera(video);
  status.textContent = "正在加载手部模型…";

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const landmarker = await initHands(2);
  status.textContent = "伸出食指，移动它 👆";
  status.className = "status ok";

  function loop() {
    const result = detectHands(landmarker, video);
    if (!result) return requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hands = drawHands(ctx, result, canvas.width, canvas.height);

    if (hands.length > 0) {
      // 第一只手的食指指尖
      const tip = hands[0].landmarks[INDEX_TIP];

      // 注意镜像：画面是镜像显示的，
      // 所以用 1 - x，圆的移动方向才和你看到的自己的手一致。
      const screenX = 1 - tip.x; // 0 = 屏幕左边，1 = 屏幕右边
      const screenY = tip.y;     // 0 = 屏幕上面，1 = 屏幕下面

      // 画圆：把 0~1 的坐标乘上画布宽高，就得到像素位置
      ctx.fillStyle = "#4f7cff";
      ctx.beginPath();
      ctx.arc(screenX * canvas.width, screenY * canvas.height, 30, 0, Math.PI * 2);
      ctx.fill();

      xValue.textContent = screenX.toFixed(3);
      yValue.textContent = screenY.toFixed(3);

      DebugPanel.show({
        "indexFinger.x (屏幕)": screenX,
        "indexFinger.y (屏幕)": screenY,
        "原始 landmark.x": tip.x,
        "原始 landmark.y": tip.y,
      });
    } else {
      xValue.textContent = "——";
      yValue.textContent = "——";
      DebugPanel.show({ "提示": "没有检测到手" });
    }

    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  status.textContent = err.message;
  status.className = "status error";
}
