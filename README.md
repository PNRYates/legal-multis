# Legal Studies Multis

Multiple-choice practice for HSC Legal Studies using HSC and school trial papers.

Run locally with Node.js 22 or later:

```sh
npm start
```

Open <http://localhost:3000>. Quiz history is saved in the browser; disputes are saved by the local server in `data/disputes.json`.

## Deployment

The deployment target is Coolify at <https://legal.peteryates.net>, running `npm start` on port 3000. Persist `data/disputes.json` across deployments so disputes remain shared between users.

## Static build

A static build is also available for hosts such as GitHub Pages:

```sh
python3 tools/validate.py data/papers/*.json
npm run build
```

The generated site is in `dist/`. On GitHub Pages, disputes are saved in each browser, along with quiz history. They are not shared between users or devices.

Paper data lives in `data/papers/`; question images live in `public/img/`. Questions with unverified answers are marked in the quiz.
