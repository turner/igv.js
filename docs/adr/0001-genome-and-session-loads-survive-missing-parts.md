# Genome and session loads survive missing parts

_The sequence fallback to chrom sizes is superseded by [ADR 0002](0002-the-minimal-genome-definition-is-the-contract.md): a genome whose sequence fails does not load._

A failure in the **genome tracks** (such as RefSeq) or in the **sequence source** used to reject `createBrowser`, so an embedder like IGV-Web never got a browser at all (igv-webapp #355). Now session and genome loads (`loadSessionObject`, `loadGenome`, and so `createBrowser`) keep going. They add the tracks that loaded, fall back to a **sequence-less genome** from `chromSizesURL` when the sequence fails, and report every failure in one `loadfailures` event. By default igv.js also shows one alert, ~~which `showLoadFailureAlert: false` turns off~~ which a `loadfailures` handler in `createBrowser`'s `listeners` replaces (no new config field). The public `loadTrack` and `loadTrackList` still reject, because a caller asking for particular tracks needs to know when one fails. A browser that survived this way is not an **established session**: it exists so the user can pick a different genome. Refusing to save it as a session was planned and then descoped in [#8](https://github.com/turner/igv.js/issues/8), as beyond the launch-resilience brief; saving is not blocked.

## Considered options

- **Let embedders recover (the first fix in the web app).** Rejected. The app can't tell which part failed, because igv.js rewrites igv.org sequence URLs to UCSC ones. It had to retry `createBrowser` with reduced copies of the genome and remove each browser that failed.
- **Make every track load tolerant, including `loadTrack`.** Rejected. It changes a public API that callers rely on to reject.
- **Allow saving a session after a sequence fallback.** Originally rejected, since a saved session was assumed to be an established session. Reversed when the save refusal was descoped in [#8](https://github.com/turner/igv.js/issues/8).

## Consequences

- If the sequence fails and there is no chrom sizes to fall back on, loading still rejects. `createBrowser` then removes the browser it inserted before rethrowing.
- A failed genome switch leaves the previous genome and its tracks in place, because the new genome is built before the old state is cleared.
