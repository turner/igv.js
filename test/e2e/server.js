// Static file server for the Playwright suite: serves the repo root, with byte-range support
// (indexed FASTA and other indexed readers fetch by range). No dependencies, so the suite runs offline.
//
//   node test/e2e/server.js [port]

import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const port = Number(process.argv[2] || 8765)

const contentTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png"
}

const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname)
    const file = path.join(root, pathname)
    if (!file.startsWith(root + path.sep)) {
        res.writeHead(403)
        return res.end()
    }

    fs.stat(file, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404)
            return res.end()
        }

        const headers = {
            "content-type": contentTypes[path.extname(file)] || "application/octet-stream",
            "accept-ranges": "bytes",
            "cache-control": "no-store"
        }

        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "")
        if (range) {
            const start = range[1] === "" ? Math.max(0, stat.size - Number(range[2])) : Number(range[1])
            const end = range[1] === "" || range[2] === "" ? stat.size - 1 : Math.min(Number(range[2]), stat.size - 1)
            if (start > end || start >= stat.size) {
                res.writeHead(416, {"content-range": `bytes */${stat.size}`})
                return res.end()
            }
            res.writeHead(206, {
                ...headers,
                "content-range": `bytes ${start}-${end}/${stat.size}`,
                "content-length": end - start + 1
            })
            fs.createReadStream(file, {start, end}).pipe(res)
        } else {
            res.writeHead(200, {...headers, "content-length": stat.size})
            fs.createReadStream(file).pipe(res)
        }
    })
})

server.listen(port, "127.0.0.1", () => console.log(`Serving ${root} at http://127.0.0.1:${port}`))
