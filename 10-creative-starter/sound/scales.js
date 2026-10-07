// sound/scales.js — 音阶工具
//
// 现成的音阶，直接拿去替换 config.js 里的 scale：
//   import { scales } from "./sound/scales.js";
//   config.scale = scales.minor;

export const scales = {
  pentatonic: ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"],
  major: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
  minor: ["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4"],
  blues: ["A3", "C4", "D4", "D#4", "E4", "G4", "A4", "C5"],
  japanese: ["C4", "D4", "F4", "G4", "A4", "C5", "D5", "F5"], // 都节调式
};

/** 把 0~1 的 Y 坐标（0=顶）量化成音阶里的一个音符名 */
export function yToNote(y, scale) {
  const clamped = Math.min(Math.max(y, 0), 1);
  const index = Math.min(Math.floor((1 - clamped) * scale.length), scale.length - 1);
  return scale[index];
}
