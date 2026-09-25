(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  gsap.registerPlugin(ScrollTrigger);

  $$('.js-year').forEach(e => (e.textContent = new Date().getFullYear()));
  $('.js-wa').href = RTG.waHref();
  RTG.mountVideo($('.js-video'), $('.video__play'));
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault(); scrollTo({ top: t.getBoundingClientRect().top + scrollY, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* =========================================================
     PARTÍCULAS (three.js)
     ========================================================= */
  const N = innerWidth < 800 ? 3200 : 6500;
  let gl = null;
  try {
    const canvas = $('.gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 16;

    const pos = new Float32Array(N * 3), target = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    const rand = new Float32Array(N), ease = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = 18 + Math.random() * 10, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pos[i * 3 + 2] = r * Math.cos(ph) - 10;
      rand[i] = Math.random(); ease[i] = 0.035 + Math.random() * 0.05;
    }
    target.set(pos);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: 3.1 * Math.min(devicePixelRatio, 2) }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aRand; uniform float uSize; uniform float uTime; varying float vR;
        void main(){
          vR = aRand;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float tw = 0.75 + 0.25 * sin(uTime * 3.0 + aRand * 40.0);
          gl_PointSize = uSize * (0.55 + aRand * 1.1) * tw * (16.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vR;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          vec3 green = vec3(0.133, 0.725, 0.604);
          vec3 mint = vec3(0.36, 1.0, 0.81);
          vec3 c = mix(green, mint, vR);
          c = mix(c, vec3(1.0), step(0.93, vR));
          gl_FragColor = vec4(c, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let visW = 1, visH = 1;
    const resize = () => {
      renderer.setSize(innerWidth, innerHeight, false);
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360); visW = visH * camera.aspect;
    };
    resize();

    /* --- convertir un texto en una nube de puntos --- */
    const CW = 1200, CH = 600, cache = {};
    const sample = str => {
      if (cache[str]) return cache[str];
      const c = document.createElement('canvas'); c.width = CW; c.height = CH;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.strokeStyle = '#fff';
      if (str === '▶') {
        x.beginPath(); x.moveTo(500, 150); x.lineTo(500, 450); x.lineTo(760, 300); x.closePath(); x.fill();
        x.lineWidth = 22; x.beginPath(); x.arc(610, 300, 250, 0, Math.PI * 2); x.stroke();
      } else {
        let fs = 440; x.textAlign = 'center'; x.textBaseline = 'middle';
        const setF = () => (x.font = `900 ${fs}px Unbounded, sans-serif`);
        setF(); while (x.measureText(str).width > CW * 0.94) { fs -= 10; setF(); }
        x.fillText(str, CW / 2, CH / 2 + fs * 0.05);
      }
      const d = x.getImageData(0, 0, CW, CH).data, pts = [];
      for (let y = 0; y < CH; y += 3) for (let xx = 0; xx < CW; xx += 3) if (d[(y * CW + xx) * 4 + 3] > 140) pts.push(xx, y);
      return (cache[str] = pts);
    };

    let current = '', currentLift = 0;
    const setShape = (str, align = 0, burst = true, lift = 0) => {
      const pts = sample(str), count = pts.length / 2;
      const span = align ? visW * 0.42 : lift ? visW * 0.7 : visW * 0.86;
      const oy = lift * visH;
      const worldW = Math.min(span, visH * (lift ? 0.55 : 0.8) * 2);
      const s = worldW / CW, ox = align * visW * 0.23;
      for (let i = 0; i < N; i++) {
        const k = ((i * 7919) % count) * 2; // reparto estable entre los puntos de la forma
        target[i * 3] = (pts[k] - CW / 2) * s + ox + (Math.random() - 0.5) * s * 3;
        target[i * 3 + 1] = -(pts[k + 1] - CH / 2) * s + oy + (Math.random() - 0.5) * s * 3;
        target[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
        if (burst && !reduce) {
          vel[i * 3] += (Math.random() - 0.5) * 0.9; vel[i * 3 + 1] += (Math.random() - 0.5) * 0.9; vel[i * 3 + 2] += Math.random() * 0.9;
        }
      }
      current = str; currentLift = lift;
      $('.js-shape').textContent = str;
    };

    /* --- ratón en coordenadas del mundo --- */
    const mouse = { x: 999, y: 999, nx: 0, ny: 0 };
    addEventListener('pointermove', e => {
      mouse.nx = (e.clientX / innerWidth) * 2 - 1; mouse.ny = -(e.clientY / innerHeight) * 2 + 1;
      mouse.x = (mouse.nx * visW) / 2; mouse.y = (mouse.ny * visH) / 2;
    });
    addEventListener('pointerleave', () => { mouse.x = 999; mouse.y = 999; });

    const R = 2.4, R2 = R * R;
    const loop = t => {
      mat.uniforms.uTime.value = t;
      const p = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const j = i * 3;
        vel[j] *= 0.9; vel[j + 1] *= 0.9; vel[j + 2] *= 0.9;
        let px = p[j] + (target[j] - p[j]) * ease[i] + vel[j];
        let py = p[j + 1] + (target[j + 1] - p[j + 1]) * ease[i] + vel[j + 1];
        const pz = p[j + 2] + (target[j + 2] - p[j + 2]) * ease[i] + vel[j + 2];
        const dx = px - mouse.x, dy = py - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) { const d = Math.sqrt(d2) || 0.001, f = (1 - d / R) * 0.55; px += (dx / d) * f; py += (dy / d) * f; }
        p[j] = px + Math.sin(t * 1.3 + rand[i] * 20) * 0.004;
        p[j + 1] = py + Math.cos(t * 1.1 + rand[i] * 20) * 0.004;
        p[j + 2] = pz;
      }
      geo.attributes.position.needsUpdate = true;
      points.rotation.y += ((touch ? 0 : mouse.nx * 0.18) + Math.sin(t * 0.25) * 0.06 - points.rotation.y) * 0.05;
      points.rotation.x += ((touch ? 0 : -mouse.ny * 0.12) - points.rotation.x) * 0.05;
      renderer.render(scene, camera);
    };
    gsap.ticker.add(loop);
    addEventListener('resize', () => { resize(); const a = gl.align; setShape(current, a, false, currentLift); });

    gl = { setShape, align: 0, burst: () => { for (let i = 0; i < N * 3; i++) vel[i] += (Math.random() - 0.5) * 1.6; } };
  } catch (err) {
    document.body.classList.add('no-gl');
  }

  /* =========================================================
     TERMINAL DE ENTRADA
     ========================================================= */
  const fontsReady = (document.fonts ? document.fonts.load('900 100px Unbounded') : Promise.resolve()).catch(() => {});
  const out = $('.term__out');
  const LINES = [
    ['> cargando guion_antiguo.txt', ''],
    ['> autor: otra persona', 'dim'],
    ['> papel asignado: secundario', 'dim'],
    ['> ERROR: el protagonista no está de acuerdo', 'err'],
    ['> iniciando Reescribe_tu_Guion…', ''],
    ['> [marketing]   ██████████ ok', ''],
    ['> [conciencia]  ██████████ ok', ''],
    ['> [mentalidad]  ██████████ ok', ''],
    ['> nuevo autor: TÚ', '']
  ];
  const start = () => {
    document.body.classList.remove('is-loading');
    fontsReady.then(() => gl && gl.setShape('M.V.P', 0, true, 0.2));
    gsap.from('#s-mvp > *', { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: 'expo.out', delay: 0.3 });
    gsap.from('.hud, .dots', { opacity: 0, duration: 1, delay: 0.6 });
    ScrollTrigger.refresh();
  };
  if (reduce) { $('.term').remove(); start(); }
  else {
    const tl = gsap.timeline({ onComplete: () => { $('.term').remove(); start(); } });
    LINES.forEach(([txt, cls]) => {
      const o = { n: 0 };
      let span;
      tl.call(() => { span = document.createElement('span'); if (cls) span.className = cls; out.appendChild(span); out.appendChild(document.createTextNode('\n')); })
        .to(o, { n: txt.length, duration: txt.length * 0.014, ease: 'none', onUpdate: () => (span.textContent = txt.slice(0, Math.round(o.n))) })
        .to({}, { duration: cls === 'err' ? 0.45 : 0.08 });
    });
    tl.call(() => $('.term').classList.add('is-glitch'))
      .to('.term', { opacity: 0, duration: 0.35, delay: 0.6 });
  }

  /* =========================================================
     SCROLL: cada sección cambia la forma
     ========================================================= */
  const secs = $$('.sec'), dots = $$('.dots a');
  secs.forEach((s, i) => {
    const align = s.classList.contains('sec--center') ? 0 : s.classList.contains('sec--right') ? -1 : 1;
    ScrollTrigger.create({
      trigger: s, start: 'top 55%', end: 'bottom 55%',
      onToggle: st => {
        if (!st.isActive) return;
        dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
        const a = innerWidth < 820 ? 0 : align;
        if (gl && !document.body.classList.contains('is-loading')) { gl.align = a; gl.setShape(s.dataset.shape, a, true, s.id === 's-mvp' ? 0.2 : 0); }
        const g = $('.glitch', s);
        if (g && !reduce) { g.classList.add('is-on'); setTimeout(() => g.classList.remove('is-on'), 600); }
      }
    });
    if (!reduce && !s.classList.contains('sec--center')) {
      gsap.from($('.panel', s), { x: align * 120, opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 70%' } });
    }
  });
  if (!reduce) gsap.from('#s-test .panel', { y: 80, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '#s-test', start: 'top 70%' } });

  /* ---------- test: las partículas cuentan las preguntas y te escriben a ti ---------- */
  RTG.mountQuiz($('[data-quiz]'), {
    onStep: (step, total) => { if (gl && step > 0) gl.setShape(`${step + 1}/${total}`, 0); },
    onResult: () => { if (gl) { gl.setShape('TÚ', 0); gl.burst(); } }
  });
})();
