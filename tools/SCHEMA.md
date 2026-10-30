# Extraction spec: HSC Legal Studies multiple-choice papers

Source PDFs: `/Users/peter/Obsidian/Areas/Knox/Legal Studies/Legal Past Papers/` (read-only; never modify).
Project root: `/Users/peter/Coding/legal-multis`. Python with PyMuPDF: `/Users/peter/Coding/legal-multis/.venv/bin/python` (`import pymupdf`). Use it for text extraction (`page.get_text()`), rendering pages to PNG (`page.get_pixmap(dpi=150)`) so you can look at them, and cropping figures. Some PDFs are scanned images with no text layer; render pages and read them visually.

## Task per paper

Extract **only the multiple-choice section** (Section I / Part A: normally 20 questions, 4 options A-D). Ignore short-answer, extended-response and essay sections. Some PDFs are a whole booklet that also contains marking guidelines, answer tables or sample answers; use those for answers.

Write one file per paper to `data/papers/<paperId>.json`, where `paperId` is the PDF name lowercased, without ` legal studies`/`.pdf`, spaces to `-`. Examples: `2023-hsc.json` (from `2023 HSC Legal Studies.pdf`), `2022-baulkham-hills-trial.json`, `2012-knox-trial.json`.

```json
{
  "id": "2023-hsc",
  "year": 2023,
  "school": "HSC",              // "HSC" for NESA papers, otherwise the school name, e.g. "Baulkham Hills"
  "kind": "hsc",                // "hsc" or "trial"
  "title": "2023 HSC Legal Studies",
  "sourceFile": "2023 HSC Legal Studies.pdf",
  "answerStatus": "all-verified" | "some-guessed" | "none-found",
  "notes": "short free text: anything unusual about extraction, or why the paper has fewer questions",
  "groups": [
    {
      "id": "2023-hsc-g1",
      "questionNumbers": [5, 6],
      "stimulus": "Full stimulus text, verbatim, with paragraph breaks as \n\n. May be empty string if the stimulus is only an image.",
      "images": ["img/2023-hsc/g1.png"]
    }
  ],
  "questions": [
    {
      "number": 1,
      "groupId": null,                        // or the group id if the question belongs to a shared stimulus
      "stem": "Question text, verbatim.",
      "images": [],                           // images needed to answer THIS question only, e.g. ["img/2023-hsc/q1.png"]
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "answer": "B",                          // "A".."D", never null (see answers below)
      "answerSource": "paper" | "official" | "thsc" | "web" | "guess",
      "answerNote": "Where the answer came from (URL / page) or the reasoning for a guess, one or two sentences."
    }
  ]
}
```

## Rules

- Verbatim text. Fix obvious OCR/hyphenation breakage but never reword. Use plain text; keep `\n` where line breaks matter (e.g. poems, tables written as text). Options with an image instead of text: put a short description in the option text and include the image in `images`.
- Stimulus groups: whenever one stimulus (passage, scenario, table, case extract, cartoon, graph, diagram, "Use the following information to answer Questions 5 and 6") is shared by two or more questions, create a group and set `groupId` on each of those questions. The group's `questionNumbers` lists them in order. Do **not** copy the stimulus into the question stem. A stimulus used by one question only should be put into that question's `stem` (prefixed so it reads naturally) or `images`, with no group. Instructions such as "Questions 5-6 refer to ..." are not part of the stem.
- Images: crop figures/diagrams/tables that cannot be conveyed as text to PNGs under `public/img/<paperId>/` (clip with `page.get_pixmap(dpi=160, clip=pymupdf.Rect(...))`; check the result by viewing it). Reference them in JSON as `img/<paperId>/<file>.png` (relative to `public/`). If a table is simple, transcribe it as text instead.
- Include every question in the section, even if you cannot get an answer. Number questions as printed.
- If you find that a question is clearly broken, truncated or illegible, still include it, and say so in `notes`.
- Do not invent questions. If the paper contains no multiple-choice section, write the file with empty `groups` and `questions` and explain in `notes`.

## Answers (important)

For each question, in this order:

1. The PDF itself: answer key, marking guidelines, or an annotated/ticked copy. `answerSource: "paper"`. Be careful: only trust a clear key, and check that it lines up with the question numbering.
2. For HSC papers: the NESA marking guidelines (arc.nesa.nsw.edu.au, educationstandards.nsw.edu.au; search "<year> HSC Legal Studies marking guidelines"). `answerSource: "official"`.
3. For trial papers: search online for that exact paper (school, year) on THSC (thsc.com.au / thsc.com), Boardstudies/other HSC resource sites, school sites, Reddit, Studocu etc. where a separate answer sheet or solutions file may exist. `answerSource: "thsc"` for THSC, `"web"` for any other source. Put the URL in `answerNote`.
4. If still not found, work out the best answer yourself from the HSC Legal Studies syllabus and the stimulus, and search the web for specific facts (cases, legislation, terms) to be confident. `answerSource: "guess"`. Give your reasoning in `answerNote`. Every question must have an answer, so make a call.

Never label something `paper`/`official`/`thsc`/`web` unless you actually saw that answer in that source. `answerStatus` is `all-verified` if no question is `guess`, `none-found` if every question is `guess`, else `some-guessed`.

Do the HSC/NESA paper lookups once per paper rather than per question, and spot-check a few extracted answers against your own reasoning; flag any key answer that looks wrong in `answerNote` (but keep the key's answer).

## Output validation

When finished, run `/Users/peter/Coding/legal-multis/.venv/bin/python /Users/peter/Coding/legal-multis/tools/validate.py data/papers/<paperId>.json ...` (run from the project root) for each file you wrote, and fix every error it reports.

## Handoff (final message, keep it compact)

For each paper: id, number of questions extracted, number of groups, answerStatus, counts per answerSource, and anything the supervisor must decide or double-check. Do not paste the data.

Only write inside `data/papers/` and `public/img/` for your assigned papers. Do not touch other files.
