# Spec: genome and session loads survive missing parts

Full detail behind [issue #1](https://github.com/turner/igv.js/issues/1). The issue
carries the problem, the solution and the binding decisions; this file carries the
material that would drown it — the user stories, the decisions in full, and the
testing plan.

The decision itself is recorded in
[ADR 0001](../adr/0001-genome-and-session-loads-survive-missing-parts.md).
Vocabulary is in [`CONTEXT.md`](../../CONTEXT.md).

## User Stories

1. As an IGV-Web user whose launch genome's RefSeq gene track is unreachable, I want the browser to open anyway, so that I can work with the genome's sequence and load my own tracks.
2. As an IGV-Web user whose launch genome's RefSeq gene track is unreachable, I want every menu in the app to work, so that the app is not dead on arrival.
3. As an IGV-Web user whose launch genome's sequence source is unreachable, I want the browser to open on that genome's chromosomes, so that I can navigate and see my own tracks in context.
4. As an IGV-Web user whose launch genome fails in any way, I want one alert naming each URL that failed, so that I can tell my administrator exactly what to fix.
5. As an IGV-Web user who has just seen such an alert, I want the genome selector to work, so that I can switch to a genome that loads completely and start work.
6. As an IGV-Web user, I want a failed genome switch to leave my current genome and tracks in place, so that trying a genome that turns out to be broken costs me nothing.
7. As an IGV-Web user working on a sequence-less genome, I want the menu items that need bases to be absent rather than present and inert, so that I am not left wondering whether the app is broken.
8. ~~As an IGV-Web user working on a sequence-less genome, I want saving or sharing a session to be unavailable, so that I do not create a session that misrepresents which genome it uses.~~ _Descoped (#8)._
9. ~~As an IGV-Web user who has switched to a genome that loads completely, I want saving and sharing to become available again, so that the restriction lasts only as long as the problem.~~ _Descoped (#8)._
10. As an IGV-Web user restoring a session that lists a track whose URL has gone stale, I want the rest of the session to open, so that one dead link does not cost me the whole session.
11. As an IGV-Web user, I want a genome definition that lists no tracks at all to open normally, so that minimal genomes are not treated as failures.
12. As an igv.js embedder, I want `createBrowser` to resolve when parts of the genome fail, so that the code after it — building my own UI around the browser — still runs.
13. As an igv.js embedder, I want to subscribe to load failures through the same event mechanism as every other igv.js event, so that I do not have to learn a second pattern.
14. As an igv.js embedder, I want to register a failure listener through the `createBrowser` configuration, so that I hear about failures in the first load, which happens before I am given the browser.
15. As an igv.js embedder, I want each reported failure to say what kind of thing failed, which URL, and why, so that I can present my own message.
16. As an igv.js embedder, I want the built-in alert on by default, so that I get sensible behavior without doing anything.
17. As an igv.js embedder with my own error UI, I want to turn the built-in alert off explicitly, so that my users do not see two dialogs.
18. As an igv.js embedder who registered a listener only to log failures, I want the built-in alert to stay on, so that registering a listener does not silently remove my users' only notification.
19. As an igv.js embedder calling `loadTrack` for a track my user asked for, I want it to reject when that track fails, so that my existing error handling keeps working.
20. As an igv.js embedder calling `loadTrackList` with a set of tracks, I want it to reject when one fails, so that the public API's contract does not change under me.
21. As an igv.js embedder, I want the tracks that did load through a rejecting `loadTrackList` call to be correctly ordered and sized, so that a partial failure does not leave the display corrupted.
22. As an igv.js embedder whose genome has no sequence and no chrom sizes to fall back on, I want the load to reject cleanly, so that I can decide myself what to do.
23. As an igv.js embedder, I want a rejected `createBrowser` to leave nothing behind in my page, so that my retry or fallback does not accumulate orphaned browsers.
24. As an igv.js embedder, I want to ask a genome whether it has bases, so that I can adapt my own UI the way igv.js adapts its menus.
25. As an igv.js embedder, I want a genome deliberately defined with chrom sizes only to behave as a fully established session, so that a genome that loaded exactly as defined is not treated as a failure.
26. As an igv.js embedder, I want the sequence fallback to leave the genome definition I passed in unchanged, so that a definition I reuse is not quietly rewritten.
27. As an IGV-Web user who opens a session saved from an established session, I want it to restore the full genome, so that a network problem from an earlier visit does not persist into this one.
28. As an igv.js maintainer, I want a test that blocks a URL in a real browser, so that the behavior under the failure that actually occurs in the wild is covered rather than an approximation of it.
29. As an igv.js maintainer, I want the tests to use local fixtures, so that the suite does not depend on igv.org or UCSC being up.
30. As an igv.js maintainer, I want the reasoning behind tolerant batch loads and rejecting single loads recorded, so that a future reader does not "fix" the inconsistency.

## Implementation Decisions

Vocabulary is defined in `CONTEXT.md` on this branch; the decision is recorded in the ADR "Genome and session loads survive missing parts". Both are already committed.

**Scope of tolerance**

- Session loads and genome loads tolerate track failures: this covers the first load, session loads, and switching genome after startup. They add the tracks that loaded and collect the failures.
- The public single-track and track-list entry points keep rejecting. The tolerant path is internal to session and genome loading. The BLAT track, which loads through the track-list entry point, keeps the rejecting behavior.
- The rejecting path must still complete the ordering and resizing work for the tracks that did load. It currently skips that work when one track fails, which leaves added tracks misordered and wrongly sized — a latent bug on the same code path.

**Sequence fallback**

- When the sequence source fails while the genome is built, and the genome definition has a chrom sizes URL, igv.js reports the failure and builds a sequence-less genome from chrom sizes instead.
- The fallback must not mutate the genome definition it was given, so that a caller reusing the definition, and any session saved later, still names the original genome.
- If the sequence fails and no chrom sizes are available, the load rejects, as it does today.
- Note for whoever implements this: igv.js rewrites igv.org sequence URLs to UCSC ones, and supplies the chrom sizes URL for the well-known genomes from UCSC as well. For hg38 both therefore come from the same host, so the fallback helps when a single file fails, not when that host is unreachable. That is accepted.

**A genome that has no bases**

- A genome exposes whether it has bases. The sequence-less state must distinguish its two causes: a sequence fallback, versus a genome definition that asked for chrom sizes only. Hiding menu items applies to both. ~~Refusing to save applies only to the fallback.~~ _Descoped (#8)._
- The menu items that need bases are hidden while the genome has none: view, copy and BLAT of the visible sequence, and view and copy of a feature's sequence.
- Everything else already tolerates the absence of bases and is left alone: alignment rendering skips mismatch coloring and logs, and existing null-handling paths remain as a backstop.

**Reporting**

- One event per load, `loadfailures`, whose argument is an array of one entry per failure: the kind (`track` or `sequence`), the URL, and the message. `sequence` means the fallback was used.
- Registration in two places, one mechanism: the existing event subscription for later loads, and a `createBrowser` configuration option that is registered as a listener before anything loads. The latter exists because the embedder has no browser to subscribe to during the first load.
- By default igv.js also presents one combined alert listing every failure in that load. `showLoadFailureAlert: false` turns it off. Registering a listener does not turn it off.
- One combined alert, not one per failure: the alert dialog is a single instance whose body is replaced by each call, so separate alerts would show only the last failure.

**Established session** — _Descoped in [#8](https://github.com/turner/igv.js/issues/8). Nothing below is implemented; saving and sharing are never refused._

- A browser is an established session once its genome loaded as its definition describes: the real sequence source, every genome track, and the sequence track. A genome definition listing no tracks is established once its sequence loads.
- Saving or sharing a session is refused unless the session is established. Both the session-object and the compressed-session entry points enforce this, so every embedder is covered.
- The assumption behind this, stated by the maintainer: no real work begins before the session is established. A user who lands on a genome without its gene track and sequence will switch genomes before working, not work for hours and then try to save.

**Never stranding the user**

- A genome is built before the previous genome's tracks and regions of interest are cleared. Today they are cleared first, so a failed switch discards the user's work even though the old genome remains.
- When a load still rejects, `createBrowser` removes the browser it already inserted into the page, and into its list of browsers, before rethrowing.

**igv-webapp (a separate, later change)**

- Start fresh from the web app's `master`. The `dat` branch, which worked around this from outside by retrying reduced copies of the genome, is abandoned; its only salvageable part is its Playwright test cases.
- The app's own fallbacks for a failed session file and a failed restored genome stay, since a session file that cannot be fetched still rejects.
- The app drops its own failure alert in favor of the igv.js one.
- ~~Save session and Share are disabled while the session is not established.~~ _Descoped (#8)._ Load session, the genome selector and track loading stay enabled.
- Ships together with the igv.js release; the web app gets no interim patch, since the server-side CORS problem that triggered #355 has been fixed.

## Testing Decisions

A good test here asserts what a user or an embedder can observe: a browser exists, a named track is present or absent, an alert names a URL, a menu item is there or not, the genome selector still works. It must not assert on internal call sequences or on which private path produced the result — those are the parts most likely to be refactored.

**One seam: a browser-level test in igv.js, driven through Playwright.**

- The test loads a page that calls `igv.createBrowser` in real Chromium, blocks specific URLs by pattern, and asserts on the result. This is the highest seam available and matches how the failure occurs in the wild. It was the technique used to diagnose #355 in the first place.
- Fixtures are local and served from the repo, so the suite needs no network. `test/data/genomes/hg38.chrom.sizes` already exists; a small custom genome definition pointing at local sequence and track files, with one of them blocked, gives a deterministic case for each scenario.
- Cases: sequence blocked; a genome track blocked; both blocked; sequence and chrom sizes both blocked, which must reject and leave nothing behind; switching genome after a failure; ~~saving refused while unestablished and permitted after switching to a genome that loads completely~~ (descoped, #8); the alert on by default and suppressed by the configuration option; the event carrying the expected failures.
- Why not the existing Node suite: `Browser` cannot be constructed under `test/utils/mockObjects.js` today. It fails on `attachShadow`, and stubbing that reveals further gaps such as `classList`. Making it constructible would mean extending the DOM mock or moving to jsdom, a change beneath every existing test file, and would still test lower than the behavior in question.
- Prior art: the diagnosis probes in `igv-webapp-355-repro` (request blocking plus reading back the resulting state), and the Playwright tests on igv-webapp's abandoned `dat` branch.
- Existing Node tests stay as they are. If the Playwright infrastructure proves heavier than expected, the agreed fallback is a genome-level unit test for the sequence fallback, following `test/testGenome.js`, plus the web-app tests for the rest — but that is a fallback, not the plan.

**Acceptance, in igv-webapp, when that change is made:** port the three cases from the `dat` branch (RefSeq blocked, sequence blocked, both blocked) and add a fourth, that the genome selector works after a failure. Run them against the local igv.js build.

## Out of Scope

- **A whole-host outage.** When the sequence and the chrom sizes both fail — in practice, UCSC unreachable — the load rejects and the web app shows the error and stops. Making the web app usable with no browser at all was considered and dropped: no work can begin in the web app until a browser exists. This is a known limitation, not an oversight.
- **Falling back to a different genome.** If a genome cannot load, igv.js does not substitute another. That is the embedder's decision, and the user's, through the genome selector.
- **Retrying a failed URL.** No retry, no backoff.
- **Reporting failures for tracks the user loads themselves after startup.** Those already reject through the public API, which is unchanged.
- **Blocking a save because a track failed.** A failed track means the session has fewer tracks; each track it saves is still valid.
- **Any change to the web app in this issue.** The web-app work is a separate change, described above so the two stay aligned.
- **Anything upstream.** This fork never writes to `igvteam/igv.js`.

## Further Notes

- Background and the original call-chain analysis: `~/IGVDevelopment/igvjs-launch-genome-resilience-handoff.md`, with the earlier diagnosis and the reproduction environment beside it. Upstream context: igvteam/igv-webapp#355 (read-only; do not reply there).
- The trigger has been fixed on the server, so this cannot currently be reproduced against the live hg38 definition. Reproduce it by blocking requests in DevTools, or through the local reproduction environment.
- The reproduction recipe by hand: serve the web app locally, block `*.2bit` and/or `*ncbiRefSeq.txt.gz` under DevTools' request blocking, disable the cache, and reload.
- This branch is `launch-genome-resilience` on the fork at `~/IGVDevelopment/dugla-fork/igv.js`. `CONTEXT.md` and `docs/adr/0001-genome-and-session-loads-survive-missing-parts.md` are committed there.
- The web app pins igv 3.8.8, and its `dat` branch (commit `5cbc6e9`) holds the abandoned app-side approach if anyone wants to read it before it is discarded.

