# Fork and upstream workflow

How work done in this fork (`turner/igv.js`) gets built, tested, and eventually
proposed to `igvteam/igv.js`.

This file is fork-only. It never goes upstream.

## The goal

Simulate an independent contributor: fork igv.js, build a feature, propose it.
An outside contributor's path is four commands — branch, commit, push, open PR.
Ours is nearly that. The one wrinkle is that this fork's `master` carries
agent scaffolding (`CLAUDE.md`'s agent sections, `CONTEXT.md`, `docs/agents/`,
`docs/adr/`, `docs/specs/`, `.github/pull_request_template.md`) that upstream
must never see. Everything below exists to handle that one wrinkle, and nothing
else.

The scaffolding is **documentation only** — no JavaScript, no build config. So a
branch with it and a branch without it compile and test identically. That is what
makes the approach safe.

## Remotes

| Remote | Points at | Use |
| --- | --- | --- |
| `origin` | `turner/igv.js` | fetch + push. Everything we do. |
| `upstream` | `igvteam/igv.js` | **fetch only.** Push is disabled. |

```bash
git remote add upstream https://github.com/igvteam/igv.js.git
git remote set-url --push upstream no_push    # hard stop against accidental writes
git fetch upstream
```

`no_push` is not a real URL, so any `git push upstream` fails immediately
instead of doing something regrettable. Reading upstream is expected and useful;
writing to it is a human decision made deliberately, outside this workflow.

To see exactly what this fork adds on top of upstream at any time:

```bash
git log --oneline upstream/master..master
```

## Branches

```
upstream/master ──────────────────────────────────────────►  (igvteam)
     │
     └── master ──────────────────────────────────►  fork trunk: upstream code
          │        (scaffolding lives here)            + agent scaffolding
          │
          ├── base/load-resilience   ← marker: where the feature branch began
          │
          └── load-resilience ───────────────────►  all seven tickets land here
                                                     build & test here

           propose/load-resilience ──────────────►  GENERATED. The upstream PR.
                                                     feature commits replayed
                                                     onto upstream/master
```

**`master`** — the fork's trunk. Upstream code plus the scaffolding. Never
proposed upstream. Feature branches are cut from it so that agents working on
them can still read `CLAUDE.md`, `CONTEXT.md`, and the spec.

