/* ============================================================
   BEACH PADDLE — Canipaddle 2026
   Réservations + comptage de places en temps réel (Supabase)
   ============================================================

   VARIABLES À CONFIGURER AVANT MISE EN PRODUCTION :
   ──────────────────────────────────────────────────
   CPDCONFIG.SUPABASE_URL          → URL de votre projet Supabase
                                     (ex : https://xxxx.supabase.co)
   CPDCONFIG.SUPABASE_ANON_KEY     → Clef anon publique Supabase
   CPDCONFIG.PAYMENT_LINK_BALADE   → Lien de paiement Stripe/SumUp 50€
   CPDCONFIG.PAYMENT_LINK_INITIATION → Lien de paiement Stripe/SumUp 35€
   CPDCONFIG.SESSION_DATE          → Date de la session (YYYY-MM-DD)
   CPDCONFIG.MAX_PLACES_BALADE     → Nombre max de places balade (5)
   CPDCONFIG.MAX_PLACES_INITIATION → Nombre max de places initiation (9)
   ============================================================ */

var CPDCONFIG = {
  SUPABASE_URL:              'https://icvjwdtdbbyzkuczxvzp.supabase.co',
  SUPABASE_ANON_KEY:         'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljdmp3ZHRkYmJ5emt1Y3p4dnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODE1NzEsImV4cCI6MjA5NTA1NzU3MX0.z6ogY8h0Fco5vzKWRBkXEl-PtiZckuYai2HjLoL1Egw',
  PAYMENT_LINK_BALADE:       'https://buy.stripe.com/eVq00l1uS4uu5NmcfQ6sw01',
  PAYMENT_LINK_INITIATION:   'https://buy.stripe.com/9B68wR3D00eegs0fs26sw00',
  SESSION_DATE:              '2026-06-06',
  MAX_PLACES_BALADE:         5,
  MAX_PLACES_INITIATION:     9,
  CRENEAUX_INITIATION: [
    { display: '12h30', value: '12:30' },
    { display: '12h40', value: '12:40' },
    { display: '12h50', value: '12:50' },
    { display: '13h00', value: '13:00' },
    { display: '13h10', value: '13:10' },
    { display: '13h20', value: '13:20' },
    { display: '13h30', value: '13:30' },
    { display: '13h40', value: '13:40' },
    { display: '13h50', value: '13:50' },
  ],
};

