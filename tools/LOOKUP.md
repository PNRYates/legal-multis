# Answer lookup task

The papers in `data/papers/<paperId>.json` were extracted from NSW HSC Legal Studies past papers (multiple-choice section). Their answers are currently all `"guess"` because the source PDF had no key. Your job is to find the real answer key for each assigned paper on the web and write it in.

Search order:
1. HSC papers: NESA marking guidelines for that year (educationstandards.nsw.edu.au / nsw.gov.au HSC exam packs / arc.nesa.nsw.edu.au). Copies of the marking guidelines also appear on Studocu, Course Hero, simplestudy.io and similar sites; a copy is fine as long as it shows the Section I answer key for the right year. Cross-check at least a few answers against the question text in the JSON so you are sure the key belongs to this paper and numbering lines up (watch for different paper versions or years). `source: "official"`.
2. Trial papers: THSC (thsc.com.au / thsc.com), then other sources (Studocu, school sites, Reddit, tutoring sites, HSC resource sites). Search the school + year + "Legal Studies trial" and also distinctive question text. `source: "thsc"` for THSC, `"web"` for others. Only use a key when you are sure it is for this exact paper (check a few questions against the text).
3. If no key exists for a paper, leave it as guess, but improve the guesses: for each question re-check the answer using the syllabus knowledge and searches for specific cases/legislation/terms, and fix wrong guesses (source stays `guess`, note explains the reasoning in one or two sentences). Questions with two plausible answers should say so in the note.

Fetch PDF/HTML content with WebFetch (it can read PDFs at URLs). Never claim a source you did not actually read. In notes put the URL.

Applying answers: write a JSON file (outside data/, e.g. /tmp/<paperId>-answers.json) and run
`/Users/peter/Coding/legal-multis/.venv/bin/python /Users/peter/Coding/legal-multis/tools/set_answers.py <paperId> /tmp/<paperId>-answers.json`
Format is documented at the top of tools/set_answers.py. Do not edit the paper JSON by hand, and do not touch questions' text.

If a question's text in the JSON looks wrong or truncated compared with what you see in the online paper, do not fix it; list it in your report.

Report (compact): per paper: where the key came from (source + URL) or "no key found", how many guess answers you changed, and any extracted-question problems or answer-key disputes (key answer that seems wrong).
