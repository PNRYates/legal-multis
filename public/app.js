const app = document.getElementById("app");
const LETTERS = ["A", "B", "C", "D"];
const store = {
  get: (k, d) => JSON.parse(localStorage.getItem(k) || "null") ?? d,
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

let papers = [];
let quiz = null;

const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (v !== false && v != null) el[k] = v;
  }
  el.append(...kids.flat().filter((x) => x != null && x !== false));
  return el;
};

const staticMode = document.currentScript.dataset.static === "true";
const api = async (url, opts = {}) => {
  if (staticMode && url.startsWith("/api/disputes")) {
    const list = store.get("disputes", []);
    if (opts.method === "POST") {
      const dispute = {
        ...JSON.parse(opts.body),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      store.set("disputes", [...list, dispute]);
      return dispute;
    }
    if (opts.method === "DELETE") {
      const id = url.split("/").pop();
      store.set("disputes", list.filter((d) => d.id !== id));
      return { ok: true };
    }
    return list;
  }
  const response = await fetch(staticMode && url === "/api/papers" ? "papers.json" : url, opts);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};
const key = (paperId, n) => `${paperId}#${n}`;
const isGuess = (q) => q.answerSource === "guess";
const accepted = (q) => [q.answer, ...(q.alsoAccept || [])];
const isRight = (q, L) => accepted(q).includes(L);

const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const images = (srcs = []) => srcs.map((s) => h("img", { class: "fig", src: s, alt: "" }));

async function refreshDisputeCount() {
  const list = await api("/api/disputes");
  document.getElementById("dispute-count").textContent = list.length ? `(${list.length})` : "";
}

/* ---------- setup ---------- */

function renderSetup() {
  quiz = null;
  const saved = store.get("setup", {});
  const selected = new Set(saved.selected || papers.map((p) => p.id));
  const history = store.get("history", {});

  const boxes = new Map();
  const paperList = (kind) =>
    h(
      "div",
      { class: "papers" },
      papers
        .filter((p) => p.kind === kind)
        .map((p) => {
          const cb = h("input", { type: "checkbox", checked: selected.has(p.id) });
          boxes.set(p.id, cb);
          return h("label", {}, cb, h("span", {}, `${p.year} ${p.school}`, h("span", { class: "muted" }, ` · ${p.questions.length}`)));
        })
    );

  const setAll = (pred) => boxes.forEach((cb, id) => (cb.checked = pred(papers.find((p) => p.id === id))));

  const pool = h(
    "select",
    {},
    h("option", { value: "all" }, "All questions"),
    h("option", { value: "unseen" }, "Unseen only"),
    h("option", { value: "wrong" }, "Previously wrong only")
  );
  pool.value = saved.pool || "all";
  const count = h("input", { type: "number", min: 1, value: saved.count || 20, style: "width:80px" });
  const shuffled = h("input", { type: "checkbox", checked: saved.shuffle ?? true });
  const withGuesses = h("input", { type: "checkbox", checked: saved.guesses ?? true });
  const msg = h("div", { class: "muted" });

  const start = () => {
    const ids = [...boxes].filter(([, cb]) => cb.checked).map(([id]) => id);
    const settings = { selected: ids, pool: pool.value, count: +count.value, shuffle: shuffled.checked, guesses: withGuesses.checked };
    store.set("setup", settings);

    let units = [];
    for (const p of papers.filter((p) => ids.includes(p.id))) {
      const seen = new Set();
      for (const q of p.questions) {
        if (seen.has(q.number)) continue;
        const group = q.groupId ? p.groups.find((g) => g.id === q.groupId) : null;
        const qs = group ? group.questionNumbers.map((n) => p.questions.find((x) => x.number === n)) : [q];
        qs.forEach((x) => seen.add(x.number));
        units.push({ paper: p, group, questions: qs });
      }
    }
    units = units.filter((u) => {
      if (!settings.guesses && u.questions.some(isGuess)) return false;
      const rec = u.questions.map((q) => history[key(u.paper.id, q.number)]);
      if (settings.pool === "unseen") return rec.every((r) => !r);
      if (settings.pool === "wrong") return rec.some((r) => r && r.lastCorrect === false);
      return true;
    });
    if (!units.length) return (msg.textContent = "No questions match those settings.");
    if (settings.shuffle) units = shuffle(units);
    // cap by question count, never splitting a stimulus group
    let total = 0;
    units = units.filter((u) => (total < settings.count ? ((total += u.questions.length), true) : false));
    quiz = { units, index: 0, state: units.map(() => ({ chosen: {}, submitted: false })) };
    renderQuestion();
  };

  app.replaceChildren(
    h("h1", {}, "Legal Studies multiple choice"),
    h(
      "div",
      { class: "card" },
      h("h2", { style: "margin-top:0" }, "Papers"),
      h("div", { class: "row" },
        h("button", { onclick: () => setAll(() => true) }, "All"),
        h("button", { onclick: () => setAll(() => false) }, "None"),
        h("button", { onclick: () => setAll((p) => p.kind === "hsc") }, "HSC only"),
        h("button", { onclick: () => setAll((p) => p.kind === "trial") }, "Trials only")
      ),
      h("h2", {}, "HSC"),
      paperList("hsc"),
      h("h2", {}, "Trials"),
      paperList("trial")
    ),
    h(
      "div",
      { class: "card" },
      h("div", { class: "row" }, h("span", {}, "Questions:"), pool, h("span", {}, "Up to"), count),
      h("label", { class: "opt" }, shuffled, "Shuffle order"),
      h("label", { class: "opt" }, withGuesses, "Include questions with unverified (guessed) answers")
    ),
    h("div", { class: "row" }, h("button", { class: "primary", onclick: start }, "Start quiz"), msg)
  );
}

/* ---------- quiz ---------- */

function renderQuestion() {
  const u = quiz.units[quiz.index];
  const st = quiz.state[quiz.index];
  const total = quiz.units.length;
  const p = u.paper;

  const rerender = () => renderQuestion();

  const questionEls = u.questions.map((q) => {
    const chosen = st.chosen[q.number];
    const right = isRight(q, chosen);
    const els = [
      h("div", { class: "stem" }, (u.questions.length > 1 ? `Q${q.number}. ` : "") + q.stem),
      ...images(q.images),
      ...LETTERS.map((L) => {
        let cls = "option";
        if (st.submitted) {
          if (isRight(q, L)) cls += " correct";
          else if (L === chosen) cls += " wrong";
        } else if (L === chosen) cls += " selected";
        return h(
          "button",
          {
            class: cls,
            disabled: st.submitted,
            onclick: () => {
              st.chosen[q.number] = L;
              rerender();
            },
          },
          h("span", { class: "letter" }, L),
          h("span", { class: "text" }, q.options[L])
        );
      }),
    ];
    if (st.submitted) els.push(...renderFeedback(p, q, chosen, right));
    return h("div", { class: "question" }, els);
  });

  const allAnswered = u.questions.every((q) => st.chosen[q.number]);
  const last = quiz.index === total - 1;

  const submit = () => {
    st.submitted = true;
    const history = store.get("history", {});
    for (const q of u.questions) {
      const k = key(p.id, q.number);
      const prev = history[k] || { attempts: 0, correct: 0 };
      const ok = isRight(q, st.chosen[q.number]);
      history[k] = { attempts: prev.attempts + 1, correct: prev.correct + ok, lastCorrect: ok };
    }
    store.set("history", history);
    rerender();
  };
  const next = () => {
    if (last) return renderResults();
    quiz.index++;
    renderQuestion();
  };

  app.replaceChildren(
    h("div", { class: "progress" }, h("div", { style: `width:${(quiz.index / total) * 100}%` })),
    h("div", { class: "meta muted" },
      h("span", {}, `Question ${quiz.index + 1} of ${total}`),
      h("span", {}, `${p.year} ${p.school}`)
    ),
    h("div", { class: "card" },
      u.group ? [h("div", { class: "stimulus" }, u.group.stimulus), ...images(u.group.images)] : null,
      questionEls
    ),
    h("div", { class: "row" },
      h("button", { onclick: () => { if (confirm("End this quiz?")) renderSetup(); } }, "Quit"),
      h("span", { class: "spacer" }),
      st.submitted
        ? h("button", { class: "primary", onclick: next }, last ? "See results" : "Next")
        : h("button", { class: "primary", disabled: !allAnswered, onclick: submit }, "Submit")
    )
  );
}

function renderFeedback(p, q, chosen, right) {
  const out = [
    h("div", { class: `result ${right ? "good" : "bad"}` }, right ? "Correct" : `Incorrect. The answer is ${accepted(q).join(" or ")}.`),
  ];
  if (isGuess(q)) {
    out.push(
      h("div", { class: "guess" }, h("strong", {}, "Unverified, no answer key. "), q.answerNote),
      disputeBox(p, q)
    );
  } else if (q.answerNote) {
    out.push(h("div", { class: "muted", style: "margin-top:6px" }, `Source: ${q.answerSource}. ${q.answerNote}`));
  }
  return out;
}

function disputeBox(p, q) {
  const comment = h("textarea", { placeholder: "Why do you think this answer is wrong? (optional)" });
  const suggested = h("select", {}, h("option", { value: "" }, "Not sure"), LETTERS.map((L) => h("option", { value: L }, L)));
  const status = h("span", { class: "muted" });
  const save = h("button", {
    onclick: async () => {
      save.disabled = true;
      await api("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: p.id,
          questionNumber: q.number,
          questionStem: q.stem,
          storedAnswer: q.answer,
          suggestedAnswer: suggested.value,
          comment: comment.value,
        }),
      });
      status.textContent = "Saved. You can review it under Disputes.";
      refreshDisputeCount();
    },
  }, "Dispute this answer");
  return h("div", { class: "dispute" },
    comment,
    h("div", { class: "row" }, h("span", {}, "I think it's:"), suggested, save, status)
  );
}

