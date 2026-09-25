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

  /* ---------- texto que se descifra ---------- */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const scramble = el => {
    if (reduce) return;
    const final = el.dataset.text || el.textContent;
    const o = { p: 0 };
    gsap.to(o, {
      p: 1, duration: 0.9, ease: 'power2.out', overwrite: true,
      onUpdate: () => { const n = Math.floor(final.length * o.p); let s = final.slice(0, n); for (let i = n; i < final.length; i++) s += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]; el.textContent = s; },
      onComplete: () => (el.textContent = final)
    });
  };

  /* =========================================================
     MIRA (cursor)
     ========================================================= */
  const ret = $('.reticle'), xy = $('.js-xy');
  if (!touch) {
    const rx = gsap.quickTo(ret, 'x', { duration: 0.18, ease: 'power3' }), ry = gsap.quickTo(ret, 'y', { duration: 0.18, ease: 'power3' });
    gsap.set(ret, { opacity: 0 });
    addEventListener('pointermove', e => { rx(e.clientX); ry(e.clientY); xy.textContent = `x:${e.clientX} y:${e.clientY}`; gsap.to(ret, { opacity: 1, duration: 0.3, overwrite: 'auto' }); });
    document.addEventListener('pointerover', e => ret.classList.toggle('is-hover', !!e.target.closest('a,button,input')));
  }

  /* =========================================================
     PARTÍCULAS · three.js + bloom + aberración cromática
     ========================================================= */
  const HQ = innerWidth >= 820 && !touch;
  const N = HQ ? 11000 : 4200;
  let gl = null;
  try {
    const canvas = $('.gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    const PR = Math.min(devicePixelRatio, HQ ? 1.5 : 2);
    renderer.setPixelRatio(PR);
    renderer.setClearColor(0x000000, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.z = 16;

    // --- partículas principales ---
    const pos = new Float32Array(N * 3), target = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    const rand = new Float32Array(N), k = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = 22 + Math.random() * 14, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pos[i * 3 + 2] = r * Math.cos(ph) - 12;
      rand[i] = Math.random(); k[i] = 0.018 + Math.random() * 0.03;
    }
    target.set(pos);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: 2.4 * PR }, uTime: { value: 0 }, uTint: { value: new THREE.Color('#22b99a') }, uHot: { value: new THREE.Color('#5cffcf') } },
      vertexShader: `
        attribute float aRand; uniform float uSize; uniform float uTime; varying float vR;
        void main(){
          vR = aRand;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float tw = 0.7 + 0.3 * sin(uTime * 4.0 + aRand * 60.0);
          gl_PointSize = uSize * (0.5 + aRand * 1.2) * tw * (16.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uTint; uniform vec3 uHot; varying float vR;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = pow(smoothstep(0.5, 0.0, d), 1.6);
          vec3 c = mix(uTint, uHot, vR);
          c = mix(c, vec3(1.0), step(0.94, vR));
          gl_FragColor = vec4(c, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // --- campo de estrellas lejano ---
    const SN = HQ ? 2200 : 900, sp = new Float32Array(SN * 3);
    for (let i = 0; i < SN; i++) { sp[i * 3] = (Math.random() - 0.5) * 160; sp[i * 3 + 1] = (Math.random() - 0.5) * 100; sp[i * 3 + 2] = -30 - Math.random() * 60; }
    const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0x9fffe3, size: 0.18, transparent: true, opacity: 0.55, depthWrite: false }));
    scene.add(stars);

    // --- postprocesado: bloom + aberración/grano/viñeta ---
    let composer = null, fx = null, bloom = null;
    if (THREE.EffectComposer && THREE.UnrealBloomPass) {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), HQ ? 1.2 : 0.9, 0.55, 0.0);
      composer.addPass(bloom);
      fx = new THREE.ShaderPass({
        uniforms: { tDiffuse: { value: null }, uAmt: { value: 0.0015 }, uTime: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform float uAmt; uniform float uTime; varying vec2 vUv;
          float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
          void main(){
            vec2 dir = vUv - 0.5;
            float r = texture2D(tDiffuse, vUv + dir * uAmt * 6.0).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - dir * uAmt * 6.0).b;
            vec3 c = vec3(r, g, b);
            c += (rnd(vUv * 900.0) - 0.5) * 0.06;
            c *= 1.0 - dot(dir, dir) * 1.3;
            gl_FragColor = vec4(c, 1.0);
          }`
      });
      composer.addPass(fx);
    }

    let visW = 1, visH = 1;
    const resize = () => {
      renderer.setSize(innerWidth, innerHeight, false);
      composer && composer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360); visW = visH * camera.aspect;
    };
    resize();

    /* --- texto → nube de puntos --- */
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

    const PALETTE = {
      'M.V.P': ['#22b99a', '#5cffcf'], 'RTG': ['#1fa88c', '#b9fff0'], '▶': ['#ffffff', '#5cffcf'],
      'I': ['#22b99a', '#5cffcf'], 'II': ['#18c6c6', '#9ff9ff'], 'III': ['#5bd66a', '#d6ffb0'],
      'MVP': ['#22b99a', '#ffffff'], '?': ['#ff2e88', '#ffb3d6'], 'TÚ': ['#5cffcf', '#ffffff']
    };
    const tint = c => {
      const p = PALETTE[c] || ['#22b99a', '#5cffcf'];
      const a = new THREE.Color(p[0]), b = new THREE.Color(p[1]);
      gsap.to(mat.uniforms.uTint.value, { r: a.r, g: a.g, b: a.b, duration: 1 });
      gsap.to(mat.uniforms.uHot.value, { r: b.r, g: b.g, b: b.b, duration: 1 });
    };

    const state = { swirl: 0, glitch: 0, cx: 0, cy: 0 };
    let current = '', currentAlign = 0, currentLift = 0;
    const setShape = (str, align = 0, burst = true, lift = 0) => {
      const pts = sample(str), count = pts.length / 2;
      const span = align ? visW * 0.42 : lift ? visW * 0.7 : visW * 0.86;
      const worldW = Math.min(span, visH * (lift ? 0.55 : 0.8) * 2);
      const s = worldW / CW, ox = align * visW * 0.23, oy = lift * visH;
      for (let i = 0; i < N; i++) {
        const kk = ((i * 7919) % count) * 2;
        target[i * 3] = (pts[kk] - CW / 2) * s + ox + (Math.random() - 0.5) * s * 3;
        target[i * 3 + 1] = -(pts[kk + 1] - CH / 2) * s + oy + (Math.random() - 0.5) * s * 3;
        target[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
        if (burst && !reduce) { vel[i * 3] += (Math.random() - 0.5) * 0.5; vel[i * 3 + 1] += (Math.random() - 0.5) * 0.5; vel[i * 3 + 2] += (Math.random() - 0.2) * 0.9; }
      }
      state.cx = ox; state.cy = oy;
      if (burst && !reduce && str !== current) {
        gsap.fromTo(state, { swirl: 1 }, { swirl: 0, duration: 1.8, ease: 'power2.out', overwrite: 'auto' });
        gsap.fromTo(state, { glitch: 0.03 }, { glitch: 0, duration: 0.7, ease: 'power2.out' });
      }
      current = str; currentAlign = align; currentLift = lift;
      tint(str);
      $('.js-shape').textContent = str;
    };

    /* --- ratón: repeler, cargar (mantener) y onda expansiva (soltar) --- */
    const m = { x: 999, y: 999, nx: 0, ny: 0, down: false, t0: 0 };
    const toWorld = e => { m.nx = (e.clientX / innerWidth) * 2 - 1; m.ny = -(e.clientY / innerHeight) * 2 + 1; m.x = (m.nx * visW) / 2; m.y = (m.ny * visH) / 2; };
    addEventListener('pointermove', toWorld);
    addEventListener('pointerleave', () => { if (!m.down) { m.x = 999; m.y = 999; } });
    const interactive = e => !e.target.closest('a,button,input,label,.panel,.quiz,.hud,.dots');
    addEventListener('pointerdown', e => {
      if (!interactive(e)) return;
      toWorld(e); m.down = true; m.t0 = performance.now();
      ret.classList.add('is-hold');
    });
    const release = e => {
      if (!m.down) return;
      m.down = false; ret.classList.remove('is-hold');
      const held = performance.now() - m.t0, power = Math.min(held / 1200, 1);
      const P = 0.6 + power * 2.6;
      for (let i = 0; i < N; i++) {
        const j = i * 3, dx = pos[j] - m.x, dy = pos[j + 1] - m.y, d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const f = P * Math.max(0, 1 - d / (6 + power * 14)) * (0.6 + rand[i]);
        vel[j] += (dx / d) * f; vel[j + 1] += (dy / d) * f; vel[j + 2] += f * 0.8 * (Math.random() - 0.3);
      }
      gsap.fromTo(state, { glitch: 0.01 + power * 0.04 }, { glitch: 0, duration: 0.9, ease: 'power2.out' });
      const fl = $('.flash'); fl.style.setProperty('--fx', `${e.clientX}px`); fl.style.setProperty('--fy', `${e.clientY}px`);
      gsap.fromTo(fl, { opacity: 0.4 + power * 0.6 }, { opacity: 0, duration: 0.8, ease: 'power2.out' });
      if (power > 0.6) gsap.fromTo('main', { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,.3)', clearProps: 'transform' });
    };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);

    /* --- velocidad del scroll → turbulencia y glitch --- */
    let scrollV = 0;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => (scrollV = s.getVelocity()) });

    const R = 2.6, R2 = R * R;
    const loop = t => {
      mat.uniforms.uTime.value = t;
      scrollV *= 0.9;
      const turb = Math.min(Math.abs(scrollV) / 3000, 1.2);
      const holdOn = m.down && performance.now() - m.t0 > 160;
      const p = geo.attributes.position.array;
      const sw = state.swirl;
      for (let i = 0; i < N; i++) {
        const j = i * 3;
        let tx = target[j], ty = target[j + 1], tz = target[j + 2];
        if (holdOn) { // se concentran en el cursor formando una bola que vibra
          const a = rand[i] * 6.283 + t * 3, rr = 0.25 + rand[i] * 1.3;
          tx = m.x + Math.cos(a) * rr; ty = m.y + Math.sin(a) * rr; tz = (rand[i] - 0.5) * 2;
        }
        const kk = holdOn ? 0.06 : k[i];
        let vx = vel[j] + (tx - p[j]) * kk, vy = vel[j + 1] + (ty - p[j + 1]) * kk, vz = vel[j + 2] + (tz - p[j + 2]) * kk;
        if (sw > 0.01) { const dx = p[j] - state.cx, dy = p[j + 1] - state.cy; vx += -dy * sw * 0.02; vy += dx * sw * 0.02; }
        if (turb > 0.01) { vx += Math.sin(t * 5 + rand[i] * 50) * turb * 0.05; vy += Math.cos(t * 4 + rand[i] * 40) * turb * 0.05; }
        if (!holdOn) {
          const dx = p[j] - m.x, dy = p[j + 1] - m.y, d2 = dx * dx + dy * dy;
          if (d2 < R2) { const d = Math.sqrt(d2) || 0.001, f = (1 - d / R) * 0.12; vx += (dx / d) * f; vy += (dy / d) * f; }
        }
        vx *= 0.86; vy *= 0.86; vz *= 0.86;
        vel[j] = vx; vel[j + 1] = vy; vel[j + 2] = vz;
        p[j] += vx; p[j + 1] += vy; p[j + 2] += vz;
      }
      geo.attributes.position.needsUpdate = true;
      points.rotation.y += ((touch ? 0 : m.nx * 0.2) + Math.sin(t * 0.25) * 0.07 - points.rotation.y) * 0.05;
      points.rotation.x += ((touch ? 0 : -m.ny * 0.14) - points.rotation.x) * 0.05;
      stars.rotation.z = t * 0.01; stars.position.y = (scrollY / innerHeight) * 1.5;
      if (fx) { fx.uniforms.uTime.value = t; fx.uniforms.uAmt.value = 0.0015 + state.glitch + Math.min(Math.abs(scrollV) / 60000, 0.012); }
      if (bloom) bloom.strength = (HQ ? 1.2 : 0.9) + (holdOn ? 0.8 : 0) + state.glitch * 12;
      composer ? composer.render() : renderer.render(scene, camera);
    };
    gsap.ticker.add(loop);
    addEventListener('resize', () => { resize(); setShape(current, currentAlign, false, currentLift); });

    gl = { setShape, burst: (pw = 1.4) => { for (let i = 0; i < N * 3; i++) vel[i] += (Math.random() - 0.5) * pw; gsap.fromTo(state, { glitch: 0.04 }, { glitch: 0, duration: 1 }); } };
  } catch (err) {
    document.body.classList.add('no-gl');
  }

  /* =========================================================
     TERMINAL + ENCENDIDO CRT
     ========================================================= */
  const fontsReady = (document.fonts ? document.fonts.load('900 100px Unbounded') : Promise.resolve()).catch(() => {});
  const out = $('.term__out');
  const LINES = [
    ['> cargando guion_antiguo.txt', ''], ['> autor: otra persona', 'dim'], ['> papel asignado: secundario', 'dim'],
    ['> ERROR: el protagonista no está de acuerdo', 'err'], ['> iniciando Reescribe_tu_Guion…', ''],
    ['> [marketing]   ██████████ ok', ''], ['> [conciencia]  ██████████ ok', ''], ['> [mentalidad]  ██████████ ok', ''],
    ['> nuevo autor: TÚ', '']
  ];
  const start = () => {
    document.body.classList.remove('is-loading');
    fontsReady.then(() => gl && gl.setShape('M.V.P', 0, true, 0.2));
    const h1 = $('#s-mvp h1');
    gsap.from('#s-mvp > *', { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: 'expo.out', delay: 0.2, onStart: () => scramble(h1) });
    gsap.from('.hud, .dots, .hold-hint', { opacity: 0, duration: 1, delay: 0.6 });
    ScrollTrigger.refresh();
  };
  if (reduce) { $('.term').remove(); $('.crt').remove(); start(); }
  else {
    const tl = gsap.timeline();
    LINES.forEach(([txt, cls]) => {
      const o = { n: 0 }; let span;
      tl.call(() => { span = document.createElement('span'); if (cls) span.className = cls; out.appendChild(span); out.appendChild(document.createTextNode('\n')); })
        .to(o, { n: txt.length, duration: txt.length * 0.013, ease: 'none', onUpdate: () => (span.textContent = txt.slice(0, Math.round(o.n))) })
        .to({}, { duration: cls === 'err' ? 0.45 : 0.07 });
    });
    // la terminal se apaga como un monitor viejo… y la web se enciende igual
    tl.call(() => $('.term').classList.add('is-glitch'))
      .to('.term__box', { scaleY: 0.006, scaleX: 1.15, duration: 0.25, ease: 'power4.in', delay: 0.5 })
      .to('.term__box', { scaleX: 0, duration: 0.18, ease: 'power4.in' })
      .call(() => { $('.term').remove(); $('.crt').classList.add('is-on'); start(); })
      .fromTo('.crt i', { scaleX: 0 }, { scaleX: 1, duration: 0.25, ease: 'power3.out' })
      .to('.crt i', { scaleY: 400, opacity: 0, duration: 0.45, ease: 'power3.in' })
      .to('.crt', { opacity: 0, duration: 0.35, onComplete: () => $('.crt').remove() }, '-=0.3');
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
        dots.forEach((d, kk) => d.classList.toggle('is-on', kk === i));
        const a = innerWidth < 820 ? 0 : align;
        if (gl && !document.body.classList.contains('is-loading')) gl.setShape(s.dataset.shape, a, true, s.id === 's-mvp' ? 0.2 : 0);
        const h = $('h2', s);
        if (h && !reduce) { scramble(h); h.classList.remove('is-jolt'); void h.offsetWidth; h.classList.add('is-jolt'); }
      }
    });
    if (!reduce && !s.classList.contains('sec--center')) {
      gsap.from($('.panel', s), { x: align * 140, opacity: 0, rotationY: align * -20, transformPerspective: 900, filter: 'blur(12px)', duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 70%' } });
    }
  });
  if (!reduce) gsap.from('#s-test .panel', { y: 90, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '#s-test', start: 'top 70%' } });

  /* ---------- test ---------- */
  RTG.mountQuiz($('[data-quiz]'), {
    onStep: (step, total) => { if (gl && step > 0) gl.setShape(`${step + 1}/${total}`, 0); },
    onResult: () => { if (gl) { gl.setShape('TÚ', 0); gl.burst(2.2); } }
  });
})();
