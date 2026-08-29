export default async function handler(_req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    success: true,
    stats: null,
    message: 'Use client-side analytics from track library; server aggregation optional.',
  }))
}
