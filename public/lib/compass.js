window.degree = 0;

window.requestPermission = async function() {
  const state = await DeviceMotionEvent.requestPermission().catch((e) => e);
  if (state !== "granted") return; // 許可を得られなかった場合

  window.addEventListener("devicemotion", () => {
    window.addEventListener("deviceorientation", (e) => {
      e.preventDefault();
      window.degree = e.webkitCompassHeading * -1;
    });
  });
}

window.checkPermission = function() {
  if (!DeviceMotionEvent || typeof DeviceMotionEvent.requestPermission !== "function") {
    window.addEventListener("devicemotion", () => {
      window.addEventListener("deviceorientationabsolute", (e) => {
        e.preventDefault();
        window.degree = e.alpha;
      });
    });
    return true
  }
  return false
}
