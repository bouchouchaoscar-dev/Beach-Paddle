'use strict';

/**
 * Vercel Cron Function — Nettoyage des réservations pending expirées
 * Schedule : voir vercel.json (crons)
 * Supprime les lignes statut='pending' créées il y a plus de 30 minutes.
 */

const SUPABASE_URL   = 'https://icvjwdtdbbyzkuczxvzp.supabase.co';
const PENDING_TTL_MS = 30 * 60 * 1000;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method Not Allowed');
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' });
  }

  const expiredBefore = new Date(Date.now() - PENDING_TTL_MS).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/canipaddle_bookings`
    + `?statut=eq.pending`
    + `&created_at=lt.${encodeURIComponent(expiredBefore)}`;

  try {
    const deleteRes = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey':        serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer':        'return=representation',
      },
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.text();
      return res.status(500).json({ error: `Supabase DELETE failed: ${deleteRes.status} ${err}` });
    }

    const deleted = await deleteRes.json();
    const count   = Array.isArray(deleted) ? deleted.length : 0;
    console.log(`[Cleanup] ${count} pending(s) supprimé(s)`);
    return res.status(200).json({ ok: true, deleted: count });

  } catch (err) {
    console.error('[Cleanup] Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
