# igv.js: loads survive missing parts

Branch `load-resilience` on the fork (`turner/igv.js`), PRs #10–#15. Two tickets were descoped: #8, and #7 after it had landed.
Follow-up: [#17](https://github.com/turner/igv.js/issues/17) made the minimal genome definition the contract ([ADR 0002](adr/0002-the-minimal-genome-definition-is-the-contract.md)), which removed the fallback to chrom sizes (issues #19–#22).
Tracking issue: turner/igv.js#1. Upstream trigger: igvteam/igv-webapp#355.

## The symptom

IGV-Web opened to a blank page. The hg38 RefSeq gene track had become unreachable (a server-side CORS problem), so `createBrowser` rejected and the app never got a browser. It had no genome selector to switch from and no menus that worked. One missing file took down the whole app.

The same thing happened when the genome's **sequence** (the `.2bit`) failed, and when a saved session listed a track whose URL had gone stale.

## The idea

A genome or session load should **keep going when parts of it fail**. Load what you can, tell the user exactly what failed, and never leave them stranded. The browser that survives isn't meant for real work. It's there so the user can see what went wrong and pick a genome that loads.

The fix belongs in igv.js, not in the embedder. IGV-Web first tried to work around it from outside by retrying `createBrowser` with stripped-down copies of the genome. That can't work reliably, because igv.js rewrites sequence URLs internally, so the app can't tell which part failed. That approach (the web app's `dat` branch) is abandoned.

## What was done

**1. Batch loads tolerate failed tracks (#12).**
Session loads, genome loads, and so `createBrowser` add the tracks that loaded and collect the failures instead of rejecting.
The public `loadTrack` and `loadTrackList` still **reject**. That inconsistency is deliberate: a caller asking for specific tracks needs to know when one fails, and changing that would break a public contract. The reasoning is in ADR 0001 so nobody "fixes" it later.

**2. Tracks stay ordered when a load fails (#11).**
A latent bug on the same path: when one track in `loadTrackList` failed, the ordering and resizing step was skipped, so the tracks that did load were misordered and wrongly sized. Now every load settles first, then the loaded tracks are laid out.

**3. ~~Sequence fallback to chrom sizes (#13).~~** _Removed in [#17](https://github.com/turner/igv.js/issues/17) ([ADR 0002](adr/0002-the-minimal-genome-definition-is-the-contract.md)); see section 8._
~~If the sequence source fails and the genome definition has a `chromSizesURL`, igv.js builds a **sequence-less genome** from chrom sizes. You can navigate the chromosomes and view your tracks, but there are no bases. The genome definition passed in isn't modified, so reusing it, or saving a session, still names the original genome. The fallback is recorded on the genome as `genome.sequenceFallback` (`{url, error}`), so an embedder can check for it at any time, not only through the event.~~
~~If both the sequence and chrom sizes fail, the load still rejects. For hg38 both come from UCSC, so this helps when one file fails, not when the whole host is down. That's accepted.~~

**4. One report per load.**
Each load fires one `loadfailures` event carrying an array of `{kind, url, message}`, where `kind` is ~~`track` or `sequence` (meaning the fallback was used)~~ `track`, `chromSizes` or `chromAlias`. _Changed in [#17](https://github.com/turner/igv.js/issues/17); see section 8._
- Subscribe with `browser.on('loadfailures', …)`, or through the `createBrowser` `listeners` config so you hear about the *first* load, which happens before you have a browser to subscribe to.
- By default igv.js also shows **one combined alert** listing every failed URL. It's one alert rather than one per failure because the alert dialog is a single instance, so separate calls would show only the last failure. ~~`showLoadFailureAlert: false` turns it off. Registering a listener doesn't turn it off, so an embedder that only logs failures doesn't accidentally remove the user's only notice.~~ _Replaced: igv.js gains no config field. A `loadfailures` handler in `createBrowser`'s existing `listeners` option turns the alert off, for that load and later ones._

**5. Never strand the user (#15).**
- **Genome switch:** the new genome is built *before* the old tracks and regions of interest are cleared. A failed switch now leaves your current genome and work in place. Previously everything was cleared first and lost.
- **Rejected `createBrowser`:** the half-built browser is removed from the page and from the browser list before the error is rethrown, so retrying doesn't pile up orphaned browsers.

**6. Real-browser test harness (#10).**
New Playwright suite (`test/e2e/`, `npm run test:e2e`, its own CI job). It runs `igv.createBrowser` in real Chromium against a tiny local genome and **blocks chosen URLs**, which is exactly how the failure happens in the wild. It needs no network. The existing Node mocks can't build a `Browser` (shadow DOM), so this was the lowest level at which the behavior could honestly be tested.

**7. Manual test page.**
`dev/track-load-resilience.html` runs every failure mode against local files: `createBrowser` scenarios, and `loadSession`/`loadGenome`/`loadTrack`/`loadTrackList` on a live browser. For each call it shows what a host application receives (see below). The alert can be switched on and off from the page.

**8. The minimal genome definition is the contract ([#17](https://github.com/turner/igv.js/issues/17)).**
The [documented genome definition](https://igv.org/doc/igvjs/#Reference-Genome/) is now the contract: `fastaURL` or `twoBitURL` alone gives a working browser. A **genome** loads if and only if its **sequence source** loads. Everything else is an **optional part**. The reasoning is in [ADR 0002](adr/0002-the-minimal-genome-definition-is-the-contract.md), which supersedes ADR 0001's fallback to chrom sizes.
- **The fallback to chrom sizes is removed (#20).** If the sequence source fails, `createBrowser` rejects and leaves no browser behind, even when `chromSizesURL` is reachable. A genome switch that fails this way leaves the previous genome in place. `genome.sequenceFallback` and the `sequence` kind are gone.
- **Optional parts that fail during the load are tolerated (#21).** Two used to reject the whole genome: `chromAliasBbURL` (set for hub and GenArk genomes) and `chromSizesURL` when the sequence source can't list its chromosomes. Each is now reported in that load's `loadfailures`, as kind `chromAlias` or `chromSizes`, in the same alert as the track failures. A failed alias bigBed is replaced by the next alias source (`aliasURL`, else the defaults); failed chrom sizes are left out.
- **Lazy optional parts fail harmlessly (#22).** `aliasURL`, `cytobandURL` and `cytobandBbURL` load on first use, after `createBrowser` resolves. A failure is logged once, not on every repaint, and the browser carries on: the ideogram is drawn without bands, and search by canonical chromosome name still works. These are not reported in `loadfailures` and are not loaded early.
- **A 2bit-only genome gets an id (#19).** The genome id is derived from `twoBitURL` as it already was from `fastaURL` (a `File` uses its name); an explicit `id` still wins. Before, a 2bit-only genome got `""`, so `genomechange` never fired between two of them and the navbar showed `...`.

## What the host application receives

igv.js recovers first, then reports; how to present the failure is the host's choice. For any load, the host gets three things:

- **The promise outcome.** Session and genome loads resolve despite failed parts. `loadTrack`/`loadTrackList` reject, as does the one fatal case (the sequence source fails), and these fire **no event**, so the host must catch the rejection.
- **The `loadfailures` payload**, when anything was tolerated: `[{kind, url, message}]`.
- **State it can read afterwards:** ~~`genome.sequenceFallback`, and~~ which tracks are present. _`genome.sequenceFallback` was removed in [#17](https://github.com/turner/igv.js/issues/17)._

Known gap: `message` is the reader's raw string (e.g. `Error accessing resource: … status: 404`). There is no separate status field, so a host that wants to treat 404, 401/403 and network errors differently has to parse it.

## Descoped

**Hiding menu items that need bases (#7).**
This landed in #14 and was then reverted. It added `genome.hasBases` and hid the right-click items that need bases (view/copy/BLAT the visible sequence, view/copy a feature's sequence). It was dropped because it polishes interactive use of a genome without bases, and nobody works on such a genome; they switch to one that loads. Those items were left present but inert on a genome without bases. `hasBases` is gone. _Since [#17](https://github.com/turner/igv.js/issues/17) every genome has its sequence source, so the question no longer arises, and `genome.sequenceFallback` is gone too._

**Refusing to save a partial session (#8).**
The plan was to refuse Save/Share until the genome had loaded completely (an "established session"). It was dropped as outside the launch-resilience brief, so **saving is never blocked**. The term survives in `CONTEXT.md` for discussion only.

## Out of scope

- A whole-host outage: the sequence source is unreachable, so the load rejects.
- Substituting a different genome automatically: that's the embedder's or the user's call.
- Retrying failed URLs.
- Tracks a user adds after startup: these already reject through the public API, unchanged.

## Next: igv-webapp

A separate change, started fresh from the web app's `master` and shipped with the igv.js release: drop the app's own failure alert in favor of igv.js's, keep its fallback for a session file that can't be fetched, and port the `dat` branch's Playwright cases (RefSeq blocked, sequence blocked, both blocked) plus one checking that the genome selector works after a failure.

## Where to read more

- `docs/specs/load-resilience.md`: user stories and the full decisions (descoped parts struck through)
- `docs/adr/0001-genome-and-session-loads-survive-missing-parts.md`: the decision and the options rejected
- `docs/adr/0002-the-minimal-genome-definition-is-the-contract.md`: the minimal genome definition as the contract, and why the fallback to chrom sizes went
- `CONTEXT.md`: vocabulary (genome definition, sequence source, optional part, genome track, …)
