// 10 · Creative Starter — config.js
//
// ★★★ 这是整件乐器的"控制面板" ★★★
// 所有适合修改的参数都集中在这里。改完刷新页面就生效。
// 不知道改什么？把这个文件发给 Coding Agent，说"我想要……"。

export const config = {
  // ---- 音阶 ----
  // 直接改数组，或在 sound/scales.js 里有更多现成的（大调/小调/布鲁斯）
  scale: ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"],

  // ---- 手势（迟滞双阈值 + 最短保持，防止抖动导致 note on/off 连发）----
  pinchOnThreshold: 0.06,  // 距离小于它 → 捏上
  pinchOffThreshold: 0.09, // 距离大于它 → 才松开（两者之间保持原状态）
  pinchMinHoldMs: 150,     // 捏上后至少保持 150ms

  // ---- 平滑 ----
  smoothing: {
    enabled: true,
    alpha: 0.2, // 0.05 = 很稳很慢，0.5 = 较快，1 = 关闭平滑
  },

  // ---- 声音 ----
  oscillatorType: "sawtooth", // sine / triangle / square / sawtooth
  masterVolumeDb: -12,        // 总音量（dB）。现场请保持保守！

  // ---- 效果量 ----
  effectAmounts: {
    filterMinHz: 200,
    filterMaxHz: 6000,
    reverbMaxWet: 0.8,  // 混响最多加到 80%
    reverbDecay: 4,     // 混响的"房间大小"（秒）
  },

  // ---- 视觉 ----
  particlesOnNoteOn: true, // 每次触发音符时喷粒子
};

// ---------------------------------------------------------------
// 映射逻辑本身在 main.js 底部的 mapping() 函数里。
// 想换映射（比如"两手距离控制音量"），直接对 Agent 说，它会改那个函数。
// ---------------------------------------------------------------
