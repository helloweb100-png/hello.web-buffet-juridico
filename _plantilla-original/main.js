/* ============================================================
   OSCAR HERNANDEZ GOMEZ — main.js
   Animaciones Big Tech — JavaScript nativo puro
   Sin librerías externas — requestAnimationFrame + CSS vars
   ============================================================ */

'use strict';

/* ============================================================
   UTILIDADES
   ============================================================ */

/** Clamp un valor entre min y max */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/** Interpolación lineal */
const lerp = (a, b, t) => a + (b - a) * t;

/** Ejecutar función cuando el DOM esté listo */
const ready = (fn) =>
  document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn);


/* ============================================================
   1. LOADER — Pantalla de carga premium
   ============================================================ */
const Loader = (() => {
  const el    = document.getElementById('page-loader');
  const bar   = document.getElementById('loader-bar');
  let progress = 0;
  let raf;

  /** Anima la barra de progreso suavemente hasta el target */
  function animateBar(target, speed = 0.04) {
    cancelAnimationFrame(raf);
    const tick = () => {
      progress = lerp(progress, target, speed);
      if (bar) bar.style.width = `${Math.min(progress, 100)}%`;
      if (progress < target - 0.5) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function start() {
    // Simular progreso de carga
    animateBar(70, 0.035);
  }

  function finish() {
    cancelAnimationFrame(raf);
    animateBar(100, 0.06);

    setTimeout(() => {
      if (el) el.classList.add('is-hidden');
    }, 350);

    setTimeout(() => {
      if (el) el.remove();
    }, 1300);
  }

  return { start, finish };
})();


/* ============================================================
   2. CANVAS — Red de partículas flotantes
   ============================================================ */
const ParticleCanvas = (() => {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return { init: () => {} };

  const ctx     = canvas.getContext('2d');
  let W, H, raf;
  let particles = [];
  let mouseX = -9999, mouseY = -9999;
  let isRunning = false;

  const PARTICLE_COUNT = 60;
  const CONNECT_DIST   = 130;
  const MOUSE_REPEL    = 100;

  const COLORS = [
    'rgba(184,150,46,',
    'rgba(212,175,90,',
    'rgba(140,140,140,',
    'rgba(192,192,192,',
  ];

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width  = rect.width;
    H = canvas.height = rect.height;
  }

  function createParticle() {
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      vx:   (Math.random() - 0.5) * 0.35,
      vy:   (Math.random() - 0.5) * 0.35,
      r:    Math.random() * 1.8 + 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.5 + 0.15,
      pulse: Math.random() * Math.PI * 2, // fase aleatoria para pulso
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, createParticle);

    window.addEventListener('resize', () => { resize(); }, { passive: true });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }, { passive: true });

    canvas.addEventListener('mouseleave', () => {
      mouseX = -9999; mouseY = -9999;
    }, { passive: true });

    // Aparece con fade
    canvas.classList.add('is-visible');
    run();
  }

  function run() {
    isRunning = true;
    loop();
  }

  function loop() {
    if (!isRunning) return;
    raf = requestAnimationFrame(loop);

    ctx.clearRect(0, 0, W, H);

    const time = performance.now() * 0.001;

    particles.forEach((p, i) => {
      // Pulso de opacidad
      p.pulse += 0.012;
      const opacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));

      // Repulsión del mouse
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_REPEL) {
        const force = (1 - dist / MOUSE_REPEL) * 0.8;
        p.vx += (dx / dist) * force * 0.08;
        p.vy += (dy / dist) * force * 0.08;
      }

      // Amortiguación de velocidad
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Velocidad base
      p.x += p.vx + Math.sin(time * 0.4 + i * 0.6) * 0.08;
      p.y += p.vy + Math.cos(time * 0.3 + i * 0.5) * 0.06;

      // Wrap en los bordes
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      // Dibujar partícula
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + opacity + ')';
      ctx.fill();

      // Conectar partículas cercanas
      for (let j = i + 1; j < particles.length; j++) {
        const p2   = particles[j];
        const ex   = p.x - p2.x;
        const ey   = p.y - p2.y;
        const d    = Math.sqrt(ex * ex + ey * ey);
        if (d < CONNECT_DIST) {
          const lineOpacity = (1 - d / CONNECT_DIST) * 0.18;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(184,150,46,${lineOpacity})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    });
  }

  function stop() {
    isRunning = false;
    cancelAnimationFrame(raf);
  }

  return { init, stop };
})();


