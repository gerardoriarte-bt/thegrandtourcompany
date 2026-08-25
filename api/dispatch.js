// Vercel Serverless Function — registro para el Dispatch trimestral.
// Sin dependencias: usa la REST API de Resend vía fetch nativo (Node 18+).
//
// Variables de entorno requeridas en Vercel (Settings -> Environment Variables):
//   RESEND_API_KEY   clave de Resend
//   DISPATCH_TO      destinatario interno de los avisos
//   DISPATCH_FROM    remitente verificado en Resend (ej. dispatch@thegrandtourcompany.com)
//
// Si no estan configuradas el endpoint responde 503 y el formulario muestra
// "Failed — retry": ningun lead se pierde en silencio.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = null; }
  }

  const email = body && typeof body.email === 'string' ? body.email.trim() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.DISPATCH_TO;
  const from = process.env.DISPATCH_FROM;

  if (!key || !to || !from) {
    console.error('[dispatch] faltan RESEND_API_KEY / DISPATCH_TO / DISPATCH_FROM');
    return res.status(503).json({ error: 'not_configured' });
  }

  const source = body && typeof body.source === 'string' ? body.source.slice(0, 40) : 'unknown';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        reply_to: email,
        subject: 'Dispatch access request — ' + email,
        text: [
          'Nueva solicitud de acceso al Dispatch trimestral.',
          '',
          'Email:  ' + email,
          'Origen: ' + source,
          'Fecha:  ' + new Date().toISOString()
        ].join('\n')
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('[dispatch] resend respondio ' + r.status + ': ' + detail);
      return res.status(502).json({ error: 'upstream_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[dispatch] error de red', err);
    return res.status(502).json({ error: 'upstream_failed' });
  }
};
