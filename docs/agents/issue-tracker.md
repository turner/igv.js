# Issue tracker: GitHub

Issues and specs live as GitHub issues on **`turner/igv.js`** — this clone's `origin`, a fork of `igvteam/igv.js`. Use the `gh` CLI for all operations.

## Firewall: never write to `igvteam/igv.js`

This fork is an experimental workspace. **Nothing produced here goes upstream.** Agents must never create, comment on, label, close, or reopen an issue on `igvteam/igv.js`, and must never open a pull request against it.

Reading upstream is fine and often useful — an upstream bug report is legitimate context for an experiment here. Cite it by URL; don't reply to it.

`gh repo set-default turner/igv.js` is set in this clone, so bare `gh issue` and `gh pr` commands resolve to the fork. That's the safety net, not the rule — an explicit `--repo igvteam/igv.js` on a write would bypass it, so don't write one.

If work here ever *should* go upstream, that is a human decision, made explicitly, outside these skills.

## Working across two clones

The firewall above has a structural consequence: **the clone you explore in is often not the clone you file in.** A grilling session run in an `igvteam/igv.js` checkout cannot publish anything here, and this fork holds none of that session's context. That gap will recur; it is not a one-off.

Crossing it is a `/handoff`, not an issue body. Write the handoff file, open a fresh session in this clone against it, then let the normal flow resume — `/to-spec`, `/to-tickets`, `/implement`.

What belongs where:

- **Handoff file** — the re-hydration payload: the reasoning, the options weighed and rejected, the provenance of the grilling. Link to it from the issue; never paste it in.
- **Issue** — the contract: problem, solution, and the decisions that bind an implementer. House style caps apply.
- **`docs/specs/<slug>.md`** — a spec that outgrew its issue. The issue links to it. Worked example: issue #1 carries the contract, [`docs/specs/load-resilience.md`](../specs/load-resilience.md) carries the user stories and the decisions in full.

**Symptom that this step was skipped:** an issue that reads like a session transcript — user stories enumerated, alternatives weighed inline, notes addressed to whoever implements it. That material is re-hydration doing its job in the wrong artifact. Move it to the handoff or the spec file and leave the contract behind.

## Conventions

Commands resolve to `turner/igv.js` via the pinned default; `--repo turner/igv.js` is shown for clarity and is safe to keep.

- **Create an issue**: `gh issue create --repo turner/igv.js --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

## House style: brevity

Everything written to the tracker — tickets, agent briefs, triage comments, PR bodies — is a working document, not a report. Write to the cap, then cut.

| Document | Cap |
| --- | --- |
| Ticket body (`/to-tickets`) | 150 words |
| Agent brief (`/triage` → `ready-for-agent`) | 250 words |
| Triage comment, needs-info notes | 100 words |
| PR body | 100 words |

A spec published by `/to-spec` is **exempt**. It is the condensate of a whole grilling session; cutting it throws that thinking away. Everything downstream of it is disposable and gets the cap.

**`gh pr create` bypasses `.github/pull_request_template.md`** — GitHub applies that file only in the web UI. When opening a PR from the CLI, reproduce its shape by hand: `## What`, `## Why`, `## Verified by`, then `Closes #<n>`.

These rules override any template a skill supplies:

- **Omit a section rather than fill it.** A template's headings are available, not mandatory. Drop "Current behavior" when the title already says it. Drop "Out of scope" unless someone could plausibly overreach.
- One line per bullet. No sub-bullets.
- Don't restate the title, the parent issue, or the conversation that produced the ticket. The reader has them.
- **Prefer a pointer to a paragraph** — `trackViewport.js:FeatureCache`, `TrackBase.getState()`, `chromAlias*.js`. This overrides "never reference file paths" in the triage skill's `AGENT-BRIEF.md`: a stale pointer costs one grep, and the prose written to avoid it costs every reader.
- No preamble, no summary of what the document is about to say, no closing recap.

### Worked example — an agent brief at the right length

```markdown
## Agent Brief

**Category:** bug

Locus search by RefSeq accession fails on 2bit genomes: the search path
string-matches chromosome names instead of resolving through `chromAlias*.js`.

**Acceptance criteria:**
- [ ] `NC_000001.11` and `chr1` resolve to the same locus
- [ ] Regression test covers a genome whose primary names are accessions

**Out of scope:** the alias file loaders themselves.
```

Note what is absent: no "Current behavior" heading restating the title, no "Key interfaces" list where one symbol name does the job, no worked prose where a pointer suffices. Match this register, not the longer examples in the skill's own reference docs.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

PRs opened from here target `turner/igv.js`. A fork's PR base defaults to its parent, so **always pass `--base master --repo turner/igv.js`** when creating one.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue on `turner/igv.js`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/turner/igv.js/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/turner/igv.js/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
