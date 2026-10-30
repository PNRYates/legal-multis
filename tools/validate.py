import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = {"paper", "official", "thsc", "web", "guess"}


def check(path):
    errs = []
    try:
        p = json.load(open(path))
    except Exception as e:
        return [f"invalid JSON: {e}"]
    for k in ("id", "year", "school", "kind", "title", "sourceFile", "answerStatus", "groups", "questions"):
        if k not in p:
            errs.append(f"missing key {k}")
    if errs:
        return errs
    if p["id"] != os.path.basename(path)[:-5]:
        errs.append("id does not match filename")
    if p["kind"] not in ("hsc", "trial"):
        errs.append("bad kind")
    gids = {g["id"]: g for g in p["groups"]}
    nums = [q["number"] for q in p["questions"]]
    if len(nums) != len(set(nums)):
        errs.append("duplicate question numbers")
    sources = []
    for q in p["questions"]:
        n = q["number"]
        if set(q.get("options", {})) != {"A", "B", "C", "D"} or not all(str(v).strip() for v in q["options"].values()):
            errs.append(f"Q{n}: options must be A-D and non-empty")
        if q.get("answer") not in ("A", "B", "C", "D"):
            errs.append(f"Q{n}: bad answer")
        if q.get("answerSource") not in SOURCES:
            errs.append(f"Q{n}: bad answerSource")
        sources.append(q.get("answerSource"))
        if not q.get("answerNote") and q.get("answerSource") != "guess":
            errs.append(f"Q{n}: missing answerNote")
        if not q.get("stem", "").strip():
            errs.append(f"Q{n}: empty stem")
        gid = q.get("groupId")
        if gid is not None:
            if gid not in gids:
                errs.append(f"Q{n}: unknown group {gid}")
            elif n not in gids[gid]["questionNumbers"]:
                errs.append(f"Q{n}: not listed in group {gid}")
        for img in q.get("images", []):
            if not os.path.exists(os.path.join(ROOT, "public", img)):
                errs.append(f"Q{n}: missing image {img}")
    for g in p["groups"]:
        if len(g["questionNumbers"]) < 2:
            errs.append(f"group {g['id']}: fewer than 2 questions")
        for n in g["questionNumbers"]:
            q = next((q for q in p["questions"] if q["number"] == n), None)
            if not q or q.get("groupId") != g["id"]:
                errs.append(f"group {g['id']}: question {n} missing or not linked back")
        if not g.get("stimulus", "").strip() and not g.get("images"):
            errs.append(f"group {g['id']}: empty stimulus")
        for img in g.get("images", []):
            if not os.path.exists(os.path.join(ROOT, "public", img)):
                errs.append(f"group {g['id']}: missing image {img}")
    guessed = sources.count("guess")
    expected = "none-found" if sources and guessed == len(sources) else "some-guessed" if guessed else "all-verified"
    if sources and p["answerStatus"] != expected:
        errs.append(f"answerStatus should be {expected}")
    return errs


bad = 0
for f in sys.argv[1:]:
    errs = check(f)
    print(f"{f}: {'OK' if not errs else str(len(errs)) + ' error(s)'}")
    for e in errs:
        print("  -", e)
    bad += bool(errs)
sys.exit(1 if bad else 0)
