/* ============================================================
   BEACH PADDLE — Main Scripts
   ============================================================ */

(function () {
  'use strict';

  /* --- Navigation scroll state --- */
  const nav = document.getElementById('nav');

  function updateNav() {
    if (window.scrollY > 60) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* --- Mobile menu --- */
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];

  function openMenu() {
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    navToggle.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    navToggle.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      if (mobileMenu.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  mobileLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
      closeMenu();
    }
  });

  /* --- Scroll reveal (IntersectionObserver) --- */
  const reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && reveals.length) {
    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );

    reveals.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* --- Gallery lightbox --- */
  const galleryItems = document.querySelectorAll('.galerie-item');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox ? lightbox.querySelector('.lightbox-img') : null;
  const lightboxClose = lightbox ? lightbox.querySelector('.lightbox-close') : null;

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () {
      if (lightboxImg) lightboxImg.src = '';
    }, 300);
  }

  galleryItems.forEach(function (item) {
    item.addEventListener('click', function () {
      const img = item.querySelector('img');
      if (img) openLightbox(img.src, img.alt);
    });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const img = item.querySelector('img');
        if (img) openLightbox(img.src, img.alt);
      }
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });

  /* --- Smooth scroll for nav anchor links --- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        if (getComputedStyle(target).display === 'none') {
          target.style.display = 'block';
        }
        e.preventDefault();
        const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  /* --- Contact form submit (no backend — visual feedback only) --- */
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const btn = contactForm.querySelector('[type="submit"]');
      const originalText = btn.textContent;

      btn.textContent = 'Envoi en cours…';
      btn.disabled = true;

      setTimeout(function () {
        btn.textContent = 'Message envoyé !';
        btn.style.background = '#2D5A27';
        contactForm.reset();

        setTimeout(function () {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.disabled = false;
        }, 3500);
      }, 1200);
    });
  }

  /* --- Nav dropdown --- */
  var navDropdown = document.getElementById('navDropdown');
  var navDropdownBtn = document.getElementById('navDropdownBtn');
  var navDropdownMenu = document.getElementById('navDropdownMenu');

  function openDropdown() {
    navDropdown.classList.add('is-open');
    navDropdownBtn.setAttribute('aria-expanded', 'true');
    navDropdownMenu.setAttribute('aria-hidden', 'false');
  }

  function closeDropdown() {
    navDropdown.classList.remove('is-open');
    navDropdownBtn.setAttribute('aria-expanded', 'false');
    navDropdownMenu.setAttribute('aria-hidden', 'true');
  }

  if (navDropdownBtn) {
    navDropdownBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (navDropdown.classList.contains('is-open')) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });
  }

  document.addEventListener('click', function (e) {
    if (navDropdown && !navDropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navDropdown && navDropdown.classList.contains('is-open')) {
      closeDropdown();
      navDropdownBtn.focus();
    }
  });

  if (navDropdownMenu) {
    navDropdownMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeDropdown);
    });
  }

  /* --- FAQ accordion --- */
  document.querySelectorAll('[data-faq]').forEach(function (item) {
    var btn = item.querySelector('.faq-question');
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      document.querySelectorAll('[data-faq].is-open').forEach(function (open) {
        open.classList.remove('is-open');
        open.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* --- Paddle Dog slider : swap slides 1 & 2 on mobile --- */
  (function () {
    if (window.innerWidth >= 768) return;
    var slides = document.querySelectorAll('#paddledogSlider .paddledog-slide');
    var dots   = document.querySelectorAll('#paddledogSlider .paddledog-dot');
    if (slides.length < 2) return;
    slides[0].parentNode.insertBefore(slides[1], slides[0]);
    if (dots.length >= 2) dots[0].parentNode.insertBefore(dots[1], dots[0]);
  })();

  /* --- Paddle Dog slider --- */
  var pdSlider = document.getElementById('paddledogSlider');
  if (pdSlider) {
    var pdSlides = pdSlider.querySelectorAll('.paddledog-slide');
    var pdDots   = pdSlider.querySelectorAll('.paddledog-dot');
    var pdCurrent = 0;

    function pdGoTo(index) {
      pdSlides[pdCurrent].classList.remove('is-active');
      pdDots[pdCurrent].classList.remove('is-active');
      pdCurrent = (index + pdSlides.length) % pdSlides.length;
      pdSlides[pdCurrent].classList.add('is-active');
      pdDots[pdCurrent].classList.add('is-active');
    }

    pdSlider.querySelector('.paddledog-arrow-prev').addEventListener('click', function () { pdGoTo(pdCurrent - 1); });
    pdSlider.querySelector('.paddledog-arrow-next').addEventListener('click', function () { pdGoTo(pdCurrent + 1); });
    pdDots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { pdGoTo(i); });
    });

    var pdTouchStartX = 0;
    pdSlider.addEventListener('touchstart', function (e) {
      pdTouchStartX = e.touches[0].clientX;
    }, { passive: true });
    pdSlider.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - pdTouchStartX;
      if (Math.abs(dx) > 40) pdGoTo(pdCurrent + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* --- Fitness slider --- */
  var fsSlider = document.getElementById('fitnessSlider');
  if (fsSlider) {
    var fsSlides = fsSlider.querySelectorAll('.fitness-slide');
    var fsBars   = fsSlider.querySelectorAll('.fitness-bar');
    var fsCurrent = 0;

    function fsGoTo(index) {
      fsSlides[fsCurrent].classList.remove('is-active');
      fsBars[fsCurrent].classList.remove('is-active');
      fsCurrent = (index + fsSlides.length) % fsSlides.length;
      fsSlides[fsCurrent].classList.add('is-active');
      fsBars[fsCurrent].classList.add('is-active');
    }

    fsSlider.querySelector('.fitness-arrow-prev').addEventListener('click', function () { fsGoTo(fsCurrent - 1); });
    fsSlider.querySelector('.fitness-arrow-next').addEventListener('click', function () { fsGoTo(fsCurrent + 1); });
  }

  /* --- Video facade: charge l'iframe YouTube au clic --- */
  document.querySelectorAll('.video-card[data-video-id]').forEach(function (card) {
    function activateVideo() {
      var id = card.dataset.videoId;
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
      iframe.title = card.querySelector('img') ? card.querySelector('img').alt : 'Vidéo Beach Paddle';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      card.innerHTML = '';
      card.appendChild(iframe);
      card.style.cursor = 'default';
      card.removeAttribute('role');
      card.removeAttribute('tabindex');
    }
    card.addEventListener('click', activateVideo);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateVideo();
      }
    });
  });

  /* --- Lazy load images not in viewport --- */
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[data-src]').forEach(function (img) {
      img.src = img.dataset.src;
    });
  } else {
    const lazyImages = document.querySelectorAll('img[data-src]');
    if (lazyImages.length && 'IntersectionObserver' in window) {
      const lazyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            lazyObserver.unobserve(img);
          }
        });
      });
      lazyImages.forEach(function (img) {
        lazyObserver.observe(img);
      });
    }
  }
})();
