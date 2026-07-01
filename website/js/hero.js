/* ============================================================
   Hero — lightweight Three.js 3D scene (particle field + wire orb)
   Performance-first: capped DPR, paused when off-screen/hidden,
   disabled for prefers-reduced-motion or missing WebGL.
   Dependency: three.js (loaded via CDN in index.html)
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("hero-canvas");
  if (!canvas || reduce || typeof THREE === "undefined") return;

  var scene, camera, renderer, particles, orb, raf = null, running = true;
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0c12, 0.045);

    camera = new THREE.PerspectiveCamera(62, aspect(), 0.1, 100);
    camera.position.set(0, 0, 16);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    resize();

    // --- Particle field (gradient indigo -> blue -> green) ---
    var COUNT = window.innerWidth < 720 ? 900 : 1800;
    var pos = new Float32Array(COUNT * 3);
    var col = new Float32Array(COUNT * 3);
    var palette = [new THREE.Color(0x6c4ae0), new THREE.Color(0x3a8fe0), new THREE.Color(0x3ddc84)];
    for (var i = 0; i < COUNT; i++) {
      var r = 6 + Math.random() * 16;
      var t = Math.acos(2 * Math.random() - 1);
      var p = Math.random() * Math.PI * 2;
      pos[i * 3] = r * Math.sin(t) * Math.cos(p);
      pos[i * 3 + 1] = r * Math.sin(t) * Math.sin(p) * 0.6;
      pos[i * 3 + 2] = r * Math.cos(t);
      var c = palette[i % 3];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.09, vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // --- Wireframe orb ---
    var oGeo = new THREE.IcosahedronGeometry(5.2, 1);
    var oMat = new THREE.MeshBasicMaterial({ color: 0x6c4ae0, wireframe: true, transparent: true, opacity: 0.18 });
    orb = new THREE.Mesh(oGeo, oMat);
    scene.add(orb);

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    observeHero();
    animate();
  }

  function aspect() {
    var h = canvas.clientHeight || window.innerHeight;
    return (canvas.clientWidth || window.innerWidth) / h;
  }
  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function onMove(e) {
    pointer.tx = (e.clientX / window.innerWidth - 0.5);
    pointer.ty = (e.clientY / window.innerHeight - 0.5);
  }
  function onVis() { running = !document.hidden; if (running && !raf) animate(); }

  // Pause rAF when hero scrolled out of view
  function observeHero() {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (en) {
      running = en[0].isIntersecting && !document.hidden;
      if (running && !raf) animate();
    }, { threshold: 0.02 });
    io.observe(canvas);
  }

  var clock = 0;
  function animate() {
    if (!running) { raf = null; return; }
    raf = requestAnimationFrame(animate);
    clock += 0.005;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    particles.rotation.y = clock * 0.6;
    particles.rotation.x = Math.sin(clock * 0.3) * 0.15;
    orb.rotation.y = -clock * 0.4;
    orb.rotation.x = clock * 0.2;

    camera.position.x += (pointer.x * 4 - camera.position.x) * 0.05;
    camera.position.y += (-pointer.y * 3 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
