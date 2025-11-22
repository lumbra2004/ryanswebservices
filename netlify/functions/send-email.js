// Serverless function to send emails via SendGrid Web API.
// Requires these environment variables set in Netlify:
// SENDGRID_API_KEY, SENDER_EMAIL, RECIPIENT_EMAIL

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { name, contact, service, details, source } = body;
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDER_EMAIL = process.env.SENDER_EMAIL;
  const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;

  if (!SENDGRID_API_KEY || !SENDER_EMAIL || !RECIPIENT_EMAIL) {
    return { statusCode: 500, body: 'Email service not configured' };
  }

  const subject = `Website contact${source ? ' — ' + source : ''} from ${name || 'anonymous'}`;
  const html = `
    <strong>New contact submission</strong>
    <p><strong>Name:</strong> ${name || '—'}</p>
    <p><strong>Contact:</strong> ${contact || '—'}</p>
    <p><strong>Service:</strong> ${service || '—'}</p>
    <p><strong>Source:</strong> ${source || 'website'}</p>
    <p><strong>Details:</strong><br>${(details || '—').replace(/\n/g,'<br>')}</p>
  `;

  const payload = {
    personalizations: [{ to: [{ email: RECIPIENT_EMAIL }] }],
    from: { email: SENDER_EMAIL },
    subject: subject,
    content: [{ type: 'text/html', value: html }]
  };

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      return { statusCode: 502, body: `SendGrid error: ${res.status} ${text}` };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: 'Failed to send email' };
  }
};
