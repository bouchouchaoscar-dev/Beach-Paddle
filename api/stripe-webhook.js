/**
 * Vercel Serverless Function — Stripe Webhook
 * URL de production : https://[ton-domaine]/api/stripe-webhook
 *
 * Variables d'environnement Vercel requises :
 *   STRIPE_WEBHOOK_SECRET     → whsec_... (depuis Stripe Dashboard > Webhooks)
 *   SUPABASE_SERVICE_ROLE_KEY → service role key Supabase
 *   RESEND_API_KEY            → re_... (depuis resend.com > API Keys)
 *
 * Événements Stripe à activer :
 *   checkout.session.completed
 *   charge.refunded
 */

'use strict';

const crypto = require('crypto');

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://icvjwdtdbbyzkuczxvzp.supabase.co';
const SESSION_DATE      = '2026-06-20';
const PENDING_TTL_MS    = 30 * 60 * 1000; // 30 minutes
const NOTIF_EMAIL       = 'contact@beachpaddle.fr';

// ── Formatage date session en français ───────────────────────────────────────
function formatSessionDateFr(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date  = new Date(y, m - 1, d);
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const mois  = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${jours[date.getDay()]} ${d} ${mois[m - 1]} ${y}`;
}

// ── Body brut requis pour la vérification de la signature Stripe ─────────────
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  ()    => resolve(Buffer.concat(chunks)));
    req.on('error', err  => reject(err));
  });
}

// ── Vérification HMAC-SHA256 de la signature Stripe ─────────────────────────
function verifyStripeSignature(rawBody, sigHeader, secret) {
  try {
    const parts    = sigHeader.split(',');
    const t        = parts.find(p => p.startsWith('t=')).slice(2);
    const sigs     = parts.filter(p => p.startsWith('v1=')).map(p => p.slice(3));
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${t}.${rawBody}`, 'utf8')
      .digest('hex');
    return sigs.some(s => {
      try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s));
      } catch { return false; }
    });
  } catch { return false; }
}

// ── Passage pending → confirmed pour l'email donné ──────────────────────────
async function confirmBooking(email, serviceRoleKey) {
  const url = `${SUPABASE_URL}/rest/v1/canipaddle_bookings`
    + `?email=eq.${encodeURIComponent(email.toLowerCase())}`
    + `&statut=eq.pending`
    + `&session_date=eq.${SESSION_DATE}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey':        serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: JSON.stringify({ statut: 'confirmed' }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase PATCH failed: ${res.status} ${err}`);
  }

  const rows = await res.json();
  return rows; // tableau des lignes confirmées
}

// ── Passage confirmed → cancelled pour l'email donné (remboursement) ─────────
async function cancelBooking(email, serviceRoleKey) {
  const url = `${SUPABASE_URL}/rest/v1/canipaddle_bookings`
    + `?email=eq.${encodeURIComponent(email.toLowerCase())}`
    + `&statut=eq.confirmed`
    + `&session_date=eq.${SESSION_DATE}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey':        serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: JSON.stringify({ statut: 'cancelled' }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase PATCH failed: ${res.status} ${err}`);
  }

  const rows = await res.json();
  return rows.length;
}

