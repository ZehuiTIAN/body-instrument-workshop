/* shared/hands.js — 手部关键点：加载模型、检测、画图（ES module）。
 *
 * 这是"每次都一样"的管道代码，所以收在 shared 里；
 * 每个 checkpoint 的 main.js 只保留教学上有趣的部分。
 *
 * 用法：
 *   import { initHands, detectHands, drawHands } from "../shared/hands.js";
 *
 *   const landmarker = await initHands();        // 页面加载时调用一次
 *   const result = detectHands(landmarker, video); // 每一帧调用
 *   drawHands(ctx, result, canvas.width, canvas.height);
 *
 * 镜像约定：video 和 canvas 都用 CSS scaleX(-1) 镜像显示，
 * 所以画图时直接用原始坐标即可，画出来的点和画面里的手是重合的。
 * 但在"逻辑代码"里想要和屏幕方向一致的坐标时，用 screenX = 1 - landmark.x。
 */

import { FilesetResolver, HandLandmarker } from "./vendor/vision_bundle.mjs";

// 用 import.meta.url 算出 vendor 目录的绝对地址，
// 这样无论哪个 checkpoint 的页面引用它，路径都不会错。
const VENDOR_URL = new URL("./vendor/", import.meta.url).href;

// 食指指尖 / 拇指指尖在 21 个关键点里的编号（MediaPipe 约定）
export const INDEX_TIP = 8;
export const THUMB_TIP = 4;
export const WRIST = 0;

/**
 * 加载模型。只在页面启动时调用一次。
 * GPU 失败时自动降级到 CPU（慢一点，但一定能跑）。
 */
export async function initHands(numHands = 2) {
  const wasmFiles = await FilesetResolver.forVisionTasks(VENDOR_URL + "wasm");

  const options = {
    baseOptions: {
      modelAssetPath: VENDOR_URL + "hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: numHands,
  };

  try {
    return await HandLandmarker.createFromOptions(wasmFiles, options);
  } catch (gpuError) {
    console.warn("GPU 推理失败，降级到 CPU：", gpuError);
    options.baseOptions.delegate = "CPU";
    return await HandLandmarker.createFromOptions(wasmFiles, options);
  }
}

let lastVideoTime = -1;

/**
 * 在当前视频帧上跑检测。返回 MediaPipe 原始结果；
 * 如果视频还没有新画面（还没开始 / 帧没变），返回 null，调用方应跳过这一帧。
 *
 * result.landmarks   → [ [ {x,y,z}, ...21个点 ], ... ]  每只手一组
 * result.handedness  → [ [ {categoryName: "Left"|"Right"} ], ... ]
 */
export function detectHands(landmarker, video) {
  if (video.readyState < 2) return null;      // 视频还没准备好
  if (video.currentTime === lastVideoTime) return null; // 没有新帧，不重跑模型
  lastVideoTime = video.currentTime;

  try {
    return landmarker.detectForVideo(video, performance.now());
  } catch (err) {
    // 模型偶尔在个别帧上出错，跳过这一帧而不是让整页崩溃
    console.warn("这一帧检测失败，跳过：", err);
    return null;
  }
}

/** 两只手的颜色：右手青色、左手橙色（在画面上容易区分） */
const HAND_COLORS = { Right: "#4fd8ff", Left: "#ffa14f" };

/**
 * 把关键点和连接线画到 canvas 上，并在手腕旁边标 LEFT / RIGHT。
 * 返回便于调试的摘要：[{ label, landmarks }...]
 */
export function drawHands(ctx, result, width, height) {
  const summary = [];
  if (!result || !result.landmarks) return summary;

  const connections = HandLandmarker.HAND_CONNECTIONS;

  for (let i = 0; i < result.landmarks.length; i++) {
    const landmarks = result.landmarks[i];
    // handedness 是模型从"自拍视角"给出的左右手标签
    const label =
      result.handedness && result.handedness[i]
        ? result.handedness[i][0].categoryName
        : "Unknown";
    const color = HAND_COLORS[label] || "#ffffff";

    // 连接线
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (const { start, end } of connections) {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
      ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
      ctx.stroke();
    }

    // 21 个点
    ctx.fillStyle = color;
    for (const point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 手腕旁边的左右手标签
    const wrist = landmarks[WRIST];
    ctx.font = "bold 16px monospace";
    ctx.fillText(
      label === "Right" ? "RIGHT HAND" : label === "Left" ? "LEFT HAND" : "HAND",
      wrist.x * width + 10,
      wrist.y * height - 10
    );

    summary.push({ label, landmarks });
  }
  return summary;
}
