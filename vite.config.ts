import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-api-middlewares',
      configureServer(server) {
        const dbPath = path.resolve(process.cwd(), 'public', 'db.json')

        // 1. Yerel JSON Veritabanı (/api/db)
        server.middlewares.use('/api/db', (req, res) => {
          if (req.method === 'GET') {
            if (fs.existsSync(dbPath)) {
              const content = fs.readFileSync(dbPath, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.end(content)
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Not found' }))
            }
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk.toString()
            })
            req.on('end', () => {
              try {
                const dir = path.dirname(dbPath)
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true })
                }
                fs.writeFileSync(dbPath, body, 'utf-8')
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true }))
              } catch {
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Write failed' }))
              }
            })
            return
          }
        })

        // 2. Yerel Görsel Proxy (/api/img-proxy) - PDF CORS engeli için
        server.middlewares.use('/api/img-proxy', async (req, res) => {
          try {
            const parsedUrl = new URL(req.url || '', 'http://localhost')
            const targetUrl = parsedUrl.searchParams.get('url')

            if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
              res.statusCode = 400
              res.end('Invalid URL')
              return
            }

            const upstream = await fetch(targetUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
              },
              redirect: 'follow',
            })

            if (!upstream.ok) {
