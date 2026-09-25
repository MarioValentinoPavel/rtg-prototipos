(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  gsap.registerPlugin(ScrollTrigger);
  const DPR = Math.min(devicePixelRatio || 1, 2);

  $$('.js-year').forEach(e => (e.textContent = new Date().getFullYear()));
  $('.js-wa').href = RTG.waHref();
  RTG.mountVideo($('.js-video'), $('.video__play'));
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault(); scrollTo({ top: t.getBoundingClientRect().top + scrollY - 20, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- texto que se descifra ---------- */
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const scramble = (el, dur = 0.9) => {
    if (reduce) return;
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    const o = { p: 0 };
    gsap.to(o, {
      p: 1, duration: dur, ease: 'power2.out', overwrite: true,
      onUpdate: () => {
        const n = Math.floor(final.length * o.p);
        let s = final.slice(0, n);
        for (let i = n; i < final.length; i++) s += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.textContent = s;
      },
      onComplete: () => (el.textContent = final)
    });
  };

  /* ---------- aviso de checkpoint ---------- */
  const toast = $('.toast'), toastT = $('.toast__t');
  let toastTl;
  const showToast = (k, t) => {
    if (reduce) return;
    $('.toast__k').textContent = k; toastT.textContent = t;
    toastTl && toastTl.kill();
    toastTl = gsap.timeline()
      .fromTo(toast, { xPercent: -50, y: -200, scale: 0.8 }, { y: 0, scale: 1, duration: 0.55, ease: 'back.out(2.2)' })
      .to(toast, { y: -200, duration: 0.4, ease: 'power2.in', delay: 1.6 });
  };

  /* ---------- test ---------- */
  RTG.mountQuiz($('[data-quiz]'), {
    onPick: () => burstAt(null, 30),
    onResult: () => {
      showToast('★ Destino alcanzado', 'Tu nuevo guion empieza hoy');
      burstAt(null, 260, 14);
      !reduce && gsap.fromTo('.node--end', { scale: 1 }, { scale: 2.6, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    }
  });

  /* =========================================================
     EL CAMINO
     ========================================================= */
  const road = $('.road'), svg = $('.path'), ghost = $('.path__ghost'), lit = $('.path__lit'), walker = $('.path__walker');
  const nodes = $$('.node');
  let total = 0, table = [], nodeY = [], nodeLen = [], cur = 0;

  const build = () => {
    const rb = road.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${rb.width} ${rb.height}`);
    const pts = nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2 - rb.left, y: r.top + r.height / 2 - rb.top }; });
    nodeY = pts.map(p => p.y);
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dy = b.y - a.y;
      d += ` C ${a.x} ${a.y + dy * 0.55}, ${b.x} ${b.y - dy * 0.55}, ${b.x} ${b.y}`;
    }
    ghost.setAttribute('d', d); lit.setAttribute('d', d);
    total = lit.getTotalLength();
    lit.style.strokeDasharray = total;
    table = [];
    for (let l = 0; l <= total; l += 6) table.push([l, lit.getPointAtLength(l).y]);
    table.push([total, lit.getPointAtLength(total).y]);
    nodeLen = nodeY.map(y => lengthAt(y));
    // marcas del altímetro
    const ticks = $('.alti__ticks'); ticks.innerHTML = '';
    nodeLen.forEach(l => { const i = document.createElement('i'); i.style.bottom = `${(l / total) * 100}%`; ticks.appendChild(i); });
  };
  function lengthAt(y) {
    let lo = 0, hi = table.length - 1;
    if (y <= table[0][1]) return 0;
    if (y >= table[hi][1]) return total;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; (table[mid][1] < y ? (lo = mid) : (hi = mid)); }
    const [l0, y0] = table[lo], [l1, y1] = table[hi];
    return l0 + (l1 - l0) * ((y - y0) / (y1 - y0 || 1));
  }

  const LABELS = ['Punto de partida', 'Paso 1 · Clase gratuita', 'Acto I · Marketing', 'Acto II · Conciencia', 'Acto III · Mentalidad', 'Tu guía · M.V.P', 'Destino · El test'];
  const km = $('.js-km'), alti = $('.js-alti'), altiFill = $('.alti__fill');
  let walkerVX = 0, walkerVY = 0, lastP = null, ready = false;

  const shockAt = (x, y) => {
    if (reduce) return;
    for (let k = 0; k < 2; k++) {
      const s = document.createElement('div'); s.className = 'shock'; s.style.left = x + 'px'; s.style.top = y + 'px';
      road.appendChild(s);
      gsap.fromTo(s, { scale: 0.2, opacity: 1 }, { scale: 9 + k * 5, opacity: 0, duration: 1.1 + k * 0.4, delay: k * 0.12, ease: 'expo.out', onComplete: () => s.remove() });
    }
  };

  const tick = () => {
    if (!total) return;
    const rb = road.getBoundingClientRect();
    const target = lengthAt(innerHeight * 0.58 - rb.top);
    cur += (target - cur) * (reduce ? 1 : 0.1);
    lit.style.strokeDashoffset = total - cur;
    const p = lit.getPointAtLength(cur);
    walker.setAttribute('cx', p.x); walker.setAttribute('cy', p.y);
    if (lastP) { walkerVX = p.x - lastP.x; walkerVY = p.y - lastP.y; }
    lastP = p;
    // posición en pantalla del cometa, para las chispas
    head.x = (rb.left + p.x) * DPR; head.y = (rb.top + p.y) * DPR;
    head.speed = Math.hypot(walkerVX, walkerVY);

    nodes.forEach((n, i) => {
      const on = p.y >= nodeY[i] - 2;
      if (on === n.classList.contains('is-lit')) return;
      n.classList.toggle('is-lit', on);
      $$('.alti__ticks i')[i]?.classList.toggle('on', on);
      if (on && ready) {
        if (!reduce) gsap.fromTo(n, { scale: 3 }, { scale: 1, duration: 0.9, ease: 'elastic.out(1,.35)' });
        const r = n.getBoundingClientRect();
        shockAt(r.left + r.width / 2 - rb.left, r.top + r.height / 2 - rb.top);
        burstAt({ x: (r.left + r.width / 2) * DPR, y: (r.top + r.height / 2) * DPR }, 90);
        if (i > 0) showToast(i === nodes.length - 1 ? '★ Destino' : '✓ Checkpoint', LABELS[i]);
      }
    });
    const prog = cur / total;
    km.textContent = Math.round(prog * 100);
    alti.textContent = Math.round(prog * 3000).toLocaleString('es-ES');
    altiFill.style.height = `${prog * 100}%`;
    document.documentElement.style.setProperty('--gy', `${scrollY * 0.9}px`);
  };

  const rebuild = () => { build(); cur = Math.min(cur, total); };
  addEventListener('resize', () => requestAnimationFrame(rebuild));
  addEventListener('load', rebuild);
  document.fonts && document.fonts.ready.then(rebuild);
  new ResizeObserver(() => rebuild()).observe(road);

  /* =========================================================
     LUCIÉRNAGAS + CHISPAS DEL COMETA
     ========================================================= */
  const cv = $('.fireflies'), ctx = cv.getContext('2d');
  let W, H, mx = -999, my = -999;
  const head = { x: -999, y: -999, speed: 0 };
  const flies = [], sparks = [];
  const size = () => { W = cv.width = innerWidth * DPR; H = cv.height = innerHeight * DPR; };
  size(); addEventListener('resize', size);
  addEventListener('pointermove', e => {
    mx = e.clientX * DPR; my = e.clientY * DPR;
    document.documentElement.style.setProperty('--mx', e.clientX + 'px');
    document.documentElement.style.setProperty('--my', e.clientY + 'px');
  });
  for (let i = 0; i < 80; i++) flies.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + 0.6, s: Math.random() * 0.0006 + 0.0002, p: Math.random() * 6.28 });

  function burstAt(pt, n = 80, power = 9) {
    if (reduce) return;
    const o = pt || { x: W / 2, y: H * 0.55 };
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = (Math.random() * power + 2) * DPR;
      sparks.push({ x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.012 + Math.random() * 0.02, r: (Math.random() * 2.2 + 0.8) * DPR, hue: Math.random() < 0.2 ? '#ffffff' : '#7dffd9' });
    }
  }

  const draw = t => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    // luciérnagas
    flies.forEach(f => {
      f.y -= f.s; if (f.y < -0.05) f.y = 1.05;
      let x = (f.x + Math.sin(t * 0.6 + f.p) * 0.01) * W, y = f.y * H;
      const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy);
      if (d < 150 * DPR) { x += (dx / d) * 34; y += (dy / d) * 34; }
      ctx.fillStyle = `rgba(125,255,217,${0.3 + Math.sin(t * 2 + f.p) * 0.25})`;
      ctx.beginPath(); ctx.arc(x, y, f.r * DPR, 0, 6.283); ctx.fill();
    });
    // estela del cometa: suelta chispas según lo rápido que avanza
    if (ready && head.y > -50 && head.y < H + 50) {
      const n = Math.min(8, 1 + head.speed * 0.8) | 0;
      for (let i = 0; i < n; i++) {
        sparks.push({ x: head.x + (Math.random() - 0.5) * 6, y: head.y + (Math.random() - 0.5) * 6, vx: -walkerVX * DPR * 0.3 + (Math.random() - 0.5) * 2.2 * DPR, vy: -walkerVY * DPR * 0.3 + (Math.random() - 0.5) * 2.2 * DPR, life: 1, decay: 0.02 + Math.random() * 0.03, r: (Math.random() * 2 + 0.6) * DPR, hue: '#7dffd9' });
      }
      // halo del cometa
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 60 * DPR);
      g.addColorStop(0, 'rgba(125,255,217,.55)'); g.addColorStop(1, 'rgba(125,255,217,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(head.x, head.y, 60 * DPR, 0, 6.283); ctx.fill();
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vx *= 0.94; s.vy = s.vy * 0.94 + 0.06 * DPR; s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life; ctx.fillStyle = s.hue;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.life + 0.3, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };

  build();
  gsap.ticker.add(tick);
  if (!reduce) gsap.ticker.add(t => draw(t));

  /* =========================================================
     ENTRADA: neón que se enciende + láser que reescribe
     ========================================================= */
  const neon = $('.js-neon');
  neon.innerHTML = neon.textContent.split(" ").map(w => `<span class="wd">${[...w].map(c => `<span class="ch">${c}</span>`).join("")}</span>`).join(" ");
  const chars = $$('.ch', neon);

  const start = () => {
    document.body.classList.remove('is-loading');
    rebuild();
    const order = gsap.utils.shuffle(chars.slice());
    const tl = gsap.timeline({ onComplete: () => { ready = true; } });
    // cada letra parpadea antes de quedarse encendida, como un neón
    order.forEach((c, i) => {
      tl.call(() => c.classList.add('on'), null, 0.1 + i * 0.022)
        .call(() => c.classList.remove('on'), null, 0.16 + i * 0.022)
        .call(() => c.classList.add('on'), null, 0.24 + i * 0.022);
    });
    tl.to('.laser', { opacity: 1, duration: 0.05 }, '+=0.1')
      .fromTo('.laser', { top: 0 }, { top: () => $('.strike').getBoundingClientRect().top + $('.strike').offsetHeight * 0.55, duration: 0.5, ease: 'power3.in' })
      .to('.strike__old', { opacity: 1, duration: 0.2 }, '<')
      .to('.strike__beam', { scaleX: 1, duration: 0.35, ease: 'power4.out' })
      .to('.laser', { opacity: 0, duration: 0.3 }, '<')
      .to('.rewrite', { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.7, ease: 'back.out(2.2)' }, '-=0.1')
      .call(() => { const r = $('.rewrite').getBoundingClientRect(); burstAt({ x: (r.left + r.width / 2) * DPR, y: (r.top + r.height / 2) * DPR }, 120); })
      .from('.stop--hero .tag, .stop--hero .lead, .stop--hero .ctas, .hero__scroll', { opacity: 0, y: 24, stagger: 0.1, duration: 0.7 }, '-=0.3')
      .from('.top, .alti', { opacity: 0, y: -20, duration: 0.8 }, '-=0.6')
      .from('.floor', { opacity: 0, yPercent: 30, duration: 1.2, ease: 'expo.out' }, 0.2);
  };

  if (reduce) { $('.loader').remove(); document.body.classList.remove('is-loading'); chars.forEach(c => c.classList.add('on')); ready = true; }
  else gsap.timeline({ onComplete: () => { $('.loader').remove(); start(); } })
    .from('.loader__dot', { scale: 0, duration: 0.6, ease: 'back.out(3)' })
    .to('.loader__line', { scaleX: 1, duration: 1, ease: 'power3.inOut' })
    .to('.loader__txt', { opacity: 1, duration: 0.4 }, '-=0.5')
    .to('.loader__dot', { scale: 60, duration: 0.7, ease: 'power3.in' }, '+=0.2')
    .to('.loader', { opacity: 0, duration: 0.4 }, '-=0.15');

  if (reduce) return;

  /* ---------- cada parada aparece y su título se descifra ---------- */
  $$('.stop:not(.stop--hero) .stop__body').forEach(b => {
    const h = $('.h2', b);
    gsap.from(b, {
      opacity: 0, y: 90, rotationX: -18, transformPerspective: 900, filter: 'blur(14px)', duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: b, start: 'top 82%', onEnter: () => h && scramble(h) }
    });
    gsap.from($$('.tag, p, .video, .quiz', b), { opacity: 0, y: 24, stagger: 0.06, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 76%' } });
  });
  $$('.act__num').forEach(n => gsap.fromTo(n, { y: 90, opacity: 0.2 }, { y: -50, opacity: 1, ease: 'none', scrollTrigger: { trigger: n.closest('.stop'), start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.foot__big', { scale: 0.5, opacity: 0, letterSpacing: '0.4em', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%' } });
})();