/* ---------- results ---------- */

function renderResults() {
  const rows = [];
  let correct = 0;
  let total = 0;
  quiz.units.forEach((u, i) => {
    for (const q of u.questions) {
      const chosen = quiz.state[i].chosen[q.number];
      total++;
      if (isRight(q, chosen)) correct++;
      else rows.push({ u, q, chosen });
    }
  });
  app.replaceChildren(
    h("h1", {}, "Results"),
    h("div", { class: "card" },
      h("div", { class: "score" }, `${correct} / ${total}`),
      h("div", { class: "muted" }, `${Math.round((correct / total) * 100)}%`)
    ),
    rows.length
      ? h("div", { class: "card" },
          h("h2", { style: "margin-top:0" }, "Missed"),
          h("table", {},
            h("tr", {}, h("th", {}, "Paper"), h("th", {}, "Q"), h("th", {}, "You"), h("th", {}, "Answer")),
            rows.map(({ u, q, chosen }) =>
              h("tr", {},
                h("td", {}, `${u.paper.year} ${u.paper.school}`),
                h("td", {}, q.number),
                h("td", {}, chosen),
                h("td", {}, accepted(q).join("/"), isGuess(q) ? h("span", { class: "badge" }, "guess") : null)
              )
            )
          )
        )
      : null,
    h("button", { class: "primary", onclick: renderSetup }, "New quiz")
  );
}

