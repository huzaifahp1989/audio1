import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import formidable from 'formidable'
import fs from 'node:fs/promises'
import path from 'node:path'

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

function devUploadApiPlugin(): Plugin {
  return {
    name: 'dev-upload-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/upload')) return next()
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Allow', 'POST')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: false, error: 'Method not allowed' }))
          return
        }

        const form = formidable({
          multiples: false,
          maxFileSize: MAX_FILE_SIZE_BYTES,
          keepExtensions: true,
        })

        form.parse(req, async (err, fields, files) => {
          if (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: err.message || 'Upload failed' }))
            return
          }

          try {
            const uploadedFile = Array.isArray((files as any).file) ? (files as any).file[0] : (files as any).file
            if (!uploadedFile) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: 'No file provided. Use field name "file".' }))
              return
            }

            const folderField = Array.isArray((fields as any).folder) ? (fields as any).folder[0] : (fields as any).folder
            const rawFolder = typeof folderField === 'string' ? folderField.trim() : 'uploads'
            const safeFolder = (rawFolder || 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads'

            const originalName = uploadedFile.originalFilename || uploadedFile.newFilename || 'upload.bin'
            const safeName = String(originalName).replace(/[^a-zA-Z0-9._-]/g, '_')
            const fileName = `${Date.now()}-${safeName}`
            const pathname = `${safeFolder}/${fileName}`

            // If BLOB_READ_WRITE_TOKEN is set, upload to Vercel Blob so the
            // file is on the CDN and accessible from every device/user.
            const blobToken = process.env.BLOB_READ_WRITE_TOKEN
            if (blobToken) {
              try {
                const { put } = await import('@vercel/blob')
                const fileBuffer = await fs.readFile(uploadedFile.filepath)
                const blob = await put(pathname, fileBuffer, {
                  access: 'public',
                  addRandomSuffix: true,
                  contentType: uploadedFile.mimetype || 'application/octet-stream',
                  token: blobToken,
                })
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  success: true,
                  url: blob.url,
                  pathname: blob.pathname,
                  size: uploadedFile.size,
                  contentType: uploadedFile.mimetype || null,
                }))
                return
              } catch (blobErr: any) {
                // Blob upload failed — fall through to local save below.
                console.warn('[dev-upload] Vercel Blob upload failed, falling back to local:', blobErr?.message)
              }
            }

            // No blob token (or blob failed): save to public/ for local dev only.
            const targetDir = path.join(process.cwd(), 'public', safeFolder)
            await fs.mkdir(targetDir, { recursive: true })
            const targetPath = path.join(targetDir, fileName)
            await fs.copyFile(uploadedFile.filepath, targetPath)
            const url = `/${pathname}`

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: true,
              url,
              pathname,
              size: uploadedFile.size,
              contentType: uploadedFile.mimetype || null,
            }))
          } catch (fileErr: any) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: fileErr?.message || 'Upload failed' }))
          }
        })
      })
    },
  }
}

function devYoutubeImportApiPlugin(): Plugin {
  return {
    name: 'dev-youtube-import-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/youtube-import')) return next()

        const sendJson = (status: number, payload: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        }

        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST')
          return sendJson(405, { success: false, error: 'Method not allowed' })
        }

        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const raw = Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '').trim()
          const body = raw ? JSON.parse(raw) : {}

          const yt = await import('./api/_youtube.js')
          const videoId = yt.extractVideoId(body.url || body.videoId)
          if (!videoId) {
            return sendJson(400, { success: false, error: 'Enter a valid YouTube URL or video ID.' })
          }

          const action = body.action === 'download' ? 'download' : 'info'

          if (action === 'info') {
            const info = await yt.fetchVideoInfo(videoId)
            return sendJson(200, { success: true, ...info })
          }

          const deadline = Date.now() + 55_000
          const info = await yt.fetchVideoInfo(videoId).catch(() => ({
            videoId,
            title: '',
            author: '',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          }))

          const converted = await yt.convertToMp3(videoId, {
            rapidApiKey: process.env.RAPIDAPI_KEY,
            rapidApiHost: process.env.RAPIDAPI_YT_MP3_HOST,
            deadline,
          })

          const { buffer, contentType } = await yt.downloadToBuffer(converted.link, { deadline })
          const title = info.title || converted.title || videoId
          const fileName = `${yt.sanitizeFileName(title)}.mp3`

          const blobToken = process.env.BLOB_READ_WRITE_TOKEN
          let url: string
          if (blobToken) {
            url = await yt.uploadBufferToBlob(buffer, `youtube/${Date.now()}-${fileName}`, contentType || 'audio/mpeg', blobToken)
          } else {
            const targetDir = path.join(process.cwd(), 'public', 'audio')
            await fs.mkdir(targetDir, { recursive: true })
            const localName = `${Date.now()}-${fileName}`
            await fs.writeFile(path.join(targetDir, localName), buffer)
            url = `/audio/${localName}`
          }

          return sendJson(200, {
            success: true,
            url,
            title,
            author: info.author || '',
            thumbnail: info.thumbnail,
            duration: converted.duration,
            fileName,
            fileSize: buffer.length,
            contentType: contentType || 'audio/mpeg',
          })
        } catch (err: any) {
          return sendJson(500, { success: false, error: err?.message || 'YouTube import failed' })
        }
      })
    },
  }
}

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    strictPort: false,
  },
  plugins: [
    react(),
    tailwindcss(),
    devUploadApiPlugin(),
    devYoutubeImportApiPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
})