(function () {
  'use strict';

  /* ─── État global ─────────────────────────────────────── */
  var currentSession = null; // 'balade' | 'initiation'
  var supabaseClient = null;
  var supabaseReady  = false;

  /* ─── Init Supabase ───────────────────────────────────── */
  if (
    window.supabase &&
    typeof window.supabase.createClient === 'function' &&
    CPDCONFIG.SUPABASE_URL.indexOf('REMPLACER') === -1
  ) {
    supabaseClient = window.supabase.createClient(
      CPDCONFIG.SUPABASE_URL,
      CPDCONFIG.SUPABASE_ANON_KEY
    );
    supabaseReady = true;
  }

  /* ─── Éléments DOM ────────────────────────────────────── */
  var btnBalade          = document.getElementById('cpdBtnBalade');
  var btnInitiation      = document.getElementById('cpdBtnInitiation');
  var inlineForm         = document.getElementById('cpdInlineForm');
  var inlineClose        = document.getElementById('cpdInlineClose');
  var formBadge          = document.getElementById('cpdFormBadge');
  var formTitle          = document.getElementById('cpdFormTitle');
  var formSubtitle       = document.getElementById('cpdFormSubtitle');
  var form               = document.getElementById('cpdForm');
  var attestationDiv     = document.getElementById('cpdAttestation');
  var checkAttest        = document.getElementById('cpdCheckAttestation');
  var creneauGroup       = document.getElementById('cpdCreneauGroup');
  var selectCreneau      = document.getElementById('cpdSelectCreneau');
  var departInfo         = document.getElementById('cpdDepartInfo');
  var submitBtn          = document.getElementById('cpdSubmit');
  var formError          = document.getElementById('cpdFormError');
  var successDiv         = document.getElementById('cpdSuccess');
  var numBaladeEl        = document.getElementById('cpdNumBalade');
  var numInitiationEl    = document.getElementById('cpdNumInitiation');
  var placesBaladeEl     = document.getElementById('cpdPlacesBalade');
  var placesInitiationEl = document.getElementById('cpdPlacesInitiation');

  if (!inlineForm || !form) return;

  /* ─── Comptage des places ─────────────────────────────── */
  function fetchPlaces() {
    if (!supabaseReady) {
      updatePlacesUI('balade',     CPDCONFIG.MAX_PLACES_BALADE);
      updatePlacesUI('initiation', CPDCONFIG.MAX_PLACES_INITIATION);
      return;
    }

    supabaseClient
      .from('canipaddle_bookings')
      .select('session_type')
      .eq('session_date', CPDCONFIG.SESSION_DATE)
      .eq('statut', 'confirmed')
      .then(function (result) {
        if (result.error) {
          console.warn('[Canipaddle] Supabase error:', result.error.message);
          return;
        }
        var data = result.data || [];
        var countBalade     = data.filter(function (r) { return r.session_type === 'balade'; }).length;
        var countInitiation = data.filter(function (r) { return r.session_type === 'initiation'; }).length;
        updatePlacesUI('balade',     CPDCONFIG.MAX_PLACES_BALADE - countBalade);
        updatePlacesUI('initiation', CPDCONFIG.MAX_PLACES_INITIATION - countInitiation);
      });
  }

  function updatePlacesUI(session, remaining) {
    var numEl    = session === 'balade' ? numBaladeEl    : numInitiationEl;
    var placesEl = session === 'balade' ? placesBaladeEl : placesInitiationEl;
    var btn      = session === 'balade' ? btnBalade      : btnInitiation;

    if (!numEl) return;

    if (remaining <= 0) {
      numEl.textContent = '0';
      if (placesEl) placesEl.classList.add('is-complet');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Complet';
        btn.setAttribute('aria-disabled', 'true');
      }
    } else {
      numEl.textContent = remaining;
      if (placesEl) placesEl.classList.remove('is-complet');
    }
  }

  /* ─── Créneaux Initiation ─────────────────────────────── */
  function fetchAndRenderCreneaux() {
    if (!selectCreneau) return;
    if (!supabaseReady) {
      renderCreneauxOptions([]);
      return;
    }

    supabaseClient
      .from('canipaddle_bookings')
      .select('creneau')
      .eq('session_type', 'initiation')
      .eq('session_date', CPDCONFIG.SESSION_DATE)
      .eq('statut', 'confirmed')
      .then(function (result) {
        if (result.error) {
          console.warn('[Canipaddle] Créneaux error:', result.error.message);
          renderCreneauxOptions([]);
          return;
        }
        var taken = (result.data || []).map(function (r) {
          return r.creneau ? r.creneau.slice(0, 5) : null;
        }).filter(Boolean);
        renderCreneauxOptions(taken);
      });
  }

  function renderCreneauxOptions(takenCreneaux) {
    if (!selectCreneau) return;
    var current = selectCreneau.value;

    selectCreneau.innerHTML = '<option value="">— Choisissez un créneau —</option>';

    var allTaken = CPDCONFIG.CRENEAUX_INITIATION.length > 0;
    CPDCONFIG.CRENEAUX_INITIATION.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.value;
      var isTaken = takenCreneaux.indexOf(c.value) !== -1;
      if (isTaken) {
        opt.textContent = c.display + ' — Complet';
        opt.disabled    = true;
      } else {
        opt.textContent = c.display;
        allTaken = false;
      }
      selectCreneau.appendChild(opt);
    });

    // Restore selection if still available
    if (current && takenCreneaux.indexOf(current) === -1) {
      selectCreneau.value = current;
    }

    // All créneaux taken → disable initiation button
    if (allTaken && btnInitiation && !btnInitiation.disabled) {
      btnInitiation.disabled = true;
      btnInitiation.textContent = 'Complet';
      btnInitiation.setAttribute('aria-disabled', 'true');
      if (placesInitiationEl) placesInitiationEl.classList.add('is-complet');
      if (numInitiationEl) numInitiationEl.textContent = '0';
    }

    updateSubmitState();
  }

  /* ─── Realtime Supabase ───────────────────────────────── */
  function onRealtimeChange() {
    fetchPlaces();
    if (currentSession === 'initiation') {
      fetchAndRenderCreneaux();
    }
  }

  function subscribeRealtime() {
    if (!supabaseReady) return;
    supabaseClient
      .channel('canipaddle-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table:  'canipaddle_bookings',
      }, onRealtimeChange)
      .subscribe();
  }

  /* ─── Ouverture / fermeture du formulaire inline ─────── */
  function openForm(session) {
    currentSession = session;
    var isBalade = session === 'balade';

    if (formBadge)    formBadge.textContent    = isBalade ? 'Balade Confirmés' : 'Initiation Débutants';
    if (formBadge)    formBadge.classList.toggle('is-initiation', !isBalade);
    if (formTitle)    formTitle.textContent    = isBalade ? 'Finaliser ma réservation' : 'Finaliser mon inscription';
    if (formSubtitle) formSubtitle.textContent = isBalade ? '10h30 - 12h00 · 50€ par binôme' : '12h30 - 14h00 · 35€ par binôme';

    form.reset();

    if (attestationDiv) {
      attestationDiv.hidden = !isBalade;
      if (checkAttest) {
        checkAttest.required = isBalade;
        checkAttest.checked  = false;
      }
    }

    if (departInfo) {
      departInfo.hidden       = !isBalade;
      departInfo.style.display = isBalade ? '' : 'none';
    }

    if (creneauGroup) {
      creneauGroup.hidden       = isBalade;
      creneauGroup.style.display = isBalade ? 'none' : '';
      if (selectCreneau) {
        selectCreneau.required = !isBalade;
        selectCreneau.value    = '';
      }
    }

    form.hidden       = false;
    successDiv.hidden = true;
    formError.hidden  = true;
    updateSubmitState();

    if (!isBalade) {
      fetchAndRenderCreneaux();
    }

    inlineForm.hidden = false;

    setTimeout(function () {
      inlineForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  function closeForm() {
    inlineForm.hidden = true;
    currentSession = null;
  }

  /* ─── Validation du bouton Submit ─────────────────────── */
  function updateSubmitState() {
    if (!submitBtn) return;
    var lockedAttest  = currentSession === 'balade'    && checkAttest    && !checkAttest.checked;
    var lockedCreneau = currentSession === 'initiation' && selectCreneau && !selectCreneau.value;
    submitBtn.disabled = lockedAttest || lockedCreneau;
  }

  if (checkAttest)   checkAttest.addEventListener('change',   updateSubmitState);
  if (selectCreneau) selectCreneau.addEventListener('change', updateSubmitState);

  /* ─── Soumission du formulaire ────────────────────────── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!formError || !successDiv || !submitBtn) return;

    formError.hidden = true;

    var prenom    = (form.prenom    ? form.prenom.value.trim()    : '');
    var nom       = (form.nom       ? form.nom.value.trim()       : '');
    var email     = (form.email     ? form.email.value.trim()     : '');
    var telephone = (form.telephone ? form.telephone.value.trim() : '');
    var nom_chien = (form.nom_chien ? form.nom_chien.value.trim() : '');
    var creneau   = selectCreneau   ? selectCreneau.value         : '';

    if (!prenom || !nom || !email || !telephone) {
      showError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (currentSession === 'balade' && checkAttest && !checkAttest.checked) {
      showError("Veuillez cocher l'attestation avant de continuer.");
      return;
    }

    if (currentSession === 'initiation' && !creneau) {
      showError('Veuillez choisir votre créneau de départ.');
      return;
    }

    var paymentLink = currentSession === 'balade'
      ? CPDCONFIG.PAYMENT_LINK_BALADE
      : CPDCONFIG.PAYMENT_LINK_INITIATION;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Envoi en cours…';

    /* Ouvrir Stripe immédiatement dans le contexte direct du clic */
    if (paymentLink && paymentLink.indexOf('REMPLACER') === -1) {
      window.open(paymentLink, '_blank');
    }

    /* INSERT Supabase en parallèle */
    if (supabaseReady) {
      var record = {
        session_type: currentSession,
        session_date: CPDCONFIG.SESSION_DATE,
        prenom:       prenom,
        nom:          nom,
        email:        email,
        telephone:    telephone,
        nom_chien:    nom_chien || null,
        statut:       'pending',
      };
      if (currentSession === 'initiation' && creneau) {
        record.creneau = creneau;
      }
      supabaseClient
        .from('canipaddle_bookings')
        .insert(record)
        .catch(function (err) {
          console.error('[Canipaddle] Supabase insert error:', err);
        });
    }

    form.hidden       = true;
    successDiv.hidden = false;
  });

  function showError(msg) {
    if (!formError) return;
    formError.textContent = msg;
    formError.hidden      = false;
    formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ─── Événements ──────────────────────────────────────── */
  if (btnBalade)     btnBalade.addEventListener('click',     function () { openForm('balade'); });
  if (btnInitiation) btnInitiation.addEventListener('click', function () { openForm('initiation'); });
  if (inlineClose)   inlineClose.addEventListener('click',   closeForm);

  /* ─── Init ────────────────────────────────────────────── */
  fetchPlaces();
  subscribeRealtime();

}());