/* ---------- disputes ---------- */

async function renderDisputes() {
  const list = await api("/api/disputes");
  const byId = new Map(papers.map((p) => [p.id, p]));
  app.replaceChildren(
    h("h1", {}, "Disputed answers"),
    list.length ? null : h("p", { class: "muted" }, "Nothing disputed yet."),
    [...list].reverse().map((d) => {
      const p = byId.get(d.paperId);
      const q = p && p.questions.find((x) => x.number === d.questionNumber);
      return h("div", { class: "card" },
        h("div", { class: "muted" },
          `${p ? `${p.year} ${p.school}` : d.paperId} · Q${d.questionNumber} · ${new Date(d.createdAt).toLocaleString("en-AU")}`
        ),
        h("div", { class: "stem", style: "margin-top:8px" }, d.questionStem),
        q ? LETTERS.map((L) => h("div", {}, h("strong", {}, `${L}. `), q.options[L])) : null,
        h("p", {}, `Stored answer: ${d.storedAnswer}`, d.suggestedAnswer ? ` · You think: ${d.suggestedAnswer}` : ""),
        q && q.answerNote ? h("p", { class: "muted" }, `Reasoning for stored answer: ${q.answerNote}`) : null,
        d.comment ? h("p", {}, d.comment) : null,
        h("button", {
          onclick: async () => {
            await api(`/api/disputes/${d.id}`, { method: "DELETE" });
            refreshDisputeCount();
            renderDisputes();
          },
        }, "Remove")
      );
    })
  );
}

/* ---------- boot ---------- */

function route() {
  if (location.hash === "#/disputes") renderDisputes();
  else if (!quiz) renderSetup();
}
window.addEventListener("hashchange", () => (location.hash === "#/disputes" ? renderDisputes() : quiz ? renderQuestion() : renderSetup()));

document.addEventListener("keydown", (e) => {
  if (!quiz || /^(TEXTAREA|SELECT|INPUT)$/.test(e.target.tagName)) return;
  const st = quiz.state[quiz.index];
  const u = quiz.units[quiz.index];
  if (!st) return;
  if (e.key === "Enter") {
    if (e.target.tagName === "BUTTON") return;
    const btn = [...document.querySelectorAll("button.primary")].pop();
    if (btn && !btn.disabled) btn.click();
    return;
  }
  const idx = "abcd".indexOf(e.key.toLowerCase());
  const n = idx >= 0 ? idx : "1234".indexOf(e.key);
  if (n < 0 || st.submitted) return;
  // multi-question units: answer the first unanswered question
  const q = u.questions.find((x) => !st.chosen[x.number]) || u.questions[u.questions.length - 1];
  st.chosen[q.number] = LETTERS[n];
  renderQuestion();
});

(async () => {
  papers = await api("/api/papers");
  refreshDisputeCount();
  route();
})();
