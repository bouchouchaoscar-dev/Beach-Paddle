/**
 * Vercel Serverless Function — Stripe Webhook
 * URL de production : https://[ton-domaine]/api/stripe-webhook
 *
 * Variables d'environnement Vercel requises :
 *   STRIPE_WEBHOOK_SECRET     → whsec_... (depuis Stripe Dashboard > Webhooks)
 *   SUPABASE_SERVICE_ROLE_KEY → service role key Supabase
 *
 * Événements Stripe à activer :
 *   checkout.session.completed
 */

'use strict';

const crypto = require('crypto');

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://icvjwdtdbbyzkuczxvzp.supabase.co';
const SESSION_DATE      = '2026-06-06';
const PENDING_TTL_MS    = 30 * 60 * 1000; // 30 minutes

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
  return rows.length; // nombre de lignes mises à jour
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

// ── Handler principal ─────────────────────────────────────────────────────────
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookSecret   = process.env.STRIPE_WEBHOOK_SECRET;

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

  // 5. Traiter checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status !== 'paid') {
      return res.status(200).json({ received: true, skipped: 'payment not completed' });
    }

    const email = session.customer_details?.email || session.customer_email;

    if (!email) {
      console.warn('[Webhook] Aucun email dans la session Stripe:', session.id);
      return res.status(200).json({ received: true, warning: 'no email found' });
    }

    try {
      const updated = await confirmBooking(email, serviceRoleKey);
      console.log(`[Webhook] ✓ ${updated} réservation(s) confirmée(s) pour ${email}`);
    } catch (err) {
      console.error('[Webhook] Erreur confirmation:', err.message);
      return res.status(500).json({ error: 'Erreur mise à jour Supabase' });
    }
  }

  return res.status(200).json({ received: true });
}

handler.config = { api: { bodyParser: false } };

module.exports = handler;
