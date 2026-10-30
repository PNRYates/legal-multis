const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const PAPERS = path.join(ROOT, "data", "papers");
const DISPUTES = path.join(ROOT, "data", "disputes.json");
const PORT = process.env.PORT || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const readDisputes = () => (fs.existsSync(DISPUTES) ? JSON.parse(fs.readFileSync(DISPUTES, "utf8")) : []);
const writeDisputes = (list) => {
  fs.mkdirSync(path.dirname(DISPUTES), { recursive: true });
  fs.writeFileSync(DISPUTES, JSON.stringify(list, null, 2) + "\n");
};

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "Content-Type": type });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

const loadPapers = () =>
  fs
    .readdirSync(PAPERS)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PAPERS, f), "utf8")))
    .filter((p) => p.questions.length)
    .sort((a, b) => b.year - a.year || a.school.localeCompare(b.school));

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname === "/api/papers" && req.method === "GET") return send(res, 200, loadPapers());

      if (url.pathname === "/api/disputes") {
        if (req.method === "GET") return send(res, 200, readDisputes());
        if (req.method === "POST") {
          const b = JSON.parse(await readBody(req));
          const d = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            paperId: String(b.paperId),
            questionNumber: Number(b.questionNumber),
            questionStem: String(b.questionStem || ""),
            storedAnswer: String(b.storedAnswer),
            suggestedAnswer: b.suggestedAnswer ? String(b.suggestedAnswer) : null,
            comment: String(b.comment || ""),
          };
          writeDisputes([...readDisputes(), d]);
          return send(res, 201, d);
        }
      }

      const del = url.pathname.match(/^\/api\/disputes\/([\w-]+)$/);
      if (del && req.method === "DELETE") {
        writeDisputes(readDisputes().filter((d) => d.id !== del[1]));
        return send(res, 200, { ok: true });
      }

      if (req.method === "GET") {
        const file = path.normalize(path.join(PUBLIC, url.pathname === "/" ? "index.html" : url.pathname));
        if (file.startsWith(PUBLIC + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
          return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || "application/octet-stream");
        }
      }
      send(res, 404, { error: "not found" });
    } catch (e) {
      send(res, 500, { error: e.message });
    }
  })
  .listen(PORT, () => console.log(`Legal multis quiz on http://localhost:${PORT}`));
