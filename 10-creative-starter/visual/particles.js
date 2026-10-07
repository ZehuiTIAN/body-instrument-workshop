// visual/particles.js — 音符触发时的粒子爆发
//
// 故意写得很直白：一个数组、每帧更新、死了就删。
// 想让粒子受音高/音量影响？改 burst() 里的参数就行。

const particles = [];

/** 在 (x, y) 喷出一团粒子（坐标是像素） */
export function burst(x, y, color = "#4f7cff") {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1, // 1 → 0，归零就消失
      color,
    });
  }
}

/** 每帧调用：更新并画出所有活着的粒子 */
export function drawParticles(ctx) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05; // 一点点重力
    p.life -= 0.02;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
