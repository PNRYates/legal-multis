const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const output = path.join(root, "dist");
const papersDir = path.join(root, "data", "papers");
const papers = fs.readdirSync(papersDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(fs.readFileSync(path.join(papersDir, name), "utf8")))
  .filter((paper) => paper.questions.length)
  .sort((a, b) => b.year - a.year || a.school.localeCompare(b.school));

fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(path.join(root, "public"), output, { recursive: true });
const index = path.join(output, "index.html");
fs.writeFileSync(index, fs.readFileSync(index, "utf8").replace('<script src="app.js', '<script data-static="true" src="app.js'));
fs.writeFileSync(path.join(output, "papers.json"), JSON.stringify(papers));
fs.writeFileSync(path.join(output, ".nojekyll"), "");
console.log(`Built ${papers.length} papers for GitHub Pages in dist/`);
