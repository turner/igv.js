# Fork and upstream workflow

How a feature built in this fork (`turner/igv.js`) is developed, tested, and
proposed to `igvteam/igv.js`. The process is the same for every feature;
`<feature>` below stands for its branch name (e.g. `load-resilience`).

This file is fork-only. It never goes upstream.

## The goal

Simulate an independent contributor: fork igv.js, build a feature, propose it.
An outside contributor's path is four commands — branch, commit, push, open PR.
Ours is nearly that. The one wrinkle is that this fork carries **fork-only
files** that upstream must never see: agent scaffolding, ADRs, specs, this
file. Everything below exists to handle that one wrinkle, and nothing else.

## Fork-only files

`.fork-only` at the repo root is the single list of them. Today it covers
`CONTEXT.md`, `docs/adr/`, `docs/specs/`, `docs/agents/`, this file,
`.github/pull_request_template.md`, `scripts/fork/`, `.fork-only` itself, and
`CLAUDE.md`. Upstream has its own `CLAUDE.md`, which the fork extends, and a
path check can't tell which lines an edit touched, so any edit to it off
`master` is blocked.

**The rule: fork-only files change only on `master`.** They reach a feature
branch only when that branch is rebased onto `master`. Then they sit below the
branch's base marker, and the proposal step never copies them upstream.

**What is *not* fork-only:** anything upstream should receive with the
feature — code, tests, test data, `dev/` pages, `package.json` changes. That
work goes on the feature branch like any other. When in doubt, ask "would I
want igvteam to merge this file?" If yes, it's feature work. If no, it's
fork-only: add its path to `.fork-only` (on `master`) before committing it.

Fork-only files are docs and tooling only — no code that igv.js runs or builds.
So a branch with them and a branch without them compile and test identically.
That is what makes the approach safe.

### The guard

`scripts/fork/fork-only-guard` enforces the rule. Install it once per clone:

```bash
scripts/fork/fork-only-guard --install
```

That installs it as the `pre-commit` and `pre-merge-commit` hooks. Git hooks
live in `.git/hooks`, which is not version-controlled, so the guard can never
travel upstream. All worktrees of a clone share one hooks directory, so agents
working in their own worktrees are covered too. On any branch other than
`master`, the hooks reject a commit or merge that touches a path listed in
`.fork-only`, with a message saying where it belongs. The guard reads the list
from `master`, so a branch cut from an older `master` is still checked against
the current list.

The same script checks a proposal branch (see *Proposing*):

```bash
scripts/fork/fork-only-guard --against upstream/master
```

`git commit --no-verify` bypasses the hooks. Use it only for a deliberate edit
to the upstream part of `CLAUDE.md`, and expect the proposal check to flag that
file, since the check can't bypass it.

### When a feature needs a fork-only file

Mid-feature, you (or an agent) decide something worth an ADR, or the spec or
`CONTEXT.md` needs an edit. Commit it on `master`, not on the feature branch:

```bash
git worktree add ../igv.js-master master      # once; reuse it afterwards
cd ../igv.js-master
# ... write docs/adr/000N-*.md, commit on master ...
cd -
```

If the feature branch needs to *see* the new file (e.g. an agent on the next
ticket should read the ADR), run *Staying current* below. It rebases the
feature onto `master` and moves the base marker, so the new file sits below
the marker.

**Never merge `master` into a feature branch.** Merged-in `master` commits
come after the base marker, and the proposal step would copy them upstream.
The `pre-merge-commit` hook blocks such a merge whenever it brings in
fork-only changes.

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
instead of doing something regrettable. Reading upstream is expected and useful.
Writing to it is a human decision made deliberately, outside this workflow.

To see exactly what this fork adds on top of upstream at any time:

```bash
git diff --stat upstream/master master        # should be fork-only paths only
```

## Branches

