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
    e.preventDefault(); scrollTo({ top: t.getBoundingClientRect().top + scrollY - 20, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- acordeón de actos ---------- */
  const items = $$('.acc__item');
  items.forEach(it => $('.acc__head', it).addEventListener('click', () => {
    const open = !it.classList.contains('is-open');
    items.forEach(o => {
      const on = o === it ? open : false;
      if (on === o.classList.contains('is-open')) return;
      o.classList.toggle('is-open', on);
      $('.acc__head', o).setAttribute('aria-expanded', on);
      const panel = $('.acc__panel', o);
      if (reduce) return;
      gsap.fromTo(panel, { height: on ? 0 : panel.scrollHeight }, { height: on ? 'auto' : 0, duration: 0.6, ease: 'power3.inOut', clearProps: on ? 'height' : '' });
    });
    ScrollTrigger.refresh();
  }));

  /* ---------- la planta ---------- */
  const stem = $('.stem'), len = stem.getTotalLength();
  const leaves = $$('.leaf').map(g => ({ at: +g.dataset.at, el: $('path', g), on: false }));
  const petals = $('.flower .petals'), core = $('.flower .core'), stage = $('.js-stage');
  let bloomed = false;

  gsap.set(stem, { strokeDasharray: len, strokeDashoffset: len });
  gsap.set(leaves.map(l => l.el), { scale: 0, svgOrigin: '0 0' });
  gsap.set(petals, { scale: 0, rotation: -120, svgOrigin: '0 0' });
  gsap.set(core, { scale: 0, svgOrigin: '0 0' });

  const bloom = on => {
    if (on === bloomed) return; bloomed = on;
    gsap.to(petals, { scale: on ? 1 : 0, rotation: on ? 0 : -120, duration: on ? 1.2 : 0.5, ease: on ? 'elastic.out(1,.45)' : 'power2.in', overwrite: true });
    gsap.to(core, { scale: on ? 1 : 0, duration: on ? 0.8 : 0.4, delay: on ? 0.15 : 0, ease: on ? 'back.out(3)' : 'power2.in', overwrite: true });
  };
  const names = [[0.05, 'Semilla'], [0.3, 'Brote'], [0.6, 'Planta'], [0.8, 'Creciendo'], [2, 'En flor']];

  const grow = p => {
    gsap.set(stem, { strokeDashoffset: len * (1 - Math.min(p / 0.78, 1)) });
    leaves.forEach(l => {
      const on = p >= l.at;
      if (on === l.on) return; l.on = on;
      gsap.to(l.el, { scale: on ? 1 : 0, duration: on ? 0.9 : 0.35, ease: on ? 'elastic.out(1,.5)' : 'power2.in', overwrite: true });
    });
    if (p >= 0.8) bloom(true); else if (!quizDone) bloom(false);
    stage.textContent = names.find(n => p < n[0])[1];
  };
  let quizDone = false;

  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => grow(s.progress) });
  grow(0);

  // se mece con el ratón
  if (!touch && !reduce) {
    const sway = gsap.quickTo('.plant svg', 'rotation', { duration: 1.2, ease: 'power3.out' });
    gsap.set('.plant svg', { transformOrigin: '50% 97%' });
    addEventListener('mousemove', e => sway((e.clientX / innerWidth - 0.5) * 6));
  }

  /* ---------- test: cada respuesta hace que la planta se agite ---------- */
  RTG.mountQuiz($('[data-quiz]'), {
    onPick: () => !reduce && gsap.fromTo('.plant svg', { scale: 1 }, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, transformOrigin: '50% 97%' }),
    onResult: () => { quizDone = true; bloom(true); stage.textContent = 'En flor'; }
  });

  /* ---------- entrada ---------- */
  const intro = () => {
    document.body.classList.remove('is-loading');
    gsap.timeline()
      .from('.hero__title .line > span', { yPercent: 110, duration: 1.1, stagger: 0.12, ease: 'expo.out' })
      .to('mark', { backgroundSize: '100% 100%', duration: 0.9, ease: 'power2.inOut' }, '-=0.4')
      .from('.hero .eyebrow, .hero__lead, .hero .ctas', { y: 30, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .from('.top', { y: -80, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.2)
      .from('.plant', { y: 120, opacity: 0, duration: 1, ease: 'power3.out' }, 0.2);
    ScrollTrigger.refresh();
  };
  if (reduce) {
    $('.loader').remove(); document.body.classList.remove('is-loading');
    gsap.set('mark', { backgroundSize: '100% 100%' });
    return;
  }
  gsap.timeline({ onComplete: () => { $('.loader').remove(); intro(); } })
    .from('.l-seed', { y: -90, duration: 0.7, ease: 'bounce.out' })
    .to('.l-sprout', { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' })
    .from('.l-leaf', { scale: 0, duration: 0.7, stagger: 0.1, ease: 'back.out(3)' }, '-=0.2')
    .to('.loader svg', { scale: 1.1, duration: 0.3, yoyo: true, repeat: 1 })
    .to('.loader', { yPercent: -100, duration: 0.8, ease: 'expo.inOut' });

  /* ---------- apariciones ---------- */
  $$('section:not(.hero)').forEach(s => {
    gsap.from($$('.eyebrow, .h2, .acts__lead, .video, .acc__item, .mario__quote, .mario__cols p, .mario__sign, .test > p, .quiz', s), {
      y: 60, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 75%' }
    });
  });
  gsap.from('.video__play', { scale: 0, rotation: -90, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '.video', start: 'top 70%' } });
  gsap.from('.foot__big', { yPercent: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 90%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
