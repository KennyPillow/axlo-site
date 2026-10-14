// AXLO · comportamento do site. Sem dependências.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CFG = window.AXLO || {};
  const store = {
    get(k, s = localStorage) { try { return JSON.parse(s.getItem(k)); } catch { return null; } },
    set(k, v, s = localStorage) { try { s.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } },
  };
  const push = (event, data = {}) => { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event, ...data }); };

  /* ---------- origem da visita (UTM, gclid, fbclid, referrer) ---------- */
  const qs = new URLSearchParams(location.search);
  const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
  const fromUrl = Object.fromEntries(KEYS.filter(k => qs.get(k)).map(k => [k, qs.get(k).slice(0, 200)]));
  const ref = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer.slice(0, 300) : '';
  if (Object.keys(fromUrl).length || ref) {
    const touch = { ...fromUrl, referrer: ref, landing: location.pathname, at: new Date().toISOString() };
    if (!store.get('axlo_first')) store.set('axlo_first', touch);
    store.set('axlo_last', touch);
  } else if (!store.get('axlo_first')) {
    store.set('axlo_first', { referrer: '', landing: location.pathname, at: new Date().toISOString() });
  }
  const tracking = () => {
    const first = store.get('axlo_first') || {}, last = store.get('axlo_last') || first;
    return { ...last, first_source: first.utm_source || (first.referrer ? 'referral' : 'direto'), first_landing: first.landing || '', first_at: first.at || '' };
  };
  const origemTexto = () => {
    const t = tracking();
    return [t.utm_source || (t.gclid ? 'google-ads' : t.referrer ? new URL(t.referrer).hostname : 'site'), t.utm_campaign].filter(Boolean).join('/');
  };

  /* ---------- cabeçalho e progresso ---------- */
  const header = $('.site-header'), prog = $('.progress');
  let tick = false;
  const onScroll = () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      header && header.classList.toggle('scrolled', y > 8);
      prog && prog.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);
      reveal();
      waShow();
      tick = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- menu (mega no desktop, gaveta no celular) ---------- */
  const megas = $$('.has-mega');
  const closeMegas = except => megas.forEach(m => { if (m !== except) { m.classList.remove('open'); $('.menu-btn', m).setAttribute('aria-expanded', 'false'); } });
  megas.forEach(m => {
    const btn = $('.menu-btn', m);
    let t;
    const open = () => { clearTimeout(t); closeMegas(m); m.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); };
    const close = () => { t = setTimeout(() => { m.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }, 160); };
    btn.addEventListener('click', () => m.classList.contains('open') ? close() : open());
    m.addEventListener('mouseenter', () => matchMedia('(hover:hover)').matches && open());
    m.addEventListener('mouseleave', () => matchMedia('(hover:hover)').matches && close());
    m.addEventListener('focusout', e => { if (!m.contains(e.relatedTarget)) close(); });
  });
  const burger = $('.burger');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger && burger.setAttribute('aria-expanded', open);
    burger && burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  burger && burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#drawer a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeMegas(); setBell(false); } });

  /* ---------- sino de novidades ---------- */
  const bell = $('.bell'), panel = $('#bellPanel');
  let seen = store.get('axlo_novidades_vistas', sessionStorage), ringT;
  const setBell = open => {
    if (!bell) return;
    panel.hidden = !open;
    bell.setAttribute('aria-expanded', open);
    if (open && !seen) { seen = true; store.set('axlo_novidades_vistas', true, sessionStorage); clearInterval(ringT); const d = $('.bell-dot'); d && d.remove(); }
  };
  if (bell) {
    if (seen) { const d = $('.bell-dot'); d && d.remove(); }
    const ring = () => { if (seen || reduce) return; bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring'); };
    setTimeout(ring, 2000); ringT = setInterval(ring, 10000);
    bell.addEventListener('click', e => { e.stopPropagation(); setBell(panel.hidden); });
    document.addEventListener('click', e => { if (!panel.hidden && !e.target.closest('.bell-wrap')) setBell(false); });
  }

  /* ---------- contadores e revelar ao rolar ---------- */
  const fmt = n => Number(n).toLocaleString('pt-BR');
  const count = el => {
    const end = +el.dataset.count;
    if (reduce || !end) { el.textContent = fmt(end); return; }
    const t0 = performance.now(), dur = 1400, run = el._run = {};
    const step = t => {
      if (el._run !== run) return;
      const k = Math.min(Math.max((t - t0) / dur, 0), 1);
      el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => { if (el._run === run) el.textContent = fmt(end); }, dur + 150);
  };
  let pending = $$('.rv, .dash');
  function reveal() {
    const limit = innerHeight * 0.92;
    pending = pending.filter(el => {
      if (el.getBoundingClientRect().top > limit) return true;
      el.classList.add('in');
      if (!el.closest('.hs')) $$('[data-count]', el).forEach(count);
      return false;
    });
  }
  addEventListener('resize', reveal);
  reveal();

  /* ---------- slider do topo ---------- */
  const hs = $('#hs');
  if (hs) {
    const slides = $$('.hs-slide', hs), bars = $$('.hs-bars button', hs), counter = $('.hs-count', hs);
    const DUR = 7000; let cur = 0, timer;
    const show = i => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((s, j) => { s.classList.toggle('on', j === cur); s.setAttribute('aria-hidden', j !== cur); });
      bars.forEach((b, j) => { b.classList.remove('on'); b.classList.toggle('done', j < cur); b.setAttribute('aria-current', j === cur); });
      void hs.offsetWidth;
      bars[cur].style.setProperty('--t', DUR + 'ms');
      bars[cur].classList.add('on');
      if (counter) counter.textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      $$('[data-count]', slides[cur]).forEach(count);
      clearTimeout(timer);
      if (!reduce) timer = setTimeout(() => show(cur + 1), DUR);
    };
    bars.forEach((b, j) => b.addEventListener('click', () => show(j)));
    const prev = $('.prev', hs), next = $('.next', hs);
    prev && prev.addEventListener('click', () => show(cur - 1));
    next && next.addEventListener('click', () => show(cur + 1));
    const stage = $('.hs-stage', hs);
    let x0 = null, y0 = 0;
    stage.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; });
    stage.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', () => { x0 = null; });
    document.addEventListener('visibilitychange', () => document.hidden ? clearTimeout(timer) : show(cur));
    show(0); // o primeiro slide já vem visível no HTML; aqui só contam os números e começa o tempo
  }

  /* ---------- WhatsApp: abre a conversa com a origem marcada ---------- */
  const wa = $('.wa');
  function waShow() { if (wa) wa.classList.toggle('show', innerWidth > 640 || scrollY > innerHeight * 0.7); }
  const waLink = origem => {
    const msg = `${CFG.whatsappMensagem || 'Olá!'}\n\n(ref: ${origemTexto()} · ${location.pathname}${origem ? ' · ' + origem : ''})`;
    return `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg)}`;
  };
  $$('.js-wa').forEach(a => {
    if (!CFG.whatsapp) { a.href = (CFG.base || '') + '/contato'; return; }
    a.target = '_blank'; a.rel = 'noopener';
    const upd = () => { a.href = waLink(a.dataset.origem); };
    upd();
    a.addEventListener('pointerdown', upd);
    a.addEventListener('click', () => { upd(); push('whatsapp_click', { origem: a.dataset.origem || '', pagina: location.pathname, ...tracking() }); });
  });
  waShow();

  /* ---------- formulários de diagnóstico ---------- */
  const maskPhone = v => {
    const d = v.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };
  const validators = {
    nome: v => v.trim().length >= 3,
    empresa: v => v.trim().length >= 2,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    telefone: v => v.replace(/\D/g, '').length >= 10,
    cargo: v => !!v, colaboradores: v => !!v, interesse: v => !!v,
  };
  $$('.lead-form').forEach(form => {
    const started = Date.now();
    const tel = form.elements.telefone;
    tel && tel.addEventListener('input', () => { tel.value = maskPhone(tel.value); });
    const err = $('.lf-error', form), btn = $('button[type=submit]', form);
    let begun = false;
    form.addEventListener('focusin', () => { if (!begun) { begun = true; push('form_start', { origem: form.dataset.origem }); } });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.hidden = true;
      let ok = true, first = null;
      for (const [name, fn] of Object.entries(validators)) {
        const el = form.elements[name]; if (!el) continue;
        const good = fn(el.value);
        el.closest('.field').classList.toggle('err', !good);
        el.setAttribute('aria-invalid', !good);
        if (!good) { ok = false; first = first || el; }
      }
      const consent = form.elements.consentimento;
      consent.closest('.check').classList.toggle('err', !consent.checked);
      if (!consent.checked) { ok = false; first = first || consent; }
      if (!ok) { err.textContent = 'Confira os campos destacados e aceite a política de privacidade para enviar.'; err.hidden = false; first.focus(); return; }

      const data = Object.fromEntries(new FormData(form));
      delete data.consentimento;
      const payload = { ...data, consentimento: true, origem: form.dataset.origem, pagina: location.pathname, titulo: document.title, tracking: tracking(), tempo: Math.round((Date.now() - started) / 1000) };
      btn.disabled = true; const label = btn.innerHTML; btn.textContent = 'Enviando…';
      try {
        if (CFG.preview) throw new Error('preview');
        const res = await fetch((CFG.base || '') + '/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.erro || 'falha');
        push('generate_lead', { origem: form.dataset.origem, interesse: data.interesse, colaboradores: data.colaboradores, cargo: data.cargo, ...tracking() });
        const box = $('.lf-ok', form); box.hidden = false; box.focus();
        form.reset();
      } catch (ex) {
        err.textContent = ex.message === 'preview'
          ? 'Esta é a versão de prévia: o envio fica ativo quando o site for publicado no domínio da AXLO.'
          : `Não conseguimos enviar agora. Tente de novo em instantes${CFG.whatsapp ? ' ou fale pelo WhatsApp' : ` ou ligue para nós`}.`;
        err.hidden = false;
      } finally {
        btn.disabled = false; btn.innerHTML = label;
      }
    });
  });

  /* ---------- cookies (LGPD) com Consent Mode do Google ---------- */
  const banner = $('#cookie');
  if (banner) {
    const prefs = $('.cookie-prefs', banner);
    const apply = c => {
      store.set('axlo_consent', { ...c, at: new Date().toISOString() });
      if (typeof gtag === 'function') gtag('consent', 'update', { analytics_storage: c.medicao ? 'granted' : 'denied', ad_storage: c.marketing ? 'granted' : 'denied', ad_user_data: c.marketing ? 'granted' : 'denied', ad_personalization: c.marketing ? 'granted' : 'denied' });
      push('consent_update', { consent_medicao: c.medicao, consent_marketing: c.marketing });
      banner.hidden = true;
    };
    const open = (showPrefs = false) => {
      const c = store.get('axlo_consent') || {};
      $('#ck-medicao').checked = !!c.medicao; $('#ck-marketing').checked = !!c.marketing;
      prefs.hidden = !showPrefs; banner.hidden = false;
    };
    if (!store.get('axlo_consent') && !qs.has('shot')) setTimeout(() => open(false), 800);
    banner.addEventListener('click', e => {
      const b = e.target.closest('[data-cookie]'); if (!b) return;
      if (b.dataset.cookie === 'aceitar') apply({ medicao: true, marketing: true });
      if (b.dataset.cookie === 'recusar') apply({ medicao: false, marketing: false });
      if (b.dataset.cookie === 'prefs') prefs.hidden = !prefs.hidden;
    });
    prefs.addEventListener('submit', e => { e.preventDefault(); apply({ medicao: $('#ck-medicao').checked, marketing: $('#ck-marketing').checked }); });
    $$('.js-cookie-prefs').forEach(b => b.addEventListener('click', () => open(true)));
  }

  onScroll();
})();