```
upstream/master ──────────────────────────────────────────►  (igvteam)
     │
     └── master ──────────────────────────────────►  fork trunk: upstream code
          │                                          + fork-only files
          │
          ├── base/<feature>   ← marker: where the feature branch began
          │
          └── <feature> ─────────────────────────►  every ticket lands here;
               │                                    build & test here
               └── ticket/<n>-<slug>                one per ticket, short-lived

           propose/<feature> ────────────────────►  GENERATED. The upstream PR:
                                                     feature commits replayed
                                                     onto upstream/master
```

**`master`** — the fork's trunk: upstream code plus the fork-only files. The
only branch where fork-only files change. Never proposed upstream. Feature
branches are cut from it so that agents working on them can read `CLAUDE.md`,
`CONTEXT.md`, the ADRs, and the spec.

**`<feature>`** — the working branch. All of the feature's tickets accumulate
here, one squashed commit per ticket. This is where you build, run, and test.

**`ticket/<n>-<slug>`** — one per ticket. Cut from `<feature>`, merged back
into it by PR, then deleted. See *Landing a ticket*.

**`base/<feature>`** — a marker pointing at the commit the feature branch
started from. It is how we know later which commits are ours. Moved only when
the feature branch is rebased onto `master`.

**`propose/<feature>`** — a **build artifact**, not something you maintain by
hand. Generated on demand by replaying the feature commits onto
`upstream/master`, which leaves the fork-only files behind. The upstream PR is
opened from it. Delete and regenerate it freely.

## Starting a feature

```bash
scripts/fork/fork-only-guard --install        # once per clone
git checkout master
git branch base/<feature> master              # remember the starting point
git checkout -b <feature> master              # work happens here
```

The feature's spec, `CONTEXT.md` terms, and any up-front ADRs go on `master`
first, before the branch is cut, so the branch inherits them below its marker.

## Building and testing

Nothing special. Work on `<feature>` or a ticket branch and use the repo as
documented in `CLAUDE.md`:

```bash
npm install            # also generates js/embedCss.js via the prepare script
npm test               # Node suite, mocha --ui tdd, from the repo root
npx eslint js
npm run build          # dist/, only needed for consumers
```

Plus any checks the feature adds (e.g. a browser suite). Develop against
source, not `dist/`: serve the repo root over HTTP and open `dev/igvjs.html`,
which imports `../js/index.js` directly.

## Landing a ticket

**Tickets accumulate on `<feature>`. They do not go into `master` one at a
time.**

Each ticket gets a short-lived branch and a PR whose base is `<feature>`:

```
<feature> ──●──────────●──────────●───►   one squashed commit per ticket
             \        / \        /
              ticket/a   ticket/b ...
```

```bash
git checkout -b ticket/<n>-<slug> <feature>
# ... build, test, commit (the guard runs on every commit) ...
git push -u origin ticket/<n>-<slug>
gh pr create --repo turner/igv.js --base <feature>
```

**Squash-merge** the PR and delete the ticket branch. `<feature>` then holds
one clean commit per ticket, which is the readable series you'll offer
upstream. A squashed commit mixes everything its ticket touched, so a
fork-only file inside one can't be dropped later without splitting the commit
by hand. That is why the guard stops fork-only files at commit time rather
than filtering them out at proposal time.

**Close the issue by hand.** GitHub acts on `Closes #N` only when a PR merges
into the *default* branch. These PRs target `<feature>`, so after merging:

```bash
gh issue close <n> --comment "Landed in <sha> on <feature>"
```

Closing it clears its blocking edges, which unblocks the next tickets.

**Parallel tickets** each branch from `<feature>`. If two touch the same code,
rebase the second onto `<feature>` after the first merges.

Per-ticket PRs are optional for solo work: committing straight to `<feature>`
also works. The PRs give a review checkpoint and a record per ticket, and
squashing keeps the history clean, so they are the default.

### Why not merge each ticket into `master`

It adds ceremony and buys nothing:

