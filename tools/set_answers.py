"""Apply answers to a paper file.

Usage: set_answers.py <paperId> <answers.json>

answers.json:
{
  "source": "official" | "thsc" | "web" | "paper" | "guess",
  "note": "default note for every answer in this file (URL or reasoning)",
  "answers": {"1": "B", "2": "A"},
  "notes": {"5": "optional per-question note overriding the default"}
}
Questions not listed are left untouched. answerStatus is recomputed.
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pid, spec_path = sys.argv[1:3]
path = os.path.join(ROOT, "data", "papers", pid + ".json")
spec = json.load(open(spec_path))
p = json.load(open(path))
by_num = {str(q["number"]): q for q in p["questions"]}
for n, letter in spec["answers"].items():
    q = by_num[n]
    assert letter in "ABCD" and len(letter) == 1, (n, letter)
    q["answer"] = letter
    q["answerSource"] = spec["source"]
    q["answerNote"] = spec.get("notes", {}).get(n) or spec["note"]
guessed = sum(q["answerSource"] == "guess" for q in p["questions"])
p["answerStatus"] = "none-found" if guessed == len(p["questions"]) else "some-guessed" if guessed else "all-verified"
json.dump(p, open(path, "w"), indent=2, ensure_ascii=False)
open(path, "a").write("\n")
sys.exit(subprocess.call([sys.executable, os.path.join(ROOT, "tools", "validate.py"), path]))
