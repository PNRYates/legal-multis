# Legal Studies Multis

Multiple-choice practice for HSC Legal Studies using HSC and school trial papers.

Run locally with Node.js 22 or later:

```sh
npm start
```

Open <http://localhost:3000>. Quiz history is saved in the browser; disputes are saved by the local server in `data/disputes.json`.

## Deployment

The deployment target is Coolify at <https://legal.peteryates.net>, serving the Node backend on port 3000 from the included Dockerfile (not `dist/`). Deploy branch `main`.

Mount a persistent Coolify volume at **`/app/storage`**. The Docker image sets `DISPUTES_FILE=/app/storage/disputes.json`; the writable directory belongs to the unprivileged `node` user (UID/GID 1000). Keep one application replica so the shared JSON file has a single writer. Do **not** mount a volume over `/app/data` or `/app/data/papers`: papers are bundled with each image.

Outside Docker, `DISPUTES_FILE` can select another persistent file path; the default remains `data/disputes.json`. Writes use atomic replacement. Back up the storage volume separately; container/image rollbacks do not roll back disputes. To verify a deployment, check `/api/papers` returns 52 papers and create a temporary dispute, redeploy, confirm it survives, then delete only that test dispute.

## Static build

A static build is also available for hosts such as GitHub Pages:

```sh
python3 tools/validate.py data/papers/*.json
npm run build
```

The generated site is in `dist/`. On GitHub Pages, disputes are saved in each browser, along with quiz history. They are not shared between users or devices.

Paper data lives in `data/papers/`; question images live in `public/img/`. Questions with unverified answers are marked in the quiz.