- **`<feature>` is already the testbed.** You build and test there, not on
  `master`.
- **The proposal ignores `master`.** `propose/<feature>` is rebuilt from
  `base/<feature>..<feature>`, so nothing merged into `master` ever reaches
  upstream.
- **It creates the squash trap on your own side.** *Staying current* rebases
  `<feature>` onto `master`. If `master` already holds squashed copies of your
  ticket commits, that rebase tries to reapply work that's already there,
  giving conflicts or empty commits.

Merge `<feature>` into `master` **once, at the end**. See *After the feature*.

## Proposing to the IGV team

### 1. Generate the proposal branch

```bash
git fetch upstream
git checkout -B propose/<feature> <feature>
git rebase --onto upstream/master base/<feature> propose/<feature>
```

What each command does:

1. **`git fetch upstream`** — downloads igvteam's latest commits and updates
   your local `upstream/master`. It changes none of your own branches. It runs
   first so the proposal sits on what upstream has *now*.

2. **`git checkout -B propose/<feature> <feature>`** — creates (or, with
   capital `-B`, resets) `propose/<feature>` to the same commit as `<feature>`
   and switches to it. Every run starts fresh, discarding any earlier generated
   proposal. At this moment it is an exact copy of `<feature>`, fork-only files
   and all; the next command removes them.

3. **`git rebase --onto upstream/master base/<feature> propose/<feature>`** —
   "take the commits on `propose/<feature>` that come *after* `base/<feature>`,
   and replay them on top of `upstream/master`":

   - `propose/<feature>` (last argument) — the branch being rewritten.
   - `base/<feature>` (middle argument) — the cut-off. Commits at or before
     this marker are left behind: everything `<feature>` inherited from
     `master`, including every fork-only commit.
   - `upstream/master` (`--onto`) — the new foundation.

   ```
   before:
         U1 ─ U2 ─ U3                            ← upstream/master (just fetched)
          \
           S1 ─ S2 ─ F1 ─ F2 ─ F3                ← propose/<feature>
                 ↑
           base/<feature>

   after:
         U1 ─ U2 ─ U3 ─ F1' ─ F2' ─ F3'          ← propose/<feature>
   ```

   (`U` = upstream commits, `S` = fork-only commits on `master`, `F` = feature
   commits, `F'` = their replayed copies.)

The cut-off is only a *position*, not a filter: it drops fork-only commits
because they are below the marker, and would copy any that were above it. The
guard and *When a feature needs a fork-only file* keep them below it.

Conflicts come from upstream having moved, which is the normal cost of
proposing against a moving target.

### 2. Verify the proposal branch

```bash
scripts/fork/fork-only-guard --against upstream/master   # must pass
git log --oneline upstream/master..HEAD                  # only feature commits
npm install && npm test                                  # green on what they'll receive
```

The guard fails, naming the paths, if the proposal touches anything in
`.fork-only`. On `propose/<feature>` the script itself isn't in the tree
(`scripts/fork/` is fork-only), so run it from the `master` worktree or pull
it out of `master` first:
`git show master:scripts/fork/fork-only-guard | bash -s -- --against upstream/master`.

The test run catches "it only worked because of something on my `master`."

### 3. Push and open the PR

```bash
git push -u origin propose/<feature>
gh pr create --repo igvteam/igv.js --base master --head turner:propose/<feature>
```

The PR body must stand alone. Fork issue numbers mean something else in
upstream's number space, so never write `Closes #N`. The ADRs, spec, and
`CONTEXT.md` are raw material for the description: paste the reasoning into
the PR body, don't ship the files.

### 4. If they ask for changes

Make the change on `<feature>` (via a ticket branch or directly), regenerate
`propose/<feature>`, and force-push. Never commit directly to the proposal
branch; it is generated, and hand edits are lost on the next regeneration.

