# Legal Studies Multis

Multiple-choice practice for HSC Legal Studies using HSC and school trial papers.

Run locally with Node.js 22 or later:

```sh
npm start
```

Open <http://localhost:3000>. Quiz history is saved in the browser; disputes are saved by the local server in `data/disputes.json`.

## GitHub Pages

The site is published at <https://pnryates.github.io/legal-multis/>. Pushes to `main` validate the papers, build the static site, and deploy it using GitHub Actions.

```sh
python3 tools/validate.py data/papers/*.json
npm run build
```

The generated site is in `dist/`. On GitHub Pages, disputes are saved in each browser, along with quiz history. They are not shared between users or devices.

Paper data lives in `data/papers/`; question images live in `public/img/`. Questions with unverified answers are marked in the quiz.
