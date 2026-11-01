import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-json-db',
      configureServer(server) {
        const dbPath = path.resolve(process.cwd(), 'public', 'db.json')

        server.middlewares.use('/api/db', (req, res) => {
          // Ürünleri Diskten Oku
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

          // Ürünleri Diske (public/db.json) Kaydet
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
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Write failed' }))
              }
            })
            return
          }
        })
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true, // Portun 5174'e kaymasını engeller
  },
})