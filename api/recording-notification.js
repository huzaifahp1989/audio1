const OWNER_EMAIL = 'imediac786@gmail.com'

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RECORDING_EMAIL_FROM
  if (!apiKey || !from) throw new Error('RESEND_API_KEY and RECORDING_EMAIL_FROM are required')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { success: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    if (body.type === 'submission') {
      await sendEmail({
        to: OWNER_EMAIL,
        subject: `New Quran recording: ${String(body.title || 'Untitled').slice(0, 120)}`,
        html: `<h2>New Quran recording submitted</h2>
          <p><strong>Reciter:</strong> ${escapeHtml(body.username)}</p>
          <p><strong>Age:</strong> ${escapeHtml(body.age)} (${escapeHtml(body.audience)})</p>
          <p><strong>City:</strong> ${escapeHtml(body.city)}</p>
          <p><strong>Mosque:</strong> ${escapeHtml(body.mosque)}</p>
          <p><strong>Recording:</strong> ${escapeHtml(body.recitationDetails)}</p>
          <p><strong>Range:</strong> ${escapeHtml(body.recitationFrom)} to ${escapeHtml(body.recitationTo)}</p>
          <p><strong>Amount:</strong> ${escapeHtml(body.readingAmount)}</p>
          <p><strong>Submission date:</strong> ${escapeHtml(body.submissionDate)}</p>
          <p><strong>Feedback email:</strong> ${escapeHtml(body.contactEmail)}</p>
          <p><a href="${escapeHtml(body.audioUrl)}">Listen to recording</a></p>`,
      })
    } else if (body.type === 'feedback') {
      if (!/^\S+@\S+\.\S+$/.test(String(body.contactEmail || ''))) {
        return json(res, 400, { success: false, error: 'A valid feedback email is required' })
      }
      await sendEmail({
        to: body.contactEmail,
        subject: `Feedback on your Quran recording: ${String(body.title || 'Recording').slice(0, 120)}`,
        html: `<p>Assalamu alaikum ${escapeHtml(body.username)},</p>
          <p>Thank you for sharing your Quran recitation.</p>
          <div style="white-space:pre-wrap">${escapeHtml(body.feedback)}</div>
          <p>May Allah reward your efforts.</p>`,
      })
    } else {
      return json(res, 400, { success: false, error: 'Unknown notification type' })
    }

    return json(res, 200, { success: true })
  } catch (error) {
    console.error('[recording-notification]', error)
    return json(res, 500, { success: false, error: error?.message || 'Email failed' })
  }
}