**`load-resilience`** — the working branch. All seven tickets (#3–#9)
accumulate here, one squashed commit per ticket. This is where you build, run,
and test. One branch, not seven; see *The stacking question* below.

**`ticket/<n>-<slug>`** — short-lived, one per ticket. Cut from
`load-resilience`, merged back into it by PR, then deleted. See *Landing a
ticket*.

**`base/load-resilience`** — a marker pointing at the commit the feature branch
started from. It is how we know later which commits are ours. Created once,
moved only when the feature branch is rebased.

**`propose/load-resilience`** — a **build artifact**, not something you maintain
by hand. Generated on demand by replaying the feature commits onto
`upstream/master`, which drops the scaffolding underneath them. This is the
branch the upstream PR is opened from. Delete and regenerate it freely.

Setting it up:

```bash
git checkout master
git branch base/load-resilience master        # remember the starting point
git checkout -b load-resilience master        # work happens here
```

## Building and testing in the fork

Nothing special — work on `load-resilience` and use the repo as documented in
`CLAUDE.md`:

```bash
npm install            # also generates js/embedCss.js via the prepare script
npm test               # Node suite, mocha --ui tdd, from the repo root
npx eslint js
npm run build          # dist/, only needed for consumers
```

Develop against source, not `dist/`: serve the repo root over HTTP and open
`dev/igvjs.html`, which imports `../js/index.js` directly.

Once ticket #3 lands, the Playwright suite runs here too and is the real check
for this feature — the Node suite cannot construct `Browser`.

## Landing a ticket

**Tickets accumulate on `load-resilience`. They do not go into `master` one at a
time.**

Each ticket gets a short-lived branch and a PR whose base is `load-resilience`:

```
load-resilience ──●──────────●──────────●───►   one squashed commit per ticket
                   \        / \        /
                    ticket/3   ticket/4 ...
```

```bash
git checkout -b ticket/3-playwright-harness load-resilience
# ... build, test ...
git push -u origin ticket/3-playwright-harness
gh pr create --repo turner/igv.js --base load-resilience
```

**Squash-merge** the PR and delete the ticket branch. `load-resilience` then
holds one clean commit per ticket, which is the readable series you'll offer
upstream.

**Close the issue by hand.** GitHub acts on `Closes #3` only when a PR merges
into the *default* branch. These PRs target `load-resilience`, so after merging:

```bash
gh issue close 3 --comment "Landed in <sha> on load-resilience"
```

Closing it clears its blocking edges, which unblocks the next tickets.

**Parallel tickets** (#4 and #9 after #3; #7 and #8 after #6) each branch from
`load-resilience`. If both touch the same code, rebase the second onto
`load-resilience` after the first merges.

Per-ticket PRs are optional for solo work: committing straight to
`load-resilience` also works. The PRs give a review checkpoint and a record per
ticket, and squashing keeps the history clean, so they are the default.

### Why not merge each ticket into `master`

It adds ceremony and buys nothing:

- **`load-resilience` is already the testbed.** You build and test there, not on
  `master`.
- **The proposal ignores `master`.** `propose/load-resilience` is rebuilt from
  `base/load-resilience..load-resilience`, so nothing merged into `master` ever
  reaches upstream.
- **It creates the squash trap on your own side.** *Staying current* rebases
  `load-resilience` onto `master`. If `master` already holds squashed copies of
  your ticket commits, that rebase tries to reapply work that's already there,
  giving conflicts or empty commits.

Merge `load-resilience` into `master` **once, at the end**: when all seven
tickets are done, or when upstream has taken the work. See *How the merge
happens on your end*.

## Proposing to the IGV team

### 1. Generate the proposal branch

```bash
git fetch upstream
git checkout -B propose/load-resilience load-resilience
git rebase --onto upstream/master base/load-resilience propose/load-resilience
```

What each command does:

1. **`git fetch upstream`** — downloads the latest commits from igvteam's
   repository and updates your local copy of `upstream/master`. It changes
   none of your own branches. It runs first so the proposal sits on top of
   what upstream has *now*, not on a stale snapshot.

2. **`git checkout -B propose/load-resilience load-resilience`** — creates a
   branch named `propose/load-resilience` pointing at the same commit as
   `load-resilience`, and switches to it. The capital `-B` means "create it,
   or if it already exists, reset it to this point" — so every run starts
   fresh from the current feature branch, throwing away any earlier generated
   proposal. At this moment the new branch is an exact copy of
   `load-resilience`, scaffolding and all; the next command removes the
   scaffolding.

3. **`git rebase --onto upstream/master base/load-resilience propose/load-resilience`**
   — the step that does the real work. Read its three arguments as
   "take the commits on `propose/load-resilience` that come *after*
   `base/load-resilience`, and replay them on top of `upstream/master`":

   - `propose/load-resilience` (last argument) — the branch being rewritten.
   - `base/load-resilience` (middle argument) — the cut-off. Commits at or
     before this marker are left behind. That is everything `load-resilience`
     inherited from `master`: the upstream code *and* the scaffolding commits.
   - `upstream/master` (`--onto`) — the new foundation the kept commits are
     stacked on.

   Git copies each feature commit, one at a time, onto `upstream/master`, then
   moves `propose/load-resilience` to point at the last copy. The originals
   on `load-resilience` are untouched.

   Before and after:

   ```
   before:
         U1 ─ U2 ─ U3                            ← upstream/master (just fetched)
          \
           S1 ─ S2 ─ F1 ─ F2 ─ F3                ← propose/load-resilience
                 ↑
         base/load-resilience

   after:
         U1 ─ U2 ─ U3 ─ F1' ─ F2' ─ F3'          ← propose/load-resilience
   ```

   (`U` = upstream commits, `S` = scaffolding commits on `master`, `F` =
   feature commits, `F'` = their replayed copies.)

The result: only your feature work, sitting on current `upstream/master`. The
scaffolding commits were never in the replayed range, so they are simply
absent. Conflicts here are unlikely: the scaffolding touches
`docs/` and the feature touches `js/` and `test/`. Any conflicts you do see come
from upstream having moved, which is the normal cost of proposing against a
moving target.

### 2. Verify the proposal branch, not just your working branch

```bash
git log --oneline upstream/master..HEAD     # should be ONLY feature commits
git diff --stat upstream/master             # should touch no scaffolding paths
npm install && npm test                     # green on the code they will receive
```

This is the step that catches "it only worked because of something on my
master." It should pass trivially, since the scaffolding is docs-only — but
verify rather than assume.

### 3. Push and open the PR

```bash
git push -u origin propose/load-resilience
gh pr create --repo igvteam/igv.js --base master --head turner:propose/load-resilience
```

The PR body must stand alone. Upstream has no issue #1, and `Closes #3` would
resolve to something unrelated in their number space — never write one. The ADR
(`docs/adr/0001-*.md`) and `CONTEXT.md` are the right raw material for that
description: paste the reasoning into the PR body, don't ship the files.

### 4. If they ask for changes

Make the change on `load-resilience`, regenerate `propose/load-resilience`, and
force-push it. Never commit directly to the proposal branch — it is generated,
and hand edits are lost on the next regeneration.

```bash
git checkout load-resilience
# ... fix, commit ...
git checkout -B propose/load-resilience load-resilience
git rebase --onto upstream/master base/load-resilience propose/load-resilience
git push --force-with-lease origin propose/load-resilience
```

Force-pushing a PR branch is normal and expected; it updates the open PR in
place.

## The stacking question

This is the part worth being precise about, because it constrains the plan.

### Why stacked PRs don't work across forks

**A pull request's base branch must live in the repository receiving the PR.**
You cannot open a PR against `igvteam/igv.js` whose base is another branch of
`turner/igv.js`.

So if you split the seven tickets into seven upstream PRs, each one's diff is
computed against `igvteam/master` — and therefore contains every commit beneath
it in your stack. The PR for ticket #7 would show tickets #3, #5, and #6 as well.
Reviewers see the same code several times, and merging any one of them changes
the others.

The only way to run a real sequence is to open PR *k*, **wait for it to merge
into `igvteam/master`**, rebase, then open PR *k+1*. Seven rounds of external
review latency, with your whole stack blocked on each one.

### What to do instead

**Propose one PR.** The seven tickets size the *implementation* — each fits in a
fresh agent context window. That is a property of how we build it, not of how it
should be reviewed. Land all seven as commits on `load-resilience` and propose
them as one coherent change.

Keep the commit series intact rather than squashing locally: a readable sequence
of commits is usually welcome, and it lets a reviewer follow the same order we
built in.

**A defensible two-PR split**, if you want one: the Playwright harness (#3)
first, the behavior (#4–#9) second. The harness adds a dev dependency and a CI
job, which is the part most likely to draw discussion, and everything else
depends on it. Splitting it means one round of waiting, but it isolates the
contentious piece. Raising it with the team before writing much code is worth
more than either split.

### How the merge happens on their end

Entirely their choice, and you don't control it:

- **Squash** — your commits collapse into one on `igvteam/master`. Most common.
- **Merge commit** — your series is preserved.
- **Rebase** — your commits are replayed individually.

All three are fine. If they squash, your branch's history disappears upstream;
that is normal, not a loss. Afterwards, **do not merge `upstream/master` back
into `load-resilience`** — git will see the squashed commit as unrelated to your
originals and produce a mess. Just `git fetch upstream` and retire the branch.

### How the merge happens on your end

Independent of upstream. Merge `load-resilience` into your `master` **once**,
via a PR on `turner/igv.js`, when the whole feature is done — not ticket by
ticket (see *Why not merge each ticket into `master`*). That merge is your own
record; it has no bearing on the proposal branch. After it, retire
`load-resilience`.

## Staying current with upstream

Branches rot. Cheap when done often, miserable when deferred.

```bash
git fetch upstream
git checkout master
git merge upstream/master                 # keep the fork trunk current
git rebase --onto master base/load-resilience load-resilience
git branch -f base/load-resilience master # marker follows the new base
```

Do this every few weeks, and always before generating a proposal branch. If you
would rather not touch the feature branch, you can skip it — step 1 of
*Proposing* rebases onto current `upstream/master` anyway, and will simply
surface the same conflicts then.

## Quick reference

| I want to... | Command |
| --- | --- |
| See what this fork adds | `git log --oneline upstream/master..master` |
| See my feature commits | `git log --oneline base/load-resilience..load-resilience` |
| Start a ticket | `git checkout -b ticket/<n>-<slug> load-resilience` |
| Land a ticket | PR with `--base load-resilience`, squash-merge, `gh issue close <n>` |
| Build and test | `npm test`, then serve the root and open `dev/igvjs.html` |
| Generate the upstream PR branch | `git rebase --onto upstream/master base/load-resilience propose/load-resilience` |
| Check the proposal is clean | `git diff --stat upstream/master` |
| Update after review | fix on `load-resilience`, regenerate, `--force-with-lease` |

## Rules worth not breaking

1. Never push to `upstream`. The `no_push` URL enforces it; don't work around it.
2. Never commit scaffolding (`CONTEXT.md`, `docs/agents/`, `docs/adr/`,
   `docs/specs/`, this file) to a feature branch. Those edits belong on `master`.
3. Never hand-edit a `propose/*` branch. It is generated.
4. Never write `Closes #N` in an upstream PR. Their number space is not ours.
5. Never merge a single ticket into `master`. Tickets accumulate on
   `load-resilience`; `master` gets the feature once, at the end.
