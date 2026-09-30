(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* header, progresso, parallax, barra mobile */
  const header = $('header'), prog = $('.progress');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY, max = root.scrollHeight - innerHeight;
      header.classList.toggle('scrolled', y > 10);
      prog.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* menu mobile */
  const burger = $('.burger');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#drawer a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* sino de novidades */
  const bell = $('.bell'), panel = $('#bellPanel');
  let seen = false, ringT;
  const ring = () => { if (seen || reduce) return; bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring'); };
  setTimeout(ring, 1800);
  ringT = setInterval(ring, 9000);
  const setBell = open => {
    panel.hidden = !open;
    bell.setAttribute('aria-expanded', open);
    if (open && !seen) { seen = true; clearInterval(ringT); const d = $('.bell-dot'); d && d.remove(); bell.setAttribute('aria-label', 'Novidades'); }
  };
  bell.addEventListener('click', e => { e.stopPropagation(); setBell(panel.hidden); });
  panel.addEventListener('click', e => { if (e.target.closest('a')) setBell(false); });
  document.addEventListener('click', e => { if (!panel.hidden && !e.target.closest('.bell-wrap')) setBell(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { setBell(false); bell.focus(); } });

  /* aviso de esboço */
  const draft = $('#draft');
  if (draft) draft.querySelector('button').addEventListener('click', () => draft.classList.add('gone'));
  setTimeout(() => draft && draft.classList.add('gone'), 9000);

  /* palavra rotativa do título */
  const rot = $('.rot'), words = $$('.rot b'); let wi = 0;
  if (rot) {
  const fit = () => rot.style.width = words[wi].offsetWidth + 'px';
  fit(); document.fonts && document.fonts.ready.then(fit); addEventListener('resize', fit);
  if (!reduce) setInterval(() => {
    const cur = words[wi]; wi = (wi + 1) % words.length; const nxt = words[wi];
    cur.classList.remove('on'); cur.classList.add('out');
    setTimeout(() => cur.classList.remove('out'), 600);
    nxt.classList.add('on'); fit();
  }, 2600);
  }

  /* contadores */
  const fmt = (n, br) => br ? n.toLocaleString('pt-BR') : String(n);
  const count = el => {
    const end = +el.dataset.count, br = el.dataset.fmt === 'br';
    if (reduce) { el.textContent = fmt(end, br); return; }
    const t0 = performance.now(), dur = 1600, run = el._run = {};
    const step = t => {
      if (el._run !== run) return;
      const k = Math.min(Math.max((t - t0) / dur, 0), 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(end * e), br);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // se o navegador pausar a animação (aba em segundo plano), o número termina certo mesmo assim
    setTimeout(() => { if (el._run === run) el.textContent = fmt(end, br); }, dur + 150);
  };

  /* revelar ao rolar */
  let pending = $$('.rv');
  const reveal = () => {
    const limit = innerHeight * .92;
    pending = pending.filter(el => {
      if (el.getBoundingClientRect().top > limit) return true;
      el.classList.add('in');
      $$('[data-count]', el).forEach(count);
      return false;
    });
  };
  addEventListener('scroll', () => requestAnimationFrame(reveal), { passive: true });
  addEventListener('resize', reveal);
  reveal();

  /* WhatsApp flutuante: preencher o número da Axlo para o botão abrir a conversa */
  const WHATSAPP = ''; // ex.: '5511999999999'
  const WA_MSG = 'Olá! Vim pelo site e quero uma cotação de plano de saúde.';
  if (WHATSAPP) $$('.js-wa').forEach(a => { a.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(WA_MSG); a.target = '_blank'; a.rel = 'noopener'; });
  const wa = $('#wa');
  // no celular o botão só aparece depois do slider, para não cobrir o cartão de valores
  const waShow = () => wa.classList.toggle('show', innerWidth > 980 || scrollY > innerHeight * .7);
  addEventListener('scroll', waShow, { passive: true }); addEventListener('resize', waShow); setTimeout(waShow, 1400);
  $('.wa-btn', wa).addEventListener('click', () => { const b = $('.wa-badge', wa); b && b.remove(); });

  /* slider do topo */
  $('#hs') && (() => {
    const hs = $('#hs'), slides = $$('.hs-slide', hs), bars = $$('.hs-bars button', hs);
    const DUR = 7000; let cur = 0, timer;
    slides[0].classList.remove('on'); // o primeiro slide também monta o cartão na entrada
    const show = i => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((s, j) => s.classList.toggle('on', j === cur));
      bars.forEach((b, j) => { b.classList.remove('on'); b.classList.toggle('done', j < cur); b.setAttribute('aria-current', j === cur); });
      void hs.offsetWidth;
      bars[cur].style.setProperty('--t', DUR + 'ms');
      bars[cur].classList.add('on');
      $('.hs-count', hs).textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      $$('[data-count]', slides[cur]).forEach(count);
      clearTimeout(timer);
      if (!reduce) timer = setTimeout(() => show(cur + 1), DUR);
    };
    bars.forEach((b, j) => b.addEventListener('click', () => show(j)));
    $('.prev', hs).addEventListener('click', () => show(cur - 1));
    $('.next', hs).addEventListener('click', () => show(cur + 1));
    let x0 = null, y0 = 0;
    const stage = $('.hs-stage', hs);
    stage.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; });
    stage.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', () => x0 = null);
    document.addEventListener('visibilitychange', () => document.hidden ? clearTimeout(timer) : show(cur));
    setTimeout(() => show(0), 800);
  })();

  /* sliders */
  $$('[data-slider]').forEach(sl => {
    const track = $('.track', sl), slides = [...track.children];
    const dotsEl = $('.dots', sl), prev = $('.prev', sl), next = $('.next', sl);
    const ctrls = $$('.s-ctrl', sl);
    const auto = +sl.dataset.autoplay || 0, bar = $('.q-progress i', sl);
    let pos = [], timer;

    const measure = () => {
      const max = track.scrollWidth - track.clientWidth;
      const base = slides[0].offsetLeft;
      pos = [...new Set(slides.map(s => Math.min(Math.round(s.offsetLeft - base), Math.max(0, Math.round(max)))))];
      if (dotsEl) {
        dotsEl.innerHTML = '';
        pos.forEach((_, i) => {
          const b = document.createElement('button');
          b.type = 'button'; b.setAttribute('aria-label', `Ir para o item ${i + 1}`);
          b.addEventListener('click', () => { go(i); restart(); });
          dotsEl.appendChild(b);
        });
      }
      ctrls.forEach(c => c.hidden = pos.length < 2);
      update();
    };
    const idx = () => {
      const x = track.scrollLeft; let best = 0;
      pos.forEach((p, i) => { if (Math.abs(p - x) < Math.abs(pos[best] - x)) best = i; });
      return best;
    };
    const go = i => track.scrollTo({ left: pos[(i + pos.length) % pos.length], behavior: reduce ? 'auto' : 'smooth' });
    const update = () => {
      const i = idx();
      if (dotsEl) [...dotsEl.children].forEach((d, j) => { d.classList.toggle('on', j === i); d.setAttribute('aria-current', j === i); });
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === pos.length - 1;
    };
    const restart = () => {
      if (!auto || reduce) return;
      clearTimeout(timer);
      if (bar) { bar.classList.remove('run'); void bar.offsetWidth; bar.style.setProperty('--t', auto + 'ms'); bar.classList.add('run'); }
      timer = setTimeout(() => { go(idx() + 1); restart(); }, auto);
    };
    const stop = () => { clearTimeout(timer); if (bar) bar.classList.remove('run'); };

    prev && prev.addEventListener('click', () => go(idx() - 1));
    next && next.addEventListener('click', () => go(idx() + 1));
    let raf; track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    if (auto) {
      sl.addEventListener('mouseenter', stop); sl.addEventListener('mouseleave', restart);
      track.addEventListener('touchstart', stop, { passive: true }); track.addEventListener('touchend', () => setTimeout(restart, 1200));
      new IntersectionObserver(([e]) => e.isIntersecting ? restart() : stop()).observe(sl);
    }
    addEventListener('resize', () => { clearTimeout(sl._r); sl._r = setTimeout(measure, 150); });
    measure();
  });

  /* simulador: stepper, atalhos e slider mexem no mesmo número */
  const range = $('#vidas'), num = $('#vidasN'), txt = $('#simTxt'), quick = $$('.quick button');
  if (range) {
  let vidas = 25;
  const setV = (v, from) => {
    vidas = Math.max(2, Math.min(9999, Math.round(+v || 2)));
    if (from !== 'num') num.value = vidas;
    if (from !== 'range') range.value = Math.min(vidas, 500);
    range.style.setProperty('--fill', (Math.min(vidas, 500) - 2) / 498 * 100 + '%');
    $('#vidasLbl').textContent = vidas === 1 ? 'vida' : 'vidas';
    quick.forEach(b => b.classList.toggle('on', +b.dataset.v === vidas));
    const opts = vidas < 30 ? 6 : vidas < 200 ? 8 : 10;
    const tipo = $('input[name=tipo]:checked').value;
    txt.innerHTML = `Você recebe <b>até ${opts} opções</b> comparadas para <b>${vidas.toLocaleString('pt-BR')} vidas</b> · ${tipo}.`;
  };
  range.addEventListener('input', () => setV(range.value, 'range'));
  num.addEventListener('input', () => { if (num.value !== '') setV(num.value, 'num'); });
  num.addEventListener('blur', () => setV(num.value));
  num.addEventListener('focus', () => num.select());
  quick.forEach(b => b.addEventListener('click', () => setV(b.dataset.v)));
  $$('.stepper button').forEach(b => {
    const d = +b.dataset.step; let t, iv;
    const stop = () => { clearTimeout(t); clearInterval(iv); };
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); setV(vidas + d);
      t = setTimeout(() => iv = setInterval(() => setV(vidas + d * (vidas >= 50 ? 5 : 1)), 70), 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setV(vidas + d); } });
  });
  $$('#sim input[type=radio]').forEach(r => r.addEventListener('change', () => setV(vidas)));
  setV(25);
  $('#sim').addEventListener('submit', e => { e.preventDefault(); $('#toast').hidden = false; });
  }

  /* página de preços: calculadora do plano PME */
  const pr = $('#pr');
  if (pr) {
    const inp = $('#prVidas'), out = $('#prVidasOut'), price = $('#prPrice'), math = $('#prMath'), more = $('#prMore'), custom = $('#prCustom');
    const MAX = 30; // 30 = "30+", vira o plano Empresarial
    // valor médio por vida, só de exemplo (o real depende das idades, cidade e operadora)
    const porVida = n => n <= 4 ? 329 : n <= 9 ? 309 : n <= 19 ? 289 : 269;
    let shown = 0, anim;
    const tween = to => {
      cancelAnimationFrame(anim);
      const from = shown, t0 = performance.now(), dur = reduce ? 0 : 450;
      const step = t => {
        const k = dur ? Math.min(Math.max((t - t0) / dur, 0), 1) : 1, e = 1 - Math.pow(1 - k, 3);
        shown = Math.round(from + (to - from) * e);
        price.textContent = shown.toLocaleString('pt-BR');
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
      setTimeout(() => { if (shown !== to) { shown = to; price.textContent = to.toLocaleString('pt-BR'); } }, dur + 120);
    };
    const set = v => {
      const n = Math.max(2, Math.min(MAX, Math.round(+v)));
      inp.value = n;
      inp.style.setProperty('--fill', (n - 2) / (MAX - 2) * 100 + '%');
      const big = n >= MAX;
      out.textContent = big ? '30+ vidas' : n + ' vidas';
      custom.classList.toggle('hl', big);
      more.textContent = big ? 'Com 30 vidas ou mais, o plano Empresarial sai melhor. Veja ao lado →' : '';
      if (big) { math.textContent = 'Acima de 29 vidas as condições são negociadas.'; return; }
      const pv = porVida(n);
      tween(pv * n);
      math.textContent = 'R$ ' + pv + ' × ' + n + ' vidas · média por vida (exemplo)';
    };
    inp.addEventListener('input', () => set(inp.value));
    $$('[data-pstep]', pr).forEach(b => {
      const d = +b.dataset.pstep; let t, iv;
      const stop = () => { clearTimeout(t); clearInterval(iv); };
      b.addEventListener('pointerdown', e => { e.preventDefault(); set(+inp.value + d); t = setTimeout(() => iv = setInterval(() => set(+inp.value + d), 90), 380); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(+inp.value + d); } });
    });
    set(inp.value);
  }
})();