// ── Suppression des pending expirés (> 30 min) ───────────────────────────────
async function cleanupExpiredPending(serviceRoleKey) {
  const expiredBefore = new Date(Date.now() - PENDING_TTL_MS).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/canipaddle_bookings`
    + `?statut=eq.pending`
    + `&created_at=lt.${encodeURIComponent(expiredBefore)}`;

  await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey':        serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer':        'return=minimal',
    },
  });
}

// ── Envoi email de notification via Resend ───────────────────────────────────
async function sendNotificationEmail(booking, resendKey) {
  const isInitiation = booking.session_type === 'initiation';
  const format       = isInitiation ? 'Initiation Débutants' : 'Balade Confirmés';
  const dateFr       = formatSessionDateFr(SESSION_DATE);

  // Formater le créneau : "12:30:00" → "12h30"
  const creneauLine = isInitiation && booking.creneau
    ? `Créneau : ${booking.creneau.slice(0, 5).replace(':', 'h')}\n`
    : '';

  const chienLine = booking.nom_chien
    ? `Chien : ${booking.nom_chien}\n`
    : '';

  const subject = `Nouvelle réservation Canipaddle — ${booking.prenom} ${booking.nom}`;

  const body = [
    'Nouvelle réservation confirmée !\n',
    `Format : ${format}`,
    `Date : ${dateFr}`,
    creneauLine.trimEnd(),
    '',
    `Nom : ${booking.prenom} ${booking.nom}`,
    `Email : ${booking.email}`,
    `Téléphone : ${booking.telephone}`,
    chienLine.trimEnd(),
    '',
    'Paiement confirmé via Stripe.',
  ].filter(line => line !== null && line !== undefined && !(line === '' && false))
   .join('\n')
   .replace(/\n{3,}/g, '\n\n');

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    'Canipaddle <noreply@beachpaddle.fr>',
      to:      [NOTIF_EMAIL],
      subject,
      text:    body,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    throw new Error(`Resend error ${emailRes.status}: ${err}`);
  }

  return await emailRes.json();
}

// ── Handler principal ─────────────────────────────────────────────────────────
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookSecret   = process.env.STRIPE_WEBHOOK_SECRET;
  const resendKey       = process.env.RESEND_API_KEY;

  if (!serviceRoleKey || !webhookSecret) {
    console.error('[Webhook] Variables d\'environnement manquantes');
    return res.status(500).json({ error: 'Configuration serveur incomplète' });
  }

  // 1. Lire le body brut
  const rawBody = await getRawBody(req);
  const sig     = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Header stripe-signature manquant' });
  }

  // 2. Vérifier la signature
  if (!verifyStripeSignature(rawBody.toString(), sig, webhookSecret)) {
    console.error('[Webhook] Signature Stripe invalide — requête rejetée');
    return res.status(400).json({ error: 'Signature invalide' });
  }

  // 3. Parser l'événement
  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'JSON invalide' });
  }

  // 4. Nettoyage des pending expirés (fire-and-forget)
  cleanupExpiredPending(serviceRoleKey).catch(e =>
    console.error('[Webhook] Cleanup error:', e.message)
  );

  // 5. Router selon le type d'événement
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object;

      if (session.payment_status !== 'paid') {
        return res.status(200).json({ received: true, skipped: 'payment not completed' });
      }

      const email = session.customer_details?.email || session.customer_email;

      if (!email) {
        console.warn('[Webhook] Aucun email dans la session Stripe:', session.id);
        return res.status(200).json({ received: true, warning: 'no email found' });
      }

      let confirmedRows;
      try {
        confirmedRows = await confirmBooking(email, serviceRoleKey);
        console.log(`[Webhook] ✓ ${confirmedRows.length} réservation(s) confirmée(s) pour ${email}`);
      } catch (err) {
        console.error('[Webhook] Erreur confirmation:', err.message);
        return res.status(500).json({ error: 'Erreur mise à jour Supabase' });
      }

      // Email de notification (fire-and-forget — n'affecte pas la réponse Stripe)
      if (resendKey && confirmedRows.length > 0) {
        sendNotificationEmail(confirmedRows[0], resendKey).catch(e =>
          console.error('[Webhook] Email notification failed:', e.message)
        );
      }

      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      const email  = charge.billing_details?.email;

      if (!email) {
        console.warn('[Webhook] Aucun email dans le charge remboursé:', charge.id);
        return res.status(200).json({ received: true, warning: 'no email found' });
      }

      try {
        const cancelled = await cancelBooking(email, serviceRoleKey);
        console.log(`[Webhook] ✓ ${cancelled} réservation(s) annulée(s) pour ${email}`);
      } catch (err) {
        console.error('[Webhook] Erreur annulation:', err.message);
        return res.status(500).json({ error: 'Erreur mise à jour Supabase' });
      }
      break;
    }

    default:
      break;
  }

  return res.status(200).json({ received: true });
}

handler.config = { api: { bodyParser: false } };

module.exports = handler;
