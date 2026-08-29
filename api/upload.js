import { put } from '@vercel/blob'
import formidable from 'formidable'
import fs from 'node:fs/promises'

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

function parseForm(req) {
	const form = formidable({
		multiples: false,
		maxFileSize: MAX_FILE_SIZE_BYTES,
		keepExtensions: true,
	})

	return new Promise((resolve, reject) => {
		form.parse(req, (err, fields, files) => {
			if (err) {
				reject(err)
				return
			}
			resolve({ fields, files })
		})
	})
}

function json(res, status, payload) {
	res.statusCode = status
	res.setHeader('Content-Type', 'application/json')
	res.end(JSON.stringify(payload))
}

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', 'POST')
		return json(res, 405, { success: false, error: 'Method not allowed' })
	}

	try {
		const { fields, files } = await parseForm(req)
		const uploaded = Array.isArray(files.file) ? files.file[0] : files.file

		if (!uploaded) {
			return json(res, 400, { success: false, error: 'No file provided. Use field name "file".' })
		}

		const folder = typeof fields.folder === 'string' && fields.folder.trim() ? fields.folder.trim() : 'uploads'
		const safeName = uploaded.originalFilename || uploaded.newFilename || 'upload.bin'
		const pathname = `${folder}/${Date.now()}-${safeName}`

		const fileBuffer = await fs.readFile(uploaded.filepath)
		const blob = await put(pathname, fileBuffer, {
			access: 'public',
			addRandomSuffix: true,
			contentType: uploaded.mimetype || 'application/octet-stream',
		})

		return json(res, 200, {
			success: true,
			url: blob.url,
			pathname: blob.pathname,
			size: uploaded.size,
			contentType: uploaded.mimetype || null,
		})
	} catch (error) {
		return json(res, 500, {
			success: false,
			error: error?.message || 'Upload failed',
		})
	}
}
