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

  /* --- Contact form — Formsubmit.co native POST --- */
  var contactForm = document.getElementById('contactForm');

  if (contactForm) {
    /* Update hidden _subject field based on selected topic before submit */
    var subjectSelect = document.getElementById('contactSubject');
    var subjectField  = document.getElementById('formSubjectField');
    var subjectLabels = {
      renseignement: 'Renseignement général',
      reservation:   'Réservation de groupe',
      'paddle-dog':  'Beach Paddle Dog',
      fitness:       'Cours de Fitness',
      tarifs:        'Tarifs & Formules',
      autre:         'Autre'
    };
    if (subjectSelect && subjectField) {
      subjectSelect.addEventListener('change', function () {
        subjectField.value = 'Contact Beach Paddle — ' + (subjectLabels[this.value] || this.value);
      });
    }

    /* Show loading state while form submits */
    contactForm.addEventListener('submit', function () {
      var btn = contactForm.querySelector('[type="submit"]');
      btn.textContent = 'Envoi en cours…';
      btn.disabled = true;
    });
  }

  /* Show success banner if redirected back with ?merci=1 */
  if (window.location.search.indexOf('merci=1') !== -1) {
    var banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:9998;background:#2D5A27;color:#fff;padding:1rem 2rem;border-radius:12px;font-family:var(--font-sans);font-size:0.9375rem;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.2);text-align:center;max-width:90vw;';
    banner.textContent = '✓ Votre message a bien été envoyé. Nous vous répondrons rapidement !';
    document.body.appendChild(banner);
    /* Scroll to contact section */
    var contactSection = document.getElementById('contact');
    if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
    /* Remove banner and clean URL after 5s */
    setTimeout(function () {
      banner.remove();
      history.replaceState(null, '', window.location.pathname);
    }, 5000);
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
    var pdTouchStartY = 0;
    pdSlider.addEventListener('touchstart', function (e) {
      pdTouchStartX = e.touches[0].clientX;
      pdTouchStartY = e.touches[0].clientY;
    }, { passive: true });
    pdSlider.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - pdTouchStartX;
      var dy = e.changedTouches[0].clientY - pdTouchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        pdGoTo(pdCurrent + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });

    /* Reset to slide 1 each time the section enters view */
    var pdSection = document.getElementById('paddle-dog');
    if (pdSection && 'IntersectionObserver' in window) {
      var pdSectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { pdGoTo(0); }
        });
      }, { threshold: 0.1 });
      pdSectionObserver.observe(pdSection);
    }
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

/* ============================================================
   COOKIE CONSENT + GOOGLE MAPS
   ============================================================ */
(function () {
  var MAPS_SRC = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d655.4!2d2.4954!3d48.8023!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDjCsDQ4JzA4LjMiTiAywrAyOSc0My41IkU!5e0!3m2!1sfr!2sfr!4v1716000000000!5m2!1sfr!2sfr&q=Beach+Paddle+18+Quai+du+Mesnil+Saint-Maur-des-Fossés&z=16';
  var MAPS_URL = 'https://maps.google.com/?q=18+Quai+du+Mesnil+Saint-Maur-des-Fossés';
  var KEY = 'bp_consent';
  var mapWrapper = document.getElementById('mapWrapper');
  var banner     = document.getElementById('cookieBanner');

  function loadMap() {
    if (!mapWrapper) return;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://maps.google.com/maps?q=Beach+Paddle+18+Quai+du+Mesnil+Saint-Maur-des-Fossés&output=embed&z=16';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.title = 'Localisation Beach Paddle sur Google Maps';
    iframe.setAttribute('aria-label', 'Carte Google Maps — Beach Paddle, Saint-Maur-des-Fossés');
    mapWrapper.innerHTML = '';
    mapWrapper.appendChild(iframe);
  }

  function showPlaceholder(withLoadBtn) {
    if (!mapWrapper) return;
    var html = '<div class="map-placeholder">'
      + '<svg class="map-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>'
      + '<p>La carte est désactivée.<br>Vous avez refusé les cookies Google.</p>'
      + '<div class="map-placeholder-actions">'
      + (withLoadBtn ? '<button class="map-load-btn" id="mapLoadBtn">Charger la carte</button>' : '')
      + '<a href="' + MAPS_URL + '" target="_blank" rel="noopener" class="map-ext-link">Voir sur Google Maps</a>'
      + '</div>'
      + '</div>';
    mapWrapper.innerHTML = html;
    if (withLoadBtn) {
      document.getElementById('mapLoadBtn').addEventListener('click', function () {
        loadMap();
      });
    }
  }

  function applyConsent(value, save) {
    if (save) localStorage.setItem(KEY, value);
    if (banner) banner.hidden = true;
    if (value === 'accepted') {
      loadMap();
    } else {
      showPlaceholder(true);
    }
  }

  var stored = localStorage.getItem(KEY);
  if (stored) {
    applyConsent(stored, false);
  } else {
    showPlaceholder(false);
    if (banner) {
      banner.hidden = false;
      document.getElementById('cookieAccept').addEventListener('click', function () { applyConsent('accepted', true); });
      document.getElementById('cookieRefuse').addEventListener('click', function () { applyConsent('refused',  true); });
    }
  }
})();