/* ============================================================
   3. SECUENCIADOR DE ENTRADA — Hero Section
   Reemplaza Anime.js con una cola de transiciones nativas
   ============================================================ */
const HeroSequencer = (() => {
  const queue = [];

  /**
   * Agrega un paso a la secuencia
   * @param {Function} fn   — función que ejecuta el paso
   * @param {number}   delay — retardo en ms desde el paso anterior
   */
  function add(fn, delay = 0) {
    queue.push({ fn, delay });
    return api;
  }

  /** Ejecuta la secuencia en orden */
  function run() {
    let elapsed = 0;
    queue.forEach(({ fn, delay }) => {
      elapsed += delay;
      setTimeout(fn, elapsed);
    });
  }

  const api = { add, run };
  return api;
})();


/* ============================================================
   4. PARALLAX DEL MOUSE — Hero
   ============================================================ */
const MouseParallax = (() => {
  const section = document.getElementById('inicio');
  const bgImg   = document.getElementById('hero-parallax-img');
  const scene   = document.getElementById('hero-scene');

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let raf;

  function onMove(e) {
    const rect = section.getBoundingClientRect();
    // Normalizado -0.5 a 0.5
    targetX = ((e.clientX - rect.left) / rect.width  - 0.5);
    targetY = ((e.clientY - rect.top)  / rect.height - 0.5);
  }

  function onLeave() {
    targetX = 0; targetY = 0;
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    currentX = lerp(currentX, targetX, 0.06);
    currentY = lerp(currentY, targetY, 0.06);

    // Parallax suave en la imagen de fondo
    if (bgImg) {
      bgImg.style.transform = `translate(${currentX * 18}px, ${currentY * 12}px) scale(1.08)`;
    }

    // Efecto 3D sutil en el grupo de cards
    if (scene) {
      scene.style.transform =
        `perspective(900px)
         rotateY(${currentX * -6}deg)
         rotateX(${currentY * 4}deg)
         translateZ(0)`;
    }
  }

  function init() {
    if (!section) return;
    section.addEventListener('mousemove', onMove,  { passive: true });
    section.addEventListener('mouseleave', onLeave, { passive: true });
    loop();
  }

  return { init };
})();


/* ============================================================
   5. TILT 3D EN CADA CARD
   ============================================================ */
const CardTilt = (() => {
  function applyTilt(card) {
    const MAX_TILT = 12;

    card.addEventListener('mousemove', (e) => {
      const rect   = card.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const dx     = e.clientX - cx;
      const dy     = e.clientY - cy;
      const tiltX  = clamp(-dy / (rect.height / 2) * MAX_TILT, -MAX_TILT, MAX_TILT);
      const tiltY  = clamp( dx / (rect.width  / 2) * MAX_TILT, -MAX_TILT, MAX_TILT);

      card.style.transform =
        `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(10px)`;
      card.style.transition = 'transform 0.15s ease, box-shadow 0.4s ease, border-color 0.4s ease';

      // Mover el glow siguiendo el cursor dentro de la card
      const glow = card.querySelector('.hcard-glow');
      if (glow) {
        const px = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
        const py = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
        glow.style.background =
          `radial-gradient(circle at ${px}% ${py}%, rgba(184,150,46,0.18), transparent 65%)`;
        glow.style.opacity = '1';
      }
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      card.style.transform  = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
      card.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, border-color 0.4s ease';
      const glow = card.querySelector('.hcard-glow');
      if (glow) glow.style.opacity = '0';
    }, { passive: true });
  }

  function init() {
    document.querySelectorAll('[data-tilt]').forEach(applyTilt);
  }

  return { init };
})();


/* ============================================================
   6. COUNTER ANIMATION
   ============================================================ */