```bash
git checkout <feature>
# ... fix, commit ...
git checkout -B propose/<feature> <feature>
git rebase --onto upstream/master base/<feature> propose/<feature>
git push --force-with-lease origin propose/<feature>
```

Force-pushing a PR branch is normal; it updates the open PR in place.

## One PR, not a stack

**A pull request's base branch must live in the repository receiving the PR.**
You cannot open a PR against `igvteam/igv.js` whose base is another branch of
`turner/igv.js`. So if a feature's tickets were proposed as a stack of PRs,
each one's diff would be computed against `igvteam/master` and contain every
commit beneath it. Reviewers would see the same code several times. The only
real sequence is to open PR *k*, wait for it to merge upstream, rebase, then
open PR *k+1*: one round of external review latency per ticket.

**Propose one PR per feature.** Tickets size the *implementation*; each fits
in a fresh agent context window. That is a property of how we build, not of
how it should be reviewed. Keep the commit series intact rather than squashing
locally: it lets a reviewer follow the order we built in.

**Split only for a reason**, e.g. an infrastructure piece (a new dev
dependency, a CI job) that is likely to draw discussion and that everything
else depends on. Propose it first and wait for it; it costs one round of
latency but isolates the contentious part. Raising it with the team before
writing much code is worth more than any split.

## After the feature

**On their end**, the merge style is their choice: squash (most common), merge
commit, or rebase. All are fine. If they squash, your history disappears
upstream; that is normal. Afterwards, **do not merge `upstream/master` into
`<feature>`**: git will see the squashed commit as unrelated to your originals.
Just `git fetch upstream` and retire the branch.

**On your end**, merge `<feature>` into `master` **once**, via a PR on
`turner/igv.js`, when the whole feature is done or upstream has taken it. Then
delete `<feature>`, `base/<feature>`, and `propose/<feature>`. Feature-specific
fork-only files (its spec, a write-up) can be removed from `master` then too,
if they are no longer useful; ADRs usually stay.

## Staying current with upstream

Branches rot. Cheap when done often, miserable when deferred.

```bash
git fetch upstream
git checkout master
git merge upstream/master                     # keep the fork trunk current
git rebase --onto master base/<feature> <feature>
git branch -f base/<feature> master           # marker follows the new base
```

The same last two commands bring a new fork-only file (an ADR written
mid-feature) into view on the feature branch. Run this every few weeks, and
always before generating a proposal branch. Open ticket branches then need
`git rebase <feature>` too.

## Quick reference

| I want to... | Command |
| --- | --- |
| Install the guard | `scripts/fork/fork-only-guard --install` |
| See what the fork adds | `git diff --stat upstream/master master` |
| Start a feature | `git branch base/<feature> master && git checkout -b <feature> master` |
| See my feature commits | `git log --oneline base/<feature>..<feature>` |
| Start a ticket | `git checkout -b ticket/<n>-<slug> <feature>` |
| Land a ticket | PR with `--base <feature>`, squash-merge, `gh issue close <n>` |
| Add an ADR mid-feature | commit on `master`, then *Staying current* |
| Generate the upstream PR branch | `git rebase --onto upstream/master base/<feature> propose/<feature>` |
| Check the proposal is clean | `fork-only-guard --against upstream/master` |
| Update after review | fix on `<feature>`, regenerate, `--force-with-lease` |

## Rules worth not breaking

1. Never push to `upstream`. The `no_push` URL enforces it; don't work around it.
2. Fork-only files (`.fork-only`) change only on `master`. The guard enforces
   it; don't `--no-verify` around it except for the upstream part of `CLAUDE.md`.
3. Never merge `master` into a feature branch; rebase and move the marker.
4. Never hand-edit a `propose/*` branch. It is generated.
5. Never write `Closes #N` in an upstream PR. Their number space is not ours.
6. Never merge a single ticket into `master`. Tickets accumulate on
   `<feature>`; `master` gets the feature once, at the end.
