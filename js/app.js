(() => {
  const viewer = document.getElementById('viewer');
  const stage = document.getElementById('stage');
  const img = document.getElementById('diagram');
  const errorMsg = document.getElementById('errorMsg');
  const slider = document.getElementById('zoomSlider');
  const pct = document.getElementById('zoomPct');
  const btnIn = document.getElementById('btnIn');
  const btnOut = document.getElementById('btnOut');
  const btnFit = document.getElementById('btnFit');
  const minimap = document.getElementById('minimap');
  const miniImg = document.getElementById('miniImg');
  const miniView = document.getElementById('miniView');

  // Zoom relativo al "ajustar a pantalla" (100% = diagrama completo visible)
  const MIN_REL = 0.5;   // 50%
  const MAX_REL = 20;    // 2000% (el SVG se ve nítido a cualquier zoom)
  const STEP = 1.25;     // paso de los botones +/-
  const MARGIN = 120;    // px del diagrama que siempre quedan visibles

  // Tamaño de respaldo por si el SVG no declara width/height
  // (draw.io sí los declara, así que normalmente no se usa)
  const FALLBACK_W = 2576;
  const FALLBACK_H = 1243;

  let iw = 0, ih = 0;
  let fitScale = 1, scale = 1, x = 0, y = 0;
  let smoothTimer = null;

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  function computeFit() {
    return Math.min(viewer.clientWidth / iw, viewer.clientHeight / ih) * 0.94;
  }

  function init() {
    iw = img.naturalWidth > 0 ? img.naturalWidth : FALLBACK_W;
    ih = img.naturalHeight > 0 ? img.naturalHeight : FALLBACK_H;
    stage.style.width = iw + 'px';
    stage.style.height = ih + 'px';
    miniImg.src = img.src;
    sizeMinimap();
    fitToScreen(false);
  }

  function sizeMinimap() {
    minimap.style.height = (minimap.clientWidth * ih / iw) + 'px';
  }

  function fitToScreen(animate) {
    fitScale = computeFit();
    scale = fitScale;
    x = (viewer.clientWidth - iw * scale) / 2;
    y = (viewer.clientHeight - ih * scale) / 2;
    apply(animate);
  }

  function apply(animate) {
    const vw = viewer.clientWidth;
    const vh = viewer.clientHeight;
    x = clamp(x, MARGIN - iw * scale, vw - MARGIN);
    y = clamp(y, MARGIN - ih * scale, vh - MARGIN);

    if (animate) {
      stage.classList.add('smooth');
      clearTimeout(smoothTimer);
      smoothTimer = setTimeout(() => stage.classList.remove('smooth'), 300);
    }

    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    viewer.style.backgroundPosition = `${x}px ${y}px`;
    updateUI();
  }

  function updateUI() {
    const rel = scale / fitScale;
    pct.textContent = Math.round(rel * 100) + '%';

    const t = clamp(Math.log(rel / MIN_REL) / Math.log(MAX_REL / MIN_REL), 0, 1);
    slider.value = t * 1000;
    slider.style.setProperty('--p', (t * 100) + '%');

    // Rectángulo del minimapa
    const k = minimap.clientWidth / iw;
    miniView.style.left = (-x / scale) * k + 'px';
    miniView.style.top = (-y / scale) * k + 'px';
    miniView.style.width = (viewer.clientWidth / scale) * k + 'px';
    miniView.style.height = (viewer.clientHeight / scale) * k + 'px';
  }

  function zoomAt(newScale, cx, cy, animate) {
    newScale = clamp(newScale, fitScale * MIN_REL, fitScale * MAX_REL);
    const r = newScale / scale;
    x = cx - (cx - x) * r;
    y = cy - (cy - y) * r;
    scale = newScale;
    apply(animate);
  }

  const centerX = () => viewer.clientWidth / 2;
  const centerY = () => viewer.clientHeight / 2;

  /* ---------- Rueda del mouse ---------- */
  viewer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = viewer.getBoundingClientRect();
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 33; // Firefox
    const speed = e.ctrlKey ? 0.01 : 0.0015;
    zoomAt(scale * Math.exp(-delta * speed), e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });

  /* ---------- Arrastrar y pellizcar (mouse + táctil) ---------- */
  const pointers = new Map();
  let lastDist = 0;

  viewer.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.zoombar, .minimap')) return;
    viewer.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewer.classList.add('dragging');
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      lastDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });

  viewer.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const cur = { x: e.clientX, y: e.clientY };

    if (pointers.size === 1) {
      x += cur.x - prev.x;
      y += cur.y - prev.y;
      pointers.set(e.pointerId, cur);
      apply();
    } else if (pointers.size === 2) {
      pointers.set(e.pointerId, cur);
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = viewer.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - rect.left;
      const my = (a.y + b.y) / 2 - rect.top;
      if (lastDist) zoomAt(scale * dist / lastDist, mx, my);
      lastDist = dist;
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastDist = 0;
    if (pointers.size === 0) viewer.classList.remove('dragging');
  }
  viewer.addEventListener('pointerup', endPointer);
  viewer.addEventListener('pointercancel', endPointer);

  /* ---------- Doble clic para acercar ---------- */
  viewer.addEventListener('dblclick', (e) => {
    if (e.target.closest('.zoombar, .minimap')) return;
    const rect = viewer.getBoundingClientRect();
    zoomAt(scale * 1.8, e.clientX - rect.left, e.clientY - rect.top, true);
  });

  /* ---------- Barra de zoom ---------- */
  slider.addEventListener('input', () => {
    const rel = MIN_REL * Math.pow(MAX_REL / MIN_REL, slider.value / 1000);
    zoomAt(fitScale * rel, centerX(), centerY());
  });

  btnIn.addEventListener('click', () => zoomAt(scale * STEP, centerX(), centerY(), true));
  btnOut.addEventListener('click', () => zoomAt(scale / STEP, centerX(), centerY(), true));
  btnFit.addEventListener('click', () => fitToScreen(true));

  /* ---------- Teclado ---------- */
  window.addEventListener('keydown', (e) => {
    if (!iw) return;
    if (e.key === '+' || e.key === '=') zoomAt(scale * STEP, centerX(), centerY(), true);
    else if (e.key === '-') zoomAt(scale / STEP, centerX(), centerY(), true);
    else if (e.key === '0') fitToScreen(true);
  });

  /* ---------- Minimapa (clic y arrastre) ---------- */
  let miniDrag = false;

  function miniMove(e) {
    const r = minimap.getBoundingClientRect();
    const k = iw / r.width;
    const ix = (e.clientX - r.left) * k;
    const iy = (e.clientY - r.top) * k;
    x = centerX() - ix * scale;
    y = centerY() - iy * scale;
    apply();
  }

  minimap.addEventListener('pointerdown', (e) => {
    if (!iw) return;
    miniDrag = true;
    minimap.setPointerCapture(e.pointerId);
    miniMove(e);
  });
  minimap.addEventListener('pointermove', (e) => { if (miniDrag) miniMove(e); });
  minimap.addEventListener('pointerup', () => { miniDrag = false; });
  minimap.addEventListener('pointercancel', () => { miniDrag = false; });

  /* ---------- Redimensionar ventana ---------- */
  window.addEventListener('resize', () => {
    if (!iw) return;
    const old = fitScale;
    fitScale = computeFit();
    scale *= fitScale / old;
    sizeMinimap();
    apply();
  });

  /* ---------- Arranque ---------- */
  img.addEventListener('error', () => {
    errorMsg.hidden = false;
    minimap.style.display = 'none';
  });

  if (img.complete && img.naturalWidth > 0) init();
  else img.addEventListener('load', init);
})();