const Counter = (() => {
  function animateOne(el) {
    const target  = parseInt(el.dataset.target);
    const suffix  = el.dataset.suffix || '';
    const duration = 1800;
    const start   = performance.now();

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(now) {
      const elapsed = now - start;
      const progress = clamp(elapsed / duration, 0, 1);
      el.textContent = Math.floor(easeOut(progress) * target) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function init() {
    const targets = document.querySelectorAll('.hero-stat__number');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateOne(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    targets.forEach(el => observer.observe(el));
  }

  return { init };
})();


/* ============================================================
   7. BARRAS ANIMADAS DE CARDS
   ============================================================ */
function animateCardBars() {
  // Barra de progreso en la card principal
  const fill = document.querySelector('.hcard-progress-fill');
  if (fill) {
    const w = fill.dataset.width || 80;
    setTimeout(() => { fill.style.width = w + '%'; }, 300);
  }

  // Barras verticales en la card de métricas
  document.querySelectorAll('.hcard-bar').forEach(bar => {
    const h = bar.dataset.h || 50;
    setTimeout(() => { bar.style.height = h + '%'; }, 500);
  });

  // Sparkline
  const path = document.querySelector('.sparkline-path');
  if (path) setTimeout(() => path.classList.add('is-drawn'), 600);
}


/* ============================================================
   8. SCROLL REVEAL — Intersection Observer
   ============================================================ */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-card')
    .forEach(el => observer.observe(el));
}


/* ============================================================
   9. NAVBAR
   ============================================================ */
function initNavbar() {
  const navbar  = document.getElementById('navbar');
  const toggle  = document.getElementById('menu-toggle');
  const menu    = document.getElementById('mobile-menu');
  const lines   = document.querySelectorAll('.hamburger-line');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('main section[id]');
  let menuOpen = false;

  // Scroll → clase is-scrolled
  const onScroll = () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // Toggle menú móvil
  toggle.addEventListener('click', () => {
    menuOpen = !menuOpen;
    menu.classList.toggle('is-open', menuOpen);
    menu.setAttribute('aria-hidden', String(!menuOpen));

    // Animar hamburger con CSS
    if (menuOpen) {
      lines[0].style.transform = 'translateY(6px) rotate(45deg)';
      lines[1].style.opacity   = '0';
      lines[2].style.transform = 'translateY(-6px) rotate(-45deg)';
    } else {
      lines[0].style.transform = '';
      lines[1].style.opacity   = '';
      lines[2].style.transform = '';
    }
  });

  // Cerrar menú al hacer clic en link
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menuOpen = false;
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      lines.forEach(l => { l.style.transform = ''; l.style.opacity = ''; });
    });
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = navbar.offsetHeight + 8;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
    });
  });

  // Active nav link con IntersectionObserver
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.35, rootMargin: '-60px 0px -40% 0px' });

  sections.forEach(s => navObserver.observe(s));
}


/* ============================================================
   10. GLOW INTERACTIVO en tarjetas de servicios
   ============================================================ */
function initServiceGlow() {
  document.querySelectorAll('.svc-card:not(.svc-card--gold)').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
      const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
      card.style.background =
        `radial-gradient(circle 220px at ${x}% ${y}%, rgba(184,150,46,0.07), rgba(28,28,28,0.8) 70%)`;
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      card.style.background = '';
    }, { passive: true });
  });
}


/* ============================================================
   11. FORMULARIO → WhatsApp
   ============================================================ */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const inputs   = form.querySelectorAll('input, textarea');
    const nombre   = inputs[0].value.trim();
    const empresa  = inputs[1].value.trim();
    const telefono = inputs[2].value.trim();
    const servicio = form.querySelector('select').value;
    const mensaje  = form.querySelector('textarea').value.trim();

    if (!nombre || !telefono) {
      shakeForm(form);
      return;
    }

    let text = `Hola Oscar, te escribo desde tu página web.\n\n`;
    text += `*Nombre:* ${nombre}\n`;
    if (empresa)  text += `*Empresa:* ${empresa}\n`;
    text += `*Teléfono:* ${telefono}\n`;
    if (servicio) text += `*Servicio:* ${servicio}\n`;
    if (mensaje)  text += `*Mensaje:* ${mensaje}`;

    window.open(`https://wa.me/573001234567?text=${encodeURIComponent(text)}`, '_blank');

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check mr-2"></i> ¡Listo! Abriendo WhatsApp...';
    btn.disabled = true;
    btn.style.opacity = '0.8';

    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled  = false;
      btn.style.opacity = '';
      form.reset();
    }, 4000);
  });
}

