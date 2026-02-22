# Protocols

When the user says **"do the [name] protocol"**, carry out the steps below for that protocol. Add new protocols to this file as needed.

---

## GitHub protocol

**Invocation:** "do the github protocol" (or "run the github protocol", "github protocol", etc.)

**Purpose:** Verify the project is in a good state to commit and provide a suggested commit message plus terminal instructions.

**Steps:**

1. **Run project checks**
   - `npm run lint` — report pass/fail and summarize any errors (file + rule, no need to fix unless user asks).
   - `npm run test` — report pass/fail and test count.
   - `npm run build` — report pass/fail.

2. **Summarize readiness**
   - State whether the project is "good to commit" (all pass) or "commit with caution" (e.g. lint failures). Do not block suggesting a commit message; the user may still want to commit.

3. **Suggest a commit message**
   - From `git status` and `git diff --stat`, infer a short, conventional-style subject (e.g. `feat: add Clubs, Segments, Feed and specs`) and optionally 1–3 bullet points for the body. Prefer present tense and lowercase subject after the type.

4. **Give terminal instructions**
   - Brief steps to commit from the repo root:
     - Stage: `git add .` or `git add <paths>` if they want to exclude something.
     - Commit: `git commit -m "subject"` or `git commit` (then paste the suggested message in the editor).
     - Optional: `git push` when ready.

Keep the whole response concise: checklist, suggested message, then the 3–4 line terminal snippet.
