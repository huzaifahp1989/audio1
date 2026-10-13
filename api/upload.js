import { handleUpload } from '@vercel/blob/client'

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
const AUDIO_FOLDERS = new Set(['audio', 'user-submissions', 'ads'])

class InvalidUploadPathError extends Error {}

function json(res, status, payload) {
	res.statusCode = status
	res.setHeader('Content-Type', 'application/json')
	res.end(JSON.stringify(payload))
}

function parseBody(req) {
	if (req.body && typeof req.body === 'object') return req.body
	if (typeof req.body === 'string') return JSON.parse(req.body)
	return {}
}

function validateUploadPath(pathname) {
	const parts = pathname.split('/')
	if (parts.length < 2 || parts.some((part) => !part || part === '.' || part === '..' || part.includes('\\'))) {
		throw new InvalidUploadPathError('Invalid upload path.')
	}

	const [folder] = parts
	if (!AUDIO_FOLDERS.has(folder) && folder !== 'images') {
		throw new InvalidUploadPathError('Uploads must use an approved audio or image folder.')
	}

	return folder === 'images' ? ['image/*'] : ['audio/*']
}

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', 'POST')
		return json(res, 405, { success: false, error: 'Method not allowed' })
	}

	try {
		const result = await handleUpload({
			body: parseBody(req),
			request: req,
			onBeforeGenerateToken: async (pathname) => ({
				allowedContentTypes: validateUploadPath(pathname),
				maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
				addRandomSuffix: true,
			}),
		})
		return json(res, 200, result)
	} catch (error) {
		return json(res, error instanceof InvalidUploadPathError ? 400 : 500, {
			success: false,
			error: error?.message || 'Upload failed',
		})
	}
}
