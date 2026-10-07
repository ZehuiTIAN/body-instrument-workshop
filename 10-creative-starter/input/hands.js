// input/hands.js — 从摄像头到"身体数据"
//
// 职责：初始化模型、每帧检测、把检测结果整理成干净的 inputs 对象。
// main.js 不需要知道 MediaPipe 的任何细节。

import { initHands, detectHands, INDEX_TIP, THUMB_TIP } from "../../shared/hands.js";
import { distance, createPinchDetector } from "./gestures.js";

let landmarker = null;
let smoothedRightY = null;
let smoothedLeftY = null;
let pinchDetector = null;

export async function initInput(numHands = 2, config) {
  landmarker = await initHands(numHands);
  pinchDetector = createPinchDetector(config);
}

function smooth(previous, raw, alpha, enabled) {
  if (!enabled) return raw;
  if (previous === null) return raw;
  return alpha * raw + (1 - alpha) * previous;
}

/**
 * 每一帧调用。返回 null（视频没新帧）或一个 inputs 对象：
 * {
 *   rightHand: { x, y, pinch } | null,   // x/y 已做镜像修正，0~1
 *   leftHand:  { x, y } | null,
 *   handDistance: number | null,
 * }
 */
export function readInputs(video, config) {
  const result = detectHands(landmarker, video);
  if (!result) return null;

  const hands = [];
  for (let i = 0; i < (result.landmarks || []).length; i++) {
    const label = result.handedness?.[i]?.[0]?.categoryName || "Unknown";
    hands.push({ label, landmarks: result.landmarks[i] });
  }

  // 找左右手：优先模型标签，缺失时按屏幕位置兜底
  let right = hands.find((h) => h.label === "Right");
  let left = hands.find((h) => h.label === "Left");
  if (hands.length === 2 && (!right || !left)) {
    const byScreenX = [...hands].sort(
      (a, b) => (1 - b.landmarks[INDEX_TIP].x) - (1 - a.landmarks[INDEX_TIP].x)
    );
    right = right || byScreenX[0];
    left = left || byScreenX[1];
  }

  const { alpha, enabled } = config.smoothing;

  const inputs = { rightHand: null, leftHand: null, handDistance: null, _raw: result };

  if (right) {
    const tip = right.landmarks[INDEX_TIP];
    smoothedRightY = smooth(smoothedRightY, tip.y, alpha, enabled);
    inputs.rightHand = {
      x: 1 - tip.x,
      y: smoothedRightY,
      pinch: pinchDetector.update(distance(right.landmarks[THUMB_TIP], right.landmarks[INDEX_TIP])),
    };
  } else {
    smoothedRightY = null;
    pinchDetector.reset(); // 手消失：重置捏合状态，防止下次手回来时卡在"捏住"
  }

  if (left) {
    const tip = left.landmarks[INDEX_TIP];
    smoothedLeftY = smooth(smoothedLeftY, tip.y, alpha, enabled);
    inputs.leftHand = { x: 1 - tip.x, y: smoothedLeftY };
  } else {
    smoothedLeftY = null;
  }

  if (right && left) {
    inputs.handDistance = distance(right.landmarks[INDEX_TIP], left.landmarks[INDEX_TIP]);
  }

  return inputs;
}
