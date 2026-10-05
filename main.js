/* ==========================================================================
   Bufete Jurídico Pericial Landa y Asociados | main.js
   Sin dependencias. Sin listeners de scroll: se usa IntersectionObserver
   y CSS scroll-driven (barra de progreso y parallax) como mejora progresiva.
   Todo movimiento respeta prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Configuración ---------- */
  const WA_NUMBER  = '527131052955'; // +52 713 105 2955
  const WA_DEFAULT = 'Hola, quisiera agendar una consulta con Landa y Asociados.';

  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js', 'js-ok');

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)');
  const waUrl = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  /* Cada módulo corre aislado: si uno falla, el resto del sitio sigue funcionando. */
  const safe = (fn) => { try { return fn(); } catch (err) { console.error('[landa]', err); } };

  /* ==========================================================================
     1. WhatsApp: enlaces con mensaje precargado y aviso del botón flotante
     ========================================================================== */
  const initWhatsApp = () => {
    $$('[data-wa]').forEach((a) => { a.href = waUrl(a.dataset.waText || WA_DEFAULT); });

    const float = $('#waFloat');
    if (!float) return;
    setTimeout(() => {
      float.classList.add('is-hint');
      setTimeout(() => float.classList.remove('is-hint'), 4500);
    }, 8000);
  };

  /* ==========================================================================
     2. Loader: anillo de progreso real (fuentes, imagen del hero y load)
     ========================================================================== */
  const initLoader = () => new Promise((resolve) => {
    const loader = $('#loader');
    const bar = $('#loaderBar');
    const pct = $('#loaderPct');
    if (!loader || !bar || !pct) { root.classList.add('is-ready'); return resolve(); }

    root.classList.add('is-loading');

    const CIRC = 2 * Math.PI * 52;
    const minTime = reduceMotion.matches ? 400 : 1800;
    const heroSrc = window.matchMedia('(min-width: 900px)').matches
      ? 'img/hero-justicia-lg.jpg'
      : 'img/hero-justicia-sm.jpg';

    let assetsDone = false;
    Promise.all([
      new Promise((r) => { const img = new Image(); img.onload = img.onerror = r; img.src = heroSrc; }),
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })))
    ]).then(() => { assetsDone = true; });
    setTimeout(() => { assetsDone = true; }, 4500); // tope para redes lentas

    const t0 = performance.now();
    let last = t0;
    let shown = 0;

    const finish = () => {
      bar.style.strokeDashoffset = 0;
      pct.textContent = '100';
      loader.classList.add('is-done');
      root.classList.remove('is-loading');
      setTimeout(() => { root.classList.add('is-ready'); resolve(); }, 350);
      setTimeout(() => loader.classList.add('is-gone'), 1700);
    };

    const tick = (now) => {
      const elapsed = now - t0;
      const dt = now - last;
      last = now;

      const simulated = Math.min(92, (elapsed / minTime) * 92);
      const target = assetsDone && elapsed >= minTime ? 100 : simulated;
      shown += (target - shown) * Math.min(1, dt * 0.009);

      bar.style.strokeDashoffset = String(CIRC * (1 - shown / 100));
      pct.textContent = String(Math.round(shown));

      if (target === 100 && shown > 99.3) return finish();
      requestAnimationFrame(tick);
    };
    bar.style.strokeDasharray = String(CIRC);
    bar.style.strokeDashoffset = String(CIRC);
    requestAnimationFrame(tick);

    // Seguro adicional: nunca dejar el sitio bloqueado
    setTimeout(() => { if (!loader.classList.contains('is-done')) finish(); }, 9000);
  });

  /* ==========================================================================
     3. Header (sombra al bajar) y menú móvil accesible
     ========================================================================== */
  const initHeader = () => {
    const header = $('#header');
    if (header && 'IntersectionObserver' in window) {
      const sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:28px;pointer-events:none';
      document.body.prepend(sentinel);
      new IntersectionObserver(([entry]) => {
        header.classList.toggle('is-scrolled', !entry.isIntersecting);
      }).observe(sentinel);
    }

    const btn = $('#menuBtn');
    const menu = $('#menu');
    if (!btn || !menu) return;

    const setMenu = (open) => {
      menu.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      if (open) {
        const first = $('.menu__link', menu);
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 350);
      }
    };
    const isOpen = () => menu.classList.contains('is-open');

    btn.addEventListener('click', () => setMenu(!isOpen()));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setMenu(false); btn.focus(); return; }
      if (e.key === 'Tab') {
        const items = [btn, ...$$('a', menu)];
        const first = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    });

    window.matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  };

  /* ==========================================================================
     4. Revelado al hacer scroll (IntersectionObserver)
     ========================================================================== */
  const initReveal = () => {
    const els = $$('[data-reveal], [data-step]');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  };

  /* ==========================================================================
     5. Titular rotatorio del hero (especialidades)
     ========================================================================== */
  const initRotator = () => {
    const rot = $('#rotator');
    const hero = $('.hero');
    if (!rot || !hero) return; // rota tambien con "reducir movimiento": ahi el cambio es directo, sin deslizamiento

    const words = (rot.dataset.words || '').split('|').filter(Boolean);
    const el = rot.firstElementChild;
    if (words.length < 2 || !el) return;

    let index = 0;
    let timer = 0;
    let inView = true;
    let armed = false; // el primer cambio ocurre unos segundos despues de mostrar el titular completo

    const swap = () => {
      index = (index + 1) % words.length;
      if (reduceMotion.matches) { el.textContent = words[index]; return; }
      el.classList.add('is-out');
      setTimeout(() => {
        el.textContent = words[index];
        el.classList.remove('is-out');
        el.classList.add('is-pre');
        void el.offsetWidth; // fuerza reflow para reiniciar la transición
        el.classList.remove('is-pre');
      }, 560);
    };
    const start = () => { if (armed && !timer && inView && !document.hidden) timer = setInterval(swap, 2800); };
    const stop = () => { clearInterval(timer); timer = 0; };

    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      inView ? start() : stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    setTimeout(() => { armed = true; start(); }, 2600);
  };

  /* ==========================================================================
     6. Partículas del hero (canvas ligero, pausado fuera de pantalla)
     ========================================================================== */
  const initParticles = () => {
    const canvas = $('#heroCanvas');
    const hero = $('.hero');
    if (!canvas || !hero || reduceMotion.matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const small = window.matchMedia('(max-width: 767px)');
    const COLORS = ['42,58,148', '61,82,196'];
    const LINK = 110;

    let w = 0, h = 0, raf = 0, last = 0, visible = true;
    let parts = [];
    const mouse = { x: -999, y: -999 };

    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.7 + Math.random() * 1.9,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -(0.08 + Math.random() * 0.26),
      a: 0.18 + Math.random() * 0.4,
      ph: Math.random() * Math.PI * 2,
      tw: 0.6 + Math.random() * 1.2,
      c: COLORS[Math.random() < 0.7 ? 0 : 1]
    });

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(56, Math.max(16, w / (small.matches ? 22 : 28))));
      parts = Array.from({ length: count }, () => spawn(true));
    };

    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(50, t - last || 16);
      last = t;
      const k = dt / 16.67;
      ctx.clearRect(0, 0, w, h);

      for (const p of parts) {
        p.x += (p.vx + Math.sin(t * 0.0004 * p.tw + p.ph) * 0.12) * k;
        p.y += p.vy * k;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 120) * 1.2 * k;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
        if (p.y < -10 || p.x < -10 || p.x > w + 10) Object.assign(p, spawn(false));

        const alpha = p.a * (0.65 + 0.35 * Math.sin(t * 0.001 * p.tw + p.ph));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.c},${alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
        if (p.r > 1.9) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${p.c},${alpha * 0.16})`;
          ctx.arc(p.x, p.y, p.r * 4, 0, 6.2832);
          ctx.fill();
        }
      }

      if (small.matches) return;
      ctx.lineWidth = 1;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = dx * dx + dy * dy;
          if (d < LINK * LINK) {
            ctx.strokeStyle = `rgba(42,58,148,${(1 - Math.sqrt(d) / LINK) * 0.14})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
    };

    const run = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
    const halt = () => { cancelAnimationFrame(raf); raf = 0; };

    resize();
    new ResizeObserver(resize).observe(hero);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? run() : halt(); }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? halt() : run()));

    if (finePointer.matches) {
      hero.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    }
    run();
  };

  /* ==========================================================================
     7. Parallax del hero con el puntero (variables CSS --mx / --my)
     ========================================================================== */
  const initHeroParallax = () => {
    const hero = $('.hero');
    if (!hero || !finePointer.matches || reduceMotion.matches) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      hero.style.setProperty('--mx', cx.toFixed(3));
      hero.style.setProperty('--my', cy.toFixed(3));
      raf = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      kick();
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  };

  /* ==========================================================================
     8. Contadores animados
     ========================================================================== */
  const initCounters = () => {
    const els = $$('[data-count]');
    if (!els.length || reduceMotion.matches || !('IntersectionObserver' in window)) return;

    const run = (el) => {
      const end = Number(el.dataset.count) || 0;
      const dur = 1700;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 4))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    els.forEach((el) => { el.textContent = '0'; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  };

  /* ==========================================================================
     9. Áreas de práctica: pestañas accesibles (flechas, Home, End)
     ========================================================================== */
  const initTabs = () => {
    const tabs = $$('[role="tab"]');
    if (!tabs.length) return;
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const strip = tabs[0].parentElement;

    const select = (i, focus) => {
      tabs.forEach((tab, k) => {
        const on = k === i;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
        panels[k].classList.toggle('is-active', on);
      });
      if (focus) tabs[i].focus();
      if (strip.scrollWidth > strip.clientWidth + 2) {
        const t = tabs[i];
        strip.scrollTo({
          left: t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2,
          behavior: reduceMotion.matches ? 'auto' : 'smooth'
        });
      }
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i, false));
      tab.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (e.key in keys) { e.preventDefault(); select((i + keys[e.key] + tabs.length) % tabs.length, true); }
        else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });

    // Enlaces del footer que abren un área concreta
    $$('[data-area]').forEach((link) => {
      link.addEventListener('click', () => {
        const idx = tabs.findIndex((t) => t.id === `tab-${link.dataset.area}`);
        if (idx >= 0) select(idx, false);
      });
    });
  };

  /* ==========================================================================
     10. Preguntas frecuentes (acordeón de una sola apertura)
     ========================================================================== */
  const initAccordion = () => {
    const buttons = $$('.acc__btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.acc__item');
        const open = !item.classList.contains('is-open');
        $$('.acc__item.is-open').forEach((other) => {
          if (other === item) return;
          other.classList.remove('is-open');
          $('.acc__btn', other).setAttribute('aria-expanded', 'false');
        });
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  };

  /* ==========================================================================
     11. Enlace activo del menú según la sección visible
     ========================================================================== */
  const initScrollSpy = () => {
    const links = $$('.nav__link');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
    const active = new Set();

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? active.add(e.target.id) : active.delete(e.target.id)));
      links.forEach((l) => l.removeAttribute('aria-current'));
      const id = Array.from(active).pop();
      if (id && map.has(id)) map.get(id).setAttribute('aria-current', 'true');
    }, { rootMargin: '-45% 0px -50% 0px' });

    map.forEach((_, id) => { const section = document.getElementById(id); if (section) io.observe(section); });
  };

  /* ==========================================================================
     12. Microinteracciones de puntero: botones magnéticos y spotlight
     ========================================================================== */
  const initPointerFx = () => {
    if (!finePointer.matches || reduceMotion.matches) return;

    $$('.btn--magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / r.width;
        const y = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.setProperty('--tx', `${(x * 10).toFixed(1)}px`);
        btn.style.setProperty('--ty', `${(y * 8).toFixed(1)}px`);
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.removeProperty('--tx');
        btn.style.removeProperty('--ty');
      });
    });

    $$('.cell').forEach((cell) => {
      cell.addEventListener('pointermove', (e) => {
        const r = cell.getBoundingClientRect();
        cell.style.setProperty('--x', `${e.clientX - r.left}px`);
        cell.style.setProperty('--y', `${e.clientY - r.top}px`);
      });
    });
  };

  /* ==========================================================================
     13. Formulario: validación en línea y envío a WhatsApp
     ========================================================================== */
  const initForm = () => {
    const form = $('#contactForm');
    if (!form) return;

    const status = $('#formStatus');
    const fields = { nombre: $('#f-nombre'), telefono: $('#f-tel'), mensaje: $('#f-mensaje') };
    const errorIds = { nombre: 'e-nombre', telefono: 'e-tel', mensaje: 'e-mensaje' };
    const digits = (v) => v.replace(/\D/g, '');

    const rules = {
      nombre: (v) => (v.trim().length >= 3 ? '' : 'Escribe tu nombre completo.'),
      telefono: (v) => (!v.trim() || (digits(v).length >= 10 && digits(v).length <= 13) ? '' : 'Revisa tu teléfono: debe tener 10 dígitos.'),
      mensaje: (v) => (v.trim().length >= 10 ? '' : 'Cuéntanos brevemente tu caso (mínimo 10 caracteres).')
    };

    const validate = (key) => {
      const field = fields[key];
      const message = rules[key](field.value);
      field.closest('.field').dataset.invalid = message ? 'true' : 'false';
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
      document.getElementById(errorIds[key]).textContent = message;
      return !message;
    };

    Object.keys(fields).forEach((key) => {
      fields[key].addEventListener('blur', () => validate(key));
      fields[key].addEventListener('input', () => {
        if (fields[key].closest('.field').dataset.invalid === 'true') validate(key);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.textContent = '';

      const keys = Object.keys(fields);
      const valid = keys.map(validate);
      if (valid.includes(false)) {
        fields[keys[valid.indexOf(false)]].focus();
        status.textContent = 'Revisa los campos marcados para continuar.';
        return;
      }

      const nombre = fields.nombre.value.trim();
      const tel = fields.telefono.value.trim();
      const mensaje = fields.mensaje.value.trim();
      const materia = form.elements.materia.value;

      const text = [
        `Hola, soy ${nombre}.`,
        materia ? `Quisiera una consulta sobre un asunto ${materia}.` : 'Quisiera una consulta con Landa y Asociados.',
        `Mi caso: ${mensaje}`,
        tel ? `Mi teléfono: ${tel}` : '',
        'Enviado desde el sitio web.'
      ].filter(Boolean).join('\n');

      const url = waUrl(text);
      const opener = document.createElement('a');
      opener.href = url;
      opener.target = '_blank';
      opener.rel = 'noopener';
      document.body.appendChild(opener);
      opener.click();
      opener.remove();

      const fallback = document.createElement('a');
      fallback.href = url;
      fallback.target = '_blank';
      fallback.rel = 'noopener';
      fallback.textContent = 'toca aquí';
      status.textContent = 'Listo. Se abrió WhatsApp con tu mensaje. Si no se abrió, ';
      status.append(fallback, '.');
    });
  };

  /* ==========================================================================
     Arranque
     ========================================================================== */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  [initWhatsApp, initHeader, initReveal, initCounters, initTabs, initAccordion,
   initScrollSpy, initPointerFx, initHeroParallax, initForm].forEach(safe);

  // El loader resuelve cuando la página ya es visible; entonces arrancan las animaciones constantes del hero.
  Promise.resolve(safe(initLoader)).then(() => {
    root.classList.remove('is-loading');
    root.classList.add('is-ready'); // idempotente: garantiza que el contenido nunca quede oculto
    safe(initRotator);
    safe(initParticles);
  });
})();
