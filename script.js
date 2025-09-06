(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------
     Utilities
  ------------------------- */
  const on = (el, ev, fn, opts = {}) => el && el.addEventListener(ev, fn, { capture: false, ...opts });
  const off = (el, ev, fn, opts = {}) => el && el.removeEventListener(ev, fn, { capture: false, ...opts });
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Enhanced throttle with leading option
  const throttle = (fn, wait = 16, leading = true) => {
    let last = 0, timeout = null;
    return (...args) => {
      const now = Date.now();
      if (leading && !last) {
        fn(...args);
        last = now;
      } else if (now - last >= wait) {
        if (timeout) clearTimeout(timeout);
        fn(...args);
        last = now;
      } else if (!timeout) {
        timeout = setTimeout(() => {
          fn(...args);
          last = Date.now();
          timeout = null;
        }, wait - (now - last));
      }
    };
  };

  // Debounce helper
  const debounce = (fn, wait = 100) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  };

  /* -------------------------
     1) Navbar - solid on scroll with cleanup
  ------------------------- */
  const navbar = $('.navbar');
  const NAV_BREAK = 60;
  const handleNavbar = throttle(() => {
    if (!navbar) return;
    navbar.classList.toggle('solid', window.scrollY > NAV_BREAK);
  }, 40);

  if (!prefersReducedMotion) {
    on(window, 'scroll', handleNavbar, { passive: true });
  } else {
    handleNavbar();
  }

  /* -------------------------
     2) Smooth anchor scroll (accessible)
  ------------------------- */
  $$('a[href^="#"]').forEach(anchor => {
    on(anchor, 'click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      setTimeout(() => target.removeAttribute('tabindex'), 1000);
    }, { passive: false });
  });

  /* -------------------------
     3) Reveal-on-scroll with improved observer
  ------------------------- */
  const revealEls = $$('.reveal');
  const revealObserverSupported = 'IntersectionObserver' in window;

  const revealOn = (el) => {
    el.classList.add('is-visible');
    if (el.classList.contains('about-me') || el.id === 'about') {
      animateSkillBars();
    }
  };

  if (prefersReducedMotion) {
    revealEls.forEach(revealOn);
  } else if (revealObserverSupported) {
    const ro = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          revealOn(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.1 });

    revealEls.forEach(el => ro.observe(el));
  } else {
    const checkReveal = throttle(() => {
      const vh = window.innerHeight;
      revealEls.forEach(el => {
        if (el.classList.contains('is-visible')) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < vh * 0.9) revealOn(el);
      });
    }, 100);
    on(window, 'scroll', checkReveal, { passive: true });
    on(window, 'resize', checkReveal, { passive: true });
    checkReveal();
  }

  /* -------------------------
     4) Skill bars animation with dynamic data
  ------------------------- */
  const skillPercent = {
    aws: 75,
    frontend: 70,
    python: 72,
    bootstrap: 55,
    java: 60,
    linux: 65,
    c: 55,
    html: 70,
    css: 70,
    javascript: 60
  };

  const skillSpans = $$('.progress-line span');
  let hasAnimatedSkills = false;

  const animateSkillBars = () => {
    if (hasAnimatedSkills) return;
    hasAnimatedSkills = true;

    skillSpans.forEach(span => {
      if (span.dataset.animated === '1') return;
      const cls = (span.className || '').trim().split(/\s+/)[0] || '';
      const pct = skillPercent[cls] || 40;
      span.style.setProperty('--skill-level', `${pct}%`);
      if (prefersReducedMotion) {
        span.style.width = `${pct}%`;
      } else {
        span.style.animationPlayState = 'running';
      }
      span.dataset.animated = '1';
      span.setAttribute('data-pct', `${pct}%`);
    });
  };

  on(window, 'load', () => {
    setTimeout(() => {
      skillSpans.forEach(span => {
        const rect = span.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          animateSkillBars();
        }
      });
    }, 200);
  });
  // Animate skill percentages when revealed
const skillEls = document.querySelectorAll(".skill");

