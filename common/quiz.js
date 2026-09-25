/* =========================================================
   Reescribe tu Guion · test compartido por los 3 prototipos
   Cambia aquí el número, el vídeo, las preguntas y los resultados.
   ========================================================= */
window.RTG = {
  whatsapp: '34633712475',
  // Pega aquí el enlace de YouTube o Vimeo cuando tengas el vídeo gratuito.
  videoUrl: '',

  questions: [
    { q: '¿Quién escribió el guion que estás viviendo ahora mismo?', a: [['Mis padres y mi entorno', 'c'], ['Lo que se supone que "toca" hacer', 'c'], ['Yo, pero lo abandono a mitad', 'x'], ['Yo, pero nadie lo ve', 'm']] },
    { q: 'Cuando empiezas algo nuevo…', a: [['Lo dejo cuando se acaba la motivación', 'x'], ['Me da miedo enseñarlo por lo que dirán', 'm'], ['No sé si de verdad es lo que quiero', 'c'], ['Me cuesta que alguien se entere de que existe', 'm']] },
    { q: '¿Qué frase te suena más?', a: [['"Algún día me pondré en serio"', 'x'], ['"Yo es que soy así"', 'c'], ['"Hago cosas buenas, pero nadie me paga por ellas"', 'm'], ['"Empiezo fuerte y me desinflo"', 'x']] },
    { q: '¿Qué parte de tu vida va más en piloto automático?', a: [['Trabajo y dinero', 'm'], ['Relaciones y cómo me ven', 'c'], ['Hábitos, cuerpo y rutina', 'x'], ['Mi propósito', 'c']] },
    { q: '¿Cómo de en serio vas a reescribirlo?', a: [['Solo estoy mirando', '1'], ['Quiero empezar este mes', '2'], ['Estoy listo para invertir en mí ya', '3']] }
  ],

  results: {
    m: { role: 'El talento invisible', text: 'Tienes cosas que contar y valor que aportar, pero tu guion te deja en segundo plano. No es falta de capacidad: nadie te enseñó a mostrarte sin sentir que ruegas atención.', act: 'Tu acto pendiente: Acto I · Marketing — deja de rogar que te vean.' },
    c: { role: 'El actor sin papel propio', text: 'Estás interpretando un personaje que escribieron otros: expectativas, creencias heredadas, lo que "toca". Antes de cambiar nada necesitas ver con claridad el papel que llevas actuando.', act: 'Tu acto pendiente: Acto II · Conciencia — mira el papel que llevas actuando.' },
    x: { role: 'El protagonista intermitente', text: 'Sabes lo que quieres y arrancas con fuerza, pero el cambio no se queda. Se acaba la motivación y vuelves al guion de siempre. Te falta convertirlo en identidad.', act: 'Tu acto pendiente: Acto III · Mentalidad — conviértelo en quien eres.' }
  },
  commit: { 1: 'Solo estoy mirando', 2: 'Quiero empezar este mes', 3: 'Estoy listo para invertir en mí ya' },

  waHref(text) {
    return `https://wa.me/${this.whatsapp}?text=${encodeURIComponent(text || 'Hola Mario, vengo de la web de Reescribe tu Guion y quiero más información.')}`;
  },

  embedUrl() {
    const url = this.videoUrl || '';
    let m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0`;
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1`;
    return null;
  },

  /* Monta el test dentro de `root`. Hooks opcionales:
     onStep(step, total) · onResult(key) · onPick(step, pillar) */
  mountQuiz(root, hooks = {}) {
    const R = this, Q = R.questions;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anim = !reduce && window.gsap;
    root.innerHTML = `
      <div class="quiz__progress"><span></span></div>
      <div class="quiz__stage"></div>
      <div class="quiz__result" hidden>
        <p class="quiz__label">Tu papel ahora mismo</p>
        <h3 class="quiz__role"></h3>
        <p class="quiz__text"></p>
        <p class="quiz__act"></p>
        <label class="quiz__name">¿Cómo te llamas? <input type="text" maxlength="40" placeholder="Tu nombre (opcional)"></label>
        <a class="quiz__wa" href="#" target="_blank" rel="noopener">Enviar mi resultado por WhatsApp</a>
        <button class="quiz__again" type="button">Repetir el test</button>
      </div>`;
    const stage = root.querySelector('.quiz__stage'), bar = root.querySelector('.quiz__progress span');
    const result = root.querySelector('.quiz__result'), input = result.querySelector('input'), wa = result.querySelector('.quiz__wa');
    const answers = [];
    let step = 0;

    const render = (dir = 1) => {
      bar.style.width = `${(step / Q.length) * 100}%`;
      hooks.onStep && hooks.onStep(step, Q.length);
      const q = Q[step];
      const html = `<div class="quiz__q">
        <p class="quiz__step">Pregunta ${step + 1} de ${Q.length}</p>
        <h3>${q.q}</h3>
        <div class="quiz__opts">${q.a.map((o, i) => `<button type="button" class="quiz__opt${answers[step] === i ? ' is-picked' : ''}" data-i="${i}"><b>${'ABCD'[i]}</b><span>${o[0]}</span></button>`).join('')}</div>
        ${step ? '<button type="button" class="quiz__back">← Anterior</button>' : ''}
      </div>`;
      const swap = () => {
        stage.innerHTML = html;
        stage.querySelectorAll('.quiz__opt').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i, b)));
        const back = stage.querySelector('.quiz__back');
        back && back.addEventListener('click', () => { step--; render(-1); });
        anim && gsap.from(stage.querySelectorAll('.quiz__q > *, .quiz__opt'), { x: 50 * dir, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'power3.out' });
      };
      if (anim && stage.firstElementChild) gsap.to(stage.firstElementChild, { x: -50 * dir, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: swap });
      else swap();
    };

    const pick = (i, btn) => {
      answers[step] = i;
      stage.querySelectorAll('.quiz__opt').forEach(b => b.classList.toggle('is-picked', b === btn));
      hooks.onPick && hooks.onPick(step, Q[step].a[i][1]);
      setTimeout(() => (step < Q.length - 1 ? (step++, render(1)) : showResult()), 360);
    };

    const compute = () => {
      const c = { m: 0, c: 0, x: 0 };
      answers.slice(0, 4).forEach((a, i) => c[Q[i].a[a][1]]++);
      return ['m', 'c', 'x'].reduce((best, k) => (c[k] > c[best] ? k : best), 'm');
    };

    const message = key => {
      const res = R.results[key], name = input.value.trim();
      const lines = Q.map((q, i) => `${i + 1}. ${q.q} → ${q.a[answers[i]][0]}`).join('\n');
      return `Hola Mario 👋${name ? ` Soy ${name}.` : ''} Acabo de hacer el test de Reescribe tu Guion (M.V.P).\n\n🎬 Mi papel: ${res.role}\n📌 ${res.act}\n🔥 Compromiso: ${R.commit[Q[4].a[answers[4]][1]]}\n\nMis respuestas:\n${lines}\n\nQuiero saber más sobre el curso.`;
    };

    const showResult = () => {
      bar.style.width = '100%';
      const key = compute(), res = R.results[key];
      result.querySelector('.quiz__role').textContent = res.role;
      result.querySelector('.quiz__text').textContent = res.text;
      result.querySelector('.quiz__act').textContent = res.act;
      const upd = () => (wa.href = R.waHref(message(key)));
      upd(); input.oninput = upd;
      stage.innerHTML = ''; result.hidden = false;
      hooks.onResult && hooks.onResult(key);
      anim && gsap.from(result.children, { y: 30, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'back.out(1.8)' });
    };

    result.querySelector('.quiz__again').addEventListener('click', () => { answers.length = 0; step = 0; result.hidden = true; render(1); });
    render(1);
  },

  /* Botón de play: si hay vídeo lo incrusta, si no avisa de que llega pronto */
  mountVideo(frame, playBtn) {
    playBtn.addEventListener('click', () => {
      const src = this.embedUrl();
      if (src) frame.innerHTML = `<iframe src="${src}" title="Clase gratuita de Reescribe tu Guion" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>`;
      else frame.classList.add('is-soon');
    });
  }
};
