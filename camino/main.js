(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  gsap.registerPlugin(ScrollTrigger);

  $$('.js-year').forEach(e => (e.textContent = new Date().getFullYear()));
  $('.js-wa').href = RTG.waHref();
  RTG.mountVideo($('.js-video'), $('.video__play'));
  RTG.mountQuiz($('[data-quiz]'), {
    onResult: () => !reduce && gsap.fromTo('.node--end', { scale: 1 }, { scale: 2.2, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' })
  });

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault(); scrollTo({ top: t.getBoundingClientRect().top + scrollY - 20, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- el camino: se construye uniendo los nodos ---------- */
  const road = $('.road'), svg = $('.path'), ghost = $('.path__ghost'), lit = $('.path__lit'), walker = $('.path__walker');
  const nodes = $$('.node');
  let total = 0, table = [], nodeY = [], cur = 0;

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
    // tabla longitud → altura para saber qué trozo del camino toca a cada scroll
    table = [];
    for (let l = 0; l <= total; l += 6) table.push([l, lit.getPointAtLength(l).y]);
    table.push([total, lit.getPointAtLength(total).y]);
  };
  const lengthAtY = y => {
    let lo = 0, hi = table.length - 1;
    if (y <= table[0][1]) return 0;
    if (y >= table[hi][1]) return total;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; (table[mid][1] < y ? (lo = mid) : (hi = mid)); }
    const [l0, y0] = table[lo], [l1, y1] = table[hi];
    return l0 + (l1 - l0) * ((y - y0) / (y1 - y0 || 1));
  };

  const km = $('.js-km');
  const tick = () => {
    if (!total) return;
    const rb = road.getBoundingClientRect();
    const target = lengthAtY(innerHeight * 0.58 - rb.top);
    cur += (target - cur) * (reduce ? 1 : 0.12);
    lit.style.strokeDashoffset = total - cur;
    const p = lit.getPointAtLength(cur);
    walker.setAttribute('cx', p.x); walker.setAttribute('cy', p.y);
    nodes.forEach((n, i) => {
      const on = p.y >= nodeY[i] - 2;
      if (on !== n.classList.contains('is-lit')) {
        n.classList.toggle('is-lit', on);
        if (on && !reduce) gsap.fromTo(n, { scale: 2.4 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1,.4)' });
      }
    });
    km.textContent = Math.round((cur / total) * 100);
  };

  const rebuild = () => { build(); cur = Math.min(cur, total); };
  addEventListener('resize', () => requestAnimationFrame(rebuild));
  addEventListener('load', rebuild);
  document.fonts && document.fonts.ready.then(rebuild);
  new ResizeObserver(() => rebuild()).observe(road);
  build();
  gsap.ticker.add(tick);

  /* ---------- luciérnagas ---------- */
  const cv = $('.fireflies'), ctx = cv.getContext('2d');
  let W, H, flies = [], mx = -999, my = -999;
  const size = () => { W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio; };
  size(); addEventListener('resize', size);
  addEventListener('mousemove', e => { mx = e.clientX * devicePixelRatio; my = e.clientY * devicePixelRatio; });
  for (let i = 0; i < 70; i++) flies.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + 0.6, s: Math.random() * 0.0006 + 0.0002, p: Math.random() * 6.28 });
  if (!reduce) gsap.ticker.add(t => {
    ctx.clearRect(0, 0, W, H);
    flies.forEach(f => {
      f.y -= f.s; if (f.y < -0.05) f.y = 1.05;
      let x = (f.x + Math.sin(t * 0.6 + f.p) * 0.01) * W, y = f.y * H;
      const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy);
      if (d < 140 * devicePixelRatio) { x += dx / d * 30; y += dy / d * 30; }
      const a = 0.35 + Math.sin(t * 2 + f.p) * 0.3;
      ctx.beginPath(); ctx.fillStyle = `rgba(125,255,217,${a})`; ctx.shadowColor = '#22b99a'; ctx.shadowBlur = 12 * devicePixelRatio;
      ctx.arc(x, y, f.r * devicePixelRatio, 0, 6.283); ctx.fill();
    });
  });

  /* ---------- entrada ---------- */
  const words = (() => {
    const el = $('.js-words');
    el.innerHTML = el.textContent.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
    return $$('.w', el);
  })();

  const start = () => {
    document.body.classList.remove('is-loading');
    gsap.timeline()
      .to(words, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.9, stagger: 0.06, ease: 'power3.out' })
      .from('.stop--hero .tag, .stop--hero .lead, .stop--hero .ctas, .hero__scroll', { opacity: 0, y: 20, stagger: 0.12, duration: 0.8 }, '-=0.5')
      .from('.top', { y: -80, opacity: 0, duration: 0.8 }, 0.3);
    rebuild();
  };
  if (reduce) { $('.loader').remove(); document.body.classList.remove('is-loading'); }
  else gsap.timeline({ onComplete: () => { $('.loader').remove(); start(); } })
    .from('.loader__dot', { scale: 0, duration: 0.6, ease: 'back.out(3)' })
    .to('.loader__line', { scaleX: 1, duration: 1.1, ease: 'power3.inOut' })
    .to('.loader__txt', { opacity: 1, duration: 0.5 }, '-=0.5')
    .to('.loader__dot', { y: 60, scale: 3, opacity: 0, duration: 0.6, ease: 'power2.in' }, '+=0.3')
    .to('.loader', { opacity: 0, duration: 0.5 }, '-=0.2');

  if (reduce) return;

  /* ---------- cada parada aparece al llegar ---------- */
  $$('.stop:not(.stop--hero) .stop__body').forEach(b => {
    gsap.from(b, { opacity: 0, y: 80, filter: 'blur(12px)', duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 80%' } });
    gsap.from($$('.tag, .h2, p, .video, .quiz', b), { opacity: 0, y: 24, stagger: 0.07, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 75%' } });
  });
  $$('.act__num').forEach(n => gsap.fromTo(n, { y: 80 }, { y: -40, ease: 'none', scrollTrigger: { trigger: n.closest('.stop'), start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.foot__big', { scale: 0.6, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%' } });
})();
