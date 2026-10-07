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

  show(data) {
    if (!this.element) {
      this.element = document.querySelector(".debug");
      if (!this.element) return;
    }
    const lines = [];
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
