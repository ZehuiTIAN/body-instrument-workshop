/* shared/debug.js — Debug 面板（普通 script，全局对象 DebugPanel）。
 *
 * 课堂上最重要的一块 UI：让参与者能"看见"数据。
 *
 * 用法：
 *   <div class="debug" id="debug"></div>
 *   <script src="../shared/debug.js"></script>
 *   DebugPanel.show({ "indexFinger.x": 0.52, "note": "G4" });
 *
 * 数值自动保留 3 位小数，null / undefined 显示为 ——
 */

const DebugPanel = {
  element: null,
  _lastShowTime: 0,
  _fps: 0,

  show(data) {
    if (!this.element) {
      this.element = document.querySelector(".debug");
      if (!this.element) return;
    }
    // FPS：show() 每帧被调一次，调用间隔的倒数就是帧率（EMA 平滑显示）
    const now = performance.now();
    if (this._lastShowTime > 0) {
      const instant = 1000 / Math.max(now - this._lastShowTime, 0.01);
      this._fps = 0.1 * instant + 0.9 * this._fps;
    }
    this._lastShowTime = now;

    const lines = [`<span class="label">FPS:</span> ${Math.round(this._fps)}`];
    for (const key of Object.keys(data)) {
      let value = data[key];
      if (value === null || value === undefined || Number.isNaN(value)) {
        value = "——";
      } else if (typeof value === "number") {
        value = value.toFixed(3);
      }
      lines.push(`<span class="label">${key}:</span> ${value}`);
    }
    this.element.innerHTML = lines.join("\n");
  },
};
