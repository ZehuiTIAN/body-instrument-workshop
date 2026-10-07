// input/gestures.js — 手势 = 关键点之间的距离
//
// 不需要额外的 AI 模型，几何题就够了。

/** 两个 landmark 之间的距离（坐标是 0~1 的，所以距离也是） */
export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 拇指尖和食指尖是否在捏合（无迟滞的裸判断，教学用；实际项目请用 createPinchDetector） */
export function isPinch(landmarks, thumbTip, indexTip, threshold) {
  return distance(landmarks[thumbTip], landmarks[indexTip]) < threshold;
}

/**
 * 带迟滞（hysteresis）和最短保持的捏合检测器。
 * 裸判断 distance < threshold 在阈值附近会疯狂抖动（0.069/0.071 来回跳），
 * 导致声音"哒哒哒"。这个检测器：
 *   距离 < onThreshold  → 捏上
 *   距离 > offThreshold 且已保持 minHoldMs → 松开
 *   中间地带 → 保持原来的状态
 */
export function createPinchDetector(config) {
  let pinching = false;
  let startTime = 0;

  return {
    /** 每帧调用，返回稳定的 true/false */
    update(distance) {
      const now = performance.now();
      if (!pinching && distance < config.pinchOnThreshold) {
        pinching = true;
        startTime = now;
      } else if (pinching && distance > config.pinchOffThreshold && now - startTime > config.pinchMinHoldMs) {
        pinching = false;
      }
      return pinching;
    },
    /** 手消失时重置 */
    reset() {
      pinching = false;
    },
  };
}

/** 两只手食指尖之间的距离 */
export function twoHandDistance(rightLandmarks, leftLandmarks, indexTip) {
  return distance(rightLandmarks[indexTip], leftLandmarks[indexTip]);
}