function shakeForm(el) {
  el.style.transition = 'transform 0.08s ease';
  const seq = [8, -8, 6, -6, 4, -4, 0];
  let i = 0;
  const tick = () => {
    el.style.transform = `translateX(${seq[i]}px)`;
    i++;
    if (i < seq.length) setTimeout(tick, 80);
  };
  tick();
}


/* ============================================================
   12. BOTONES — Hover con ripple
   ============================================================ */
function initRipple() {
  document.querySelectorAll('.btn-hero-primary, .btn-gold-full').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position:absolute; border-radius:50%; transform:scale(0); pointer-events:none;
        width:4px; height:4px; background:rgba(255,255,255,0.35);
        top:${e.offsetY - 2}px; left:${e.offsetX - 2}px;
        animation: rippleAnim 0.6s ease-out forwards;
      `;
      // Asegurar overflow hidden en el contenedor
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  });

  // CSS del ripple (inyectado dinámicamente para no depender de Anime.js)
  if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
      @keyframes rippleAnim {
        to { transform: scale(80); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}


/* ============================================================
   13. ANIMACIONES FLOTANTES CONSTANTES — Cards del Hero
   RAF-based, sin librería
   ============================================================ */
const FloatingCards = (() => {
  const cards = [
    { el: document.getElementById('hcard-main'),       amp: 10, speed: 0.0008, phase: 0 },
    { el: document.getElementById('hcard-compliance'), amp: 8,  speed: 0.0006, phase: 1.5 },
    { el: document.getElementById('hcard-metrics'),    amp: 12, speed: 0.0007, phase: 3.0 },
    { el: document.getElementById('hbadge'),           amp: 6,  speed: 0.0009, phase: 4.5 },
  ];

  let raf;
  let running = false;

  function loop(time) {
    if (!running) return;
    raf = requestAnimationFrame(loop);

    cards.forEach(card => {
      if (!card.el) return;
      const y = Math.sin(time * card.speed + card.phase) * card.amp;
      const x = Math.cos(time * card.speed * 0.7 + card.phase) * (card.amp * 0.3);
      // Solo traducir — el tilt viene de CardTilt, así que usamos la propiedad de float por separado
      // Guardamos en dataset para que CardTilt pueda combinarlo
      card.el.dataset.floatX = x.toFixed(2);
      card.el.dataset.floatY = y.toFixed(2);
      // Aplicar si el card no está siendo hover-tilted
      if (!card.el.dataset.tilting) {
        card.el.style.transform = `translate(${x}px, ${y}px)`;
        card.el.style.transition = 'transform 0.05s linear';
      }
    });
  }

  function start() {
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  return { start, stop };
})();


/* ============================================================
   14. WHATSAPP FLOAT — Entrada con retardo
   ============================================================ */
function initWAFloat() {
  const wa = document.getElementById('wa-float');
  if (!wa) return;
  setTimeout(() => wa.classList.add('is-visible'), 2200);
}


/* ============================================================
   15. LÍNEAS DE ACENTO DEL HERO
   ============================================================ */
function drawHeroAccentLines(delay = 0) {
  setTimeout(() => {
    document.querySelectorAll('.accent-line').forEach(line => {
      line.classList.add('is-drawn');
    });
  }, delay);
}


/* ============================================================
   ENTRADA DE NAVBAR tras cargar hero
   ============================================================ */
function revealNavItems(delay = 0) {
  const items = document.querySelectorAll('[data-nav-item]');
  items.forEach((item, i) => {
    setTimeout(() => {
      item.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)';
      item.style.transform  = 'translateY(-10px)';
      item.style.opacity    = '0';
      setTimeout(() => {
        item.style.transform = 'translateY(0)';
        item.style.opacity   = '1';
      }, 30);
    }, delay + i * 120);
  });
}


/* ============================================================
   ENTRADA DE CARDS DEL HERO
   ============================================================ */
function revealHeroCards() {
  const config = [
    { id: 'hbadge',           delay: 0,    from: { x: -30, y: -20 } },
    { id: 'hcard-main',       delay: 150,  from: { x: 40,  y: -20 } },
    { id: 'hcard-compliance', delay: 300,  from: { x: 40,  y: 20  } },
    { id: 'hcard-metrics',    delay: 450,  from: { x: 30,  y: 40  } },
  ];

  config.forEach(({ id, delay, from }) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Estado inicial
    el.style.opacity   = '0';
    el.style.transform = `translate(${from.x}px, ${from.y}px) scale(0.92)`;
    el.style.transition = 'none';

    setTimeout(() => {
      el.style.transition = `
        opacity 0.9s cubic-bezier(0.16,1,0.3,1),
        transform 0.9s cubic-bezier(0.34,1.56,0.64,1)
      `;
      el.style.opacity   = '1';
      el.style.transform = 'translate(0, 0) scale(1)';
    }, delay);
  });

  // Animar barras internas después de que las cards aparezcan
  setTimeout(animateCardBars, 900);
}


/* ============================================================
   SECUENCIA PRINCIPAL DE ENTRADA DEL HERO
   ============================================================ */
function runHeroEntrance() {
  // Badge
  HeroSequencer.add(() => {
    document.getElementById('hero-badge')?.classList.add('is-visible');
  }, 100);

  // Eyebrow / subtítulo superior
  HeroSequencer.add(() => {
    document.getElementById('hero-eyebrow')?.classList.add('is-visible');
  }, 150);

  // Palabras del título en cascada
  HeroSequencer.add(() => {
    document.querySelectorAll('.hero-word').forEach((word, i) => {
      setTimeout(() => word.classList.add('is-visible'), i * 180);
    });
  }, 200);

  // Descripción
  HeroSequencer.add(() => {
    document.getElementById('hero-desc')?.classList.add('is-visible');
  }, 500);

  // CTAs
  HeroSequencer.add(() => {
    document.getElementById('hero-ctas')?.classList.add('is-visible');
  }, 200);

  // Stats
  HeroSequencer.add(() => {
    document.getElementById('hero-stats')?.classList.add('is-visible');
  }, 200);

  // Cards del hero (columna derecha)
  HeroSequencer.add(() => {
    revealHeroCards();
  }, 150);

  // Líneas de acento
  HeroSequencer.add(() => {
    drawHeroAccentLines(0);
  }, 200);

  // Scroll cue
  HeroSequencer.add(() => {
    document.getElementById('scroll-cue')?.classList.add('is-visible');
  }, 600);

  HeroSequencer.run();
}


/* ============================================================
   INIT PRINCIPAL
   ============================================================ */
ready(() => {
  Loader.start();

  // Cuando la página (fuentes, imágenes) esté lista:
  window.addEventListener('load', () => {
    // 1. Terminar loader
    Loader.finish();

    // 2. Iniciar canvas de partículas
    setTimeout(() => ParticleCanvas.init(), 800);

    // 3. Parallax del mouse
    MouseParallax.init();

    // 4. Tilt 3D en cards
    CardTilt.init();

    // 5. Counter animation
    Counter.init();

    // 6. Navbar
    initNavbar();

    // 7. Scroll reveal (secciones inferiores)
    initScrollReveal();

    // 8. Glow en servicios
    initServiceGlow();

    // 9. Formulario
    initContactForm();

    // 10. Ripple en botones
    initRipple();

    // 11. WhatsApp float
    initWAFloat();

    // 12. Revelar items del navbar
    revealNavItems(400);

    // 13. SECUENCIA DE ENTRADA DEL HERO — comienza 300ms después del loader
    setTimeout(runHeroEntrance, 300);

    // 14. Animaciones flotantes constantes — inician después de la entrada
    setTimeout(() => FloatingCards.start(), 2000);
  }, { once: true });
});


/* ============================================================
   PAUSA de animaciones cuando la pestaña no está visible
   (optimización de rendimiento)
   ============================================================ */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    FloatingCards.stop();
    ParticleCanvas.stop();
  } else {
    FloatingCards.start();
    ParticleCanvas.init();
  }
});