function animateSkills() {
  skillEls.forEach(skill => {
    const bar = skill.querySelector(".progress-line span");
    const percentEl = skill.querySelector(".percentage");
    const rect = skill.getBoundingClientRect();

    if (rect.top < window.innerHeight - 80 && !skill.classList.contains("revealed")) {
      skill.classList.add("revealed");

      // Animate % counter
      const target = parseInt(getComputedStyle(bar).getPropertyValue("--skill-level")) || 80;
      let current = 0;
      const step = () => {
        current += 2;
        if (current > target) current = target;
        percentEl.textContent = current + "%";
        if (current < target) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  });
}
window.addEventListener("scroll", animateSkills);
animateSkills();


  /* -------------------------
     5) Project cards - 3D tilt + magnetic glow
  ------------------------- */
  const projectCards = $$('.project-card');

  projectCards.forEach(card => {
    if (prefersReducedMotion) return;

    let rafId = null;
    let state = { rotateX: 0, rotateY: 0, scale: 1 };
    const maxTilt = 10;

    const setTransform = () => {
      card.style.transform = `perspective(1000px) rotateX(${state.rotateX}deg) rotateY(${state.rotateY}deg) scale(${state.scale})`;
      card.style.boxShadow = `0 15px 35px rgba(0,0,0,0.4), 0 0 30px rgba(0,221,235,0.15)`;
    };

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
      const mx = x / rect.width;
      const my = y / rect.height;

      state.rotateX = (my - 0.5) * maxTilt;
      state.rotateY = (mx - 0.5) * -maxTilt;
      state.scale = 1.05;

      card.style.setProperty('--mx', `${Math.round(mx * 100)}%`);
      card.style.setProperty('--my', `${Math.round(my * 100)}%`);

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(setTransform);
    };

    const onLeave = () => {
      if (rafId) cancelAnimationFrame(rafId);
      state = { rotateX: 0, rotateY: 0, scale: 1 };
      rafId = requestAnimationFrame(() => {
        setTransform();
        card.style.boxShadow = '';
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    };

    on(card, 'mousemove', onMove, { passive: true });
    on(card, 'touchmove', onMove, { passive: true });
    on(card, 'mouseleave', onLeave);
    on(card, 'touchend', onLeave);
  });

  /* -------------------------
     6) Header parallax effect (optimized)
  ------------------------- */
  const headerEl = $('header.header');
  if (headerEl && !prefersReducedMotion) {
    const handleParallax = throttle(() => {
      const offset = Math.max(0, window.scrollY * 0.3);
      headerEl.style.backgroundPosition = `center ${offset}px`;
      $$('.blob', headerEl).forEach((b, i) => {
        const speed = (i + 1) * 0.7;
        b.style.transform = `translateY(${offset / (50 / speed)}px) scale(${1 + offset / 1000})`;
      });
    }, 16);
    on(window, 'scroll', handleParallax, { passive: true });
  }

  /* -------------------------
     7) Particles in header (optimized)
  ------------------------- */
  const particlesContainer = $('.fx-particles');
  if (particlesContainer && !prefersReducedMotion) {
    const generateParticles = () => {
      particlesContainer.innerHTML = '';
      const particleCount = Math.min(80, Math.max(15, Math.round(window.innerWidth / 40)));
      for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        const size = Math.random() * 4 + 2;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${Math.random() * 100}%`;
        p.style.top = `${Math.random() * 100}%`;
        p.style.opacity = `${0.3 + Math.random() * 0.7}`;
        p.style.animationDuration = `${10 + Math.random() * 20}s`;
        p.style.animationDelay = `${-Math.random() * 15}s`;
        p.style.transform = `translateZ(${Math.random() * 100}px)`;
        particlesContainer.appendChild(p);
      }
    };

    generateParticles();
    on(window, 'resize', debounce(generateParticles, 300), { passive: true });
  }

  /* -------------------------
     8) Certifications slideshow with swipe support
  ------------------------- */
  const slides = $$('.mySlides');
  const dots = $$('.dot');
  let slideIndex = 0;
  let slideTimer = null;
  const SLIDE_INTERVAL = 4000;

  const showSlide = (n) => {
    if (!slides.length) return;
    slideIndex = ((n % slides.length) + slides.length) % slides.length;
    slides.forEach((s, i) => {
      s.style.display = i === slideIndex ? 'block' : 'none';
      s.classList.toggle('active', i === slideIndex);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === slideIndex));
  };

  const nextSlide = () => showSlide(slideIndex + 1);
  const prevSlide = () => showSlide(slideIndex - 1);

  const startSlides = () => {
    if (prefersReducedMotion) return;
    clearInterval(slideTimer);
    slideTimer = setInterval(nextSlide, SLIDE_INTERVAL);
  };

  const stopSlides = () => {
    clearInterval(slideTimer);
    slideTimer = null;
  };

  if (slides.length) {
    showSlide(0);
    startSlides();

    dots.forEach((dot, i) => {
      on(dot, 'click', () => {
        showSlide(i);
        stopSlides();
        startSlides();
      });
      dot.setAttribute('tabindex', '0');
      on(dot, 'keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          showSlide(i);
          stopSlides();
          startSlides();
        }
      });
    });

    const slideshowContainer = $('.slideshow-container');
    if (slideshowContainer) {
      on(slideshowContainer, 'mouseenter', stopSlides);
      on(slideshowContainer, 'mouseleave', startSlides);
      on(slideshowContainer, 'focusin', stopSlides);
      on(slideshowContainer, 'focusout', startSlides);

      // Swipe support
      let touchStartX = 0;
      on(slideshowContainer, 'touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });
      on(slideshowContainer, 'touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;
        if (Math.abs(deltaX) > 50) {
          if (deltaX > 0) prevSlide();
          else nextSlide();
          stopSlides();
          startSlides();
        }
      }, { passive: true });
    }
  }

  window.currentSlide = (n) => {
    if (!slides.length) return;
    showSlide(n - 1);
    stopSlides();
    startSlides();
  };

  /* -------------------------
     9) Back-to-top button with animation
  ------------------------- */
  (() => {
    let btn = $('.back-to-top');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'back-to-top';
      btn.type = 'button';
      btn.title = 'Back to top';
      btn.innerHTML = '↑';
      Object.assign(btn.style, {
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        border: 'none',
        background: 'var(--gradient-accent)',
        color: '#fff',
        fontWeight: '700',
        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        zIndex: 1200,
        opacity: 0,
        transform: 'translateY(10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease'
      });
      btn.setAttribute('aria-label', 'Back to top');
      document.body.appendChild(btn);
    }

    const showHide = throttle(() => {
      btn.style.opacity = window.scrollY > 600 ? '1' : '0';
      btn.style.transform = window.scrollY > 600 ? 'translateY(0)' : 'translateY(10px)';
    }, 100);

    on(window, 'scroll', showHide, { passive: true });
    on(btn, 'click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    showHide();
  })();

  /* -------------------------
     10) Scroll progress indicator
  ------------------------- */
  (() => {
    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    Object.assign(progress.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      height: '4px',
      width: '0',
      background: 'var(--gradient-accent)',
      zIndex: 1100,
      transition: 'width 0.2s ease'
    });
    document.body.appendChild(progress);

    const updateProgress = throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progressWidth = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progress.style.width = `${progressWidth}%`;
    }, 50);

    on(window, 'scroll', updateProgress, { passive: true });
    on(window, 'resize', updateProgress, { passive: true });
    updateProgress();
  })();

  /* -------------------------
     11) Lazy loading images
  ------------------------- */
  const lazyImages = $$('img[data-src]');
  if ('IntersectionObserver' in window) {
    const imgObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '0px 0px 200px 0px' });

    lazyImages.forEach(img => imgObserver.observe(img));
  } else {
    lazyImages.forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }

  /* -------------------------
     12) Accessibility enhancements
  ------------------------- */
  (() => {
    let mouseUsed = false;
    on(document, 'mousedown', () => {
      mouseUsed = true;
      document.body.classList.remove('user-is-tabbing');
    }, { passive: true });
    on(document, 'keydown', (e) => {
      if (e.key === 'Tab') {
        if (mouseUsed) mouseUsed = false;
        document.body.classList.add('user-is-tabbing');
      }
    }, { passive: true });

    // Ensure focusable elements have proper attributes
    $$('a, button, [role="button"]').forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
  })();

  /* -------------------------
     13) Cleanup on unload
  ------------------------- */
  on(window, 'unload', () => {
    // Remove event listeners to prevent memory leaks
    $$('a[href^="#"]').forEach(anchor => off(anchor, 'click'));
    off(window, 'scroll', handleNavbar);
    off(window, 'scroll', handleParallax);
    off(window, 'resize', generateParticles);
    projectCards.forEach(card => {
      off(card, 'mousemove', null);
      off(card, 'touchmove', null);
      off(card, 'mouseleave', null);
      off(card, 'touchend', null);
    });
  });

  /* -------------------------
     14) Initial calls
  ------------------------- */
  handleNavbar();
  if (!revealObserverSupported && !prefersReducedMotion) {
    revealEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) revealOn(el);
    });
  }
  if (slides.length && !dots.length) showSlide(0);
})();