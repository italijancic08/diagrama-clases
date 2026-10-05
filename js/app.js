(() => {

  const viewer =
    document.getElementById('viewer');

  const stage =
    document.getElementById('stage');

  const img =
    document.getElementById('diagram');

  const errorMsg =
    document.getElementById('errorMsg');

  const slider =
    document.getElementById('zoomSlider');

  const pct =
    document.getElementById('zoomPct');

  const btnIn =
    document.getElementById('btnIn');

  const btnOut =
    document.getElementById('btnOut');

  const btnFit =
    document.getElementById('btnFit');

  const minimap =
    document.getElementById('minimap');

  const miniImg =
    document.getElementById('miniImg');

  const miniView =
    document.querySelector('.mini-view');


  /* =========================================
     CONFIGURACIÓN
     ========================================= */

  const MIN_REL = 0.5;

  const MAX_REL = 20;

  const STEP = 1.25;

  const MARGIN = 120;

  const FALLBACK_W = 2576;

  const FALLBACK_H = 1243;


  /* =========================================
     VARIABLES
     ========================================= */

  let iw = 0;

  let ih = 0;

  let fitScale = 1;

  let scale = 1;

  let x = 0;

  let y = 0;

  let smoothTimer = null;

  /*
   * Control del renderizado.
   *
   * En lugar de actualizar el SVG en cada
   * movimiento del mouse, esperamos al próximo
   * frame del navegador.
   */

  let renderPending = false;


  /* =========================================
     UTILIDAD
     ========================================= */

  function clamp(v, a, b) {

    return Math.min(
      Math.max(v, a),
      b
    );
  }


  /* =========================================
     CALCULAR FIT
     ========================================= */

  function computeFit() {

    return Math.min(
      viewer.clientWidth / iw,
      viewer.clientHeight / ih
    ) * 0.94;
  }


  /* =========================================
     INICIALIZAR
     ========================================= */

  function init() {

    iw =
      img.naturalWidth > 0
        ? img.naturalWidth
        : FALLBACK_W;


    ih =
      img.naturalHeight > 0
        ? img.naturalHeight
        : FALLBACK_H;


    stage.style.width =
      iw + 'px';


    stage.style.height =
      ih + 'px';


    /*
     * Actualizar imagen del minimapa.
     */

    miniImg.src =
      img.src;


    errorMsg.hidden =
      true;


    minimap.style.display =
      '';


    sizeMinimap();


    /*
     * Ajustar nuevo diagrama
     * automáticamente.
     */

    fitToScreen(false);
  }


  /* =========================================
     TAMAÑO MINIMAPA
     ========================================= */

  function sizeMinimap() {

    if (!iw || !ih) {
      return;
    }


    minimap.style.height =
      (
        minimap.clientWidth *
        ih /
        iw
      ) + 'px';
  }


  /* =========================================
     FIT
     ========================================= */

  function fitToScreen(animate) {

    if (!iw || !ih) {
      return;
    }


    fitScale =
      computeFit();


    scale =
      fitScale;


    x =
      (
        viewer.clientWidth -
        iw * scale
      ) / 2;


    y =
      (
        viewer.clientHeight -
        ih * scale
      ) / 2;


    apply(animate);
  }


  /* =========================================
     SOLICITAR RENDER
     ========================================= */

  function requestRender() {

    if (renderPending) {
      return;
    }


    renderPending = true;


    requestAnimationFrame(() => {

      renderPending = false;

      apply(false);

    });
  }


  /* =========================================
     APLICAR TRANSFORMACIÓN
     ========================================= */

  function apply(animate) {

    if (!iw || !ih) {
      return;
    }


    const vw =
      viewer.clientWidth;

    const vh =
      viewer.clientHeight;


    /*
     * Limitar movimiento horizontal.
     */

    x =
      clamp(
        x,
        MARGIN - iw * scale,
        vw - MARGIN
      );


    /*
     * Limitar movimiento vertical.
     */

    y =
      clamp(
        y,
        MARGIN - ih * scale,
        vh - MARGIN
      );


    /*
     * Animación solamente cuando
     * corresponde.
     */

    if (animate) {

      stage.classList.add(
        'smooth'
      );


      clearTimeout(
        smoothTimer
      );


      smoothTimer =
        setTimeout(() => {

          stage.classList.remove(
            'smooth'
          );

        }, 300);
    }


    /*
     * IMPORTANTE:
     *
     * Mantenemos translate + scale normal.
     *
     * No usamos translate3d.
     * No usamos will-change.
     * No usamos backface-visibility.
     *
     * Esto evita forzar la rasterización
     * permanente del SVG.
     */

stage.style.transform =
  `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${scale})`;


    updateUI();
  }


  /* =========================================
     UI + MINIMAPA
     ========================================= */

  function updateUI() {

    if (!fitScale || !iw || !ih) {
      return;
    }


    /*
     * Zoom.
     */

    const rel =
      scale / fitScale;


    pct.textContent =
      Math.round(rel * 100) + '%';


    /*
     * Slider.
     */

    const t =
      clamp(
        Math.log(rel / MIN_REL) /
        Math.log(MAX_REL / MIN_REL),
        0,
        1
      );


    slider.value =
      t * 1000;


    slider.style.setProperty(
      '--p',
      (t * 100) + '%'
    );


    /*
     * =========================
     * RECUADRO DEL MINIMAPA
     * =========================
     */

    const k =
      minimap.clientWidth / iw;


    if (!k) {
      return;
    }


    /*
     * Posición visible.
     */

    const viewLeft =
      (-x / scale) * k;


    const viewTop =
      (-y / scale) * k;


    /*
     * Tamaño visible.
     */

    const viewWidth =
      (
        viewer.clientWidth /
        scale
      ) * k;


    const viewHeight =
      (
        viewer.clientHeight /
        scale
      ) * k;


    /*
     * Aplicar recuadro.
     */

    miniView.style.left =
      viewLeft + 'px';


    miniView.style.top =
      viewTop + 'px';


    miniView.style.width =
      viewWidth + 'px';


    miniView.style.height =
      viewHeight + 'px';
  }


  /* =========================================
     ZOOM
     ========================================= */

  function zoomAt(
    newScale,
    cx,
    cy,
    animate
  ) {

    newScale =
      clamp(
        newScale,
        fitScale * MIN_REL,
        fitScale * MAX_REL
      );


    const r =
      newScale / scale;


    x =
      cx -
      (cx - x) * r;


    y =
      cy -
      (cy - y) * r;


    scale =
      newScale;


    if (animate) {

      apply(true);

    } else {

      requestRender();

    }
  }


  function centerX() {

    return viewer.clientWidth / 2;
  }


  function centerY() {

    return viewer.clientHeight / 2;
  }


  /* =========================================
     RUEDA
     ========================================= */

  viewer.addEventListener(
    'wheel',
    (e) => {

      e.preventDefault();


      const rect =
        viewer.getBoundingClientRect();


      let delta =
        e.deltaY;


      if (e.deltaMode === 1) {

        delta *= 33;
      }


      const speed =
        e.ctrlKey
          ? 0.01
          : 0.0015;


      zoomAt(
        scale *
        Math.exp(
          -delta * speed
        ),

        e.clientX - rect.left,

        e.clientY - rect.top
      );

    },
    {
      passive: false
    }
  );


  /* =========================================
     POINTER
     ========================================= */

  const pointers =
    new Map();


  let lastDist = 0;


  viewer.addEventListener(
    'pointerdown',
    (e) => {

      if (
        e.target.closest(
          '.zoombar, .minimap'
        )
      ) {
        return;
      }


      viewer.setPointerCapture(
        e.pointerId
      );


      pointers.set(
        e.pointerId,
        {
          x: e.clientX,
          y: e.clientY
        }
      );


      viewer.classList.add(
        'dragging'
      );


      /*
       * Si hay dos dedos,
       * calcular distancia inicial.
       */

      if (pointers.size === 2) {

        const [a, b] =
          [...pointers.values()];


        lastDist =
          Math.hypot(
            a.x - b.x,
            a.y - b.y
          );
      }
    }
  );


  viewer.addEventListener(
    'pointermove',
    (e) => {

      if (
        !pointers.has(
          e.pointerId
        )
      ) {
        return;
      }


      const prev =
        pointers.get(
          e.pointerId
        );


      const cur = {

        x: e.clientX,

        y: e.clientY

      };


      /* =========================
         ARRASTRAR
         ========================= */

      if (pointers.size === 1) {

        x +=
          cur.x - prev.x;


        y +=
          cur.y - prev.y;


        pointers.set(
          e.pointerId,
          cur
        );


        /*
         * En vez de aplicar inmediatamente,
         * esperamos al siguiente frame.
         */

        requestRender();


      }


      /* =========================
         PINCH ZOOM
         ========================= */

      else if (
        pointers.size === 2
      ) {

        pointers.set(
          e.pointerId,
          cur
        );


        const [a, b] =
          [...pointers.values()];


        const dist =
          Math.hypot(
            a.x - b.x,
            a.y - b.y
          );


        const rect =
          viewer.getBoundingClientRect();


        const mx =
          (
            a.x + b.x
          ) / 2 -
          rect.left;


        const my =
          (
            a.y + b.y
          ) / 2 -
          rect.top;


        if (lastDist) {

          zoomAt(
            scale *
            dist /
            lastDist,

            mx,

            my
          );
        }


        lastDist =
          dist;
      }
    }
  );


  /* =========================================
     FINALIZAR POINTER
     ========================================= */

  function endPointer(e) {

    pointers.delete(
      e.pointerId
    );


    if (pointers.size < 2) {

      lastDist = 0;
    }


    if (pointers.size === 0) {

      viewer.classList.remove(
        'dragging'
      );
    }
  }


  viewer.addEventListener(
    'pointerup',
    endPointer
  );


  viewer.addEventListener(
    'pointercancel',
    endPointer
  );


  /* =========================================
     DOBLE CLICK
     ========================================= */

  viewer.addEventListener(
    'dblclick',
    (e) => {

      if (
        e.target.closest(
          '.zoombar, .minimap'
        )
      ) {
        return;
      }


      const rect =
        viewer.getBoundingClientRect();


      zoomAt(
        scale * 1.8,

        e.clientX - rect.left,

        e.clientY - rect.top,

        true
      );
    }
  );


  /* =========================================
     SLIDER
     ========================================= */

  slider.addEventListener(
    'input',
    () => {

      const rel =
        MIN_REL *
        Math.pow(
          MAX_REL / MIN_REL,
          slider.value / 1000
        );


      zoomAt(
        fitScale * rel,

        centerX(),

        centerY()
      );
    }
  );


  /* =========================================
     BOTÓN +
     ========================================= */

  btnIn.addEventListener(
    'click',
    () => {

      zoomAt(
        scale * STEP,

        centerX(),

        centerY(),

        true
      );
    }
  );


  /* =========================================
     BOTÓN -
     ========================================= */

  btnOut.addEventListener(
    'click',
    () => {

      zoomAt(
        scale / STEP,

        centerX(),

        centerY(),

        true
      );
    }
  );


  /* =========================================
     FIT
     ========================================= */

  btnFit.addEventListener(
    'click',
    () => {

      fitToScreen(true);
    }
  );


  /* =========================================
     TECLADO
     ========================================= */

  window.addEventListener(
    'keydown',
    (e) => {

      if (!iw) {
        return;
      }


      if (
        e.key === '+' ||
        e.key === '='
      ) {

        zoomAt(
          scale * STEP,

          centerX(),

          centerY(),

          true
        );


      } else if (
        e.key === '-'
      ) {

        zoomAt(
          scale / STEP,

          centerX(),

          centerY(),

          true
        );


      } else if (
        e.key === '0'
      ) {

        fitToScreen(true);
      }
    }
  );


  /* =========================================
     MINIMAPA
     ========================================= */

  let miniDrag =
    false;


  function miniMove(e) {

    if (!iw || !ih) {
      return;
    }


    const rect =
      minimap.getBoundingClientRect();


    const k =
      iw / rect.width;


    const ix =
      (
        e.clientX -
        rect.left
      ) * k;


    const iy =
      (
        e.clientY -
        rect.top
      ) * k;


    x =
      centerX() -
      ix * scale;


    y =
      centerY() -
      iy * scale;


    requestRender();
  }


  minimap.addEventListener(
    'pointerdown',
    (e) => {

      if (!iw) {
        return;
      }


      miniDrag =
        true;


      minimap.setPointerCapture(
        e.pointerId
      );


      miniMove(e);
    }
  );


  minimap.addEventListener(
    'pointermove',
    (e) => {

      if (miniDrag) {

        miniMove(e);
      }
    }
  );


  minimap.addEventListener(
    'pointerup',
    () => {

      miniDrag =
        false;
    }
  );


  minimap.addEventListener(
    'pointercancel',
    () => {

      miniDrag =
        false;
    }
  );


  /* =========================================
     RESIZE
     ========================================= */

  window.addEventListener(
    'resize',
    () => {

      if (!iw) {
        return;
      }


      const old =
        fitScale;


      fitScale =
        computeFit();


      scale *=
        fitScale / old;


      sizeMinimap();


      apply();
    }
  );


  /* =========================================
     ERROR
     ========================================= */

  img.addEventListener(
    'error',
    () => {

      errorMsg.hidden =
        false;


      minimap.style.display =
        'none';
    }
  );


  /* =========================================
     CAMBIO DE SVG
     ========================================= */

  /*
   * Cada vez que index.html cambia
   * diagram.src, este evento vuelve
   * a inicializar el visor.
   */

  img.addEventListener(
    'load',
    () => {

      init();

    }
  );


  /* =========================================
     INICIO
     ========================================= */

  if (
    img.complete &&
    img.naturalWidth > 0
  ) {

    init();
  }

})();