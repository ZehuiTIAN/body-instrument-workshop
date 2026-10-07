/* shared/camera.js — 打开摄像头（普通 script，全局函数 startCamera）。
 *
 * 用法：
 *   <video id="webcam" autoplay playsinline muted></video>
 *   <script src="../shared/camera.js"></script>
 *   await startCamera(document.getElementById("webcam"));
 *
 * 失败时会抛出带中文说明的 Error，由调用方显示在页面上。
 */

async function startCamera(video) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "这个浏览器不支持摄像头。\n" +
      "请用 Chrome 或 Edge，并且必须通过 http://localhost 打开（不能直接双击 html 文件）。"
    );
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        // 640x480 足够手部识别用，分辨率越低越快、越省电
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",
      },
      audio: false,
    });
  } catch (err) {
    if (err.name === "NotAllowedError") {
      throw new Error("摄像头权限被拒绝了。\n请点浏览器地址栏左边的锁形图标，允许摄像头，然后刷新页面。");
    }
    if (err.name === "NotFoundError") {
      throw new Error("找不到摄像头。\n请确认电脑有摄像头，并且没有被其他程序占用。");
    }
    if (err.name === "NotReadableError") {
      throw new Error("摄像头被其他程序占用了。\n请关掉 Zoom / 微信 / 其他浏览器标签页后刷新。");
    }
    throw new Error("摄像头打开失败：" + err.message);
  }

  video.srcObject = stream;
  await video.play();

  // 等浏览器真正拿到画面尺寸（有的浏览器 play() 之后还是 0）
  let tries = 0;
  while (video.videoWidth === 0 && tries < 50) {
    await new Promise((r) => setTimeout(r, 100));
    tries++;
  }
  if (video.videoWidth === 0) {
    throw new Error("摄像头打开了但拿不到画面，请刷新重试。");
  }

  return stream;
}
