# The minimal genome definition is the contract

The load-resilience work in ADR 0001 started from the failures seen in the wild, not from the documented genome definition, and the two drifted apart. We now take the igv.js documentation as the contract. A **genome definition** needs only a **sequence source** (`fastaURL` or `twoBitURL`), and that alone must be enough to build a **genome** and a browser. Everything else is an **optional part**. A **genome** loads if and only if its sequence source loads. An optional part that fails during the load is reported in `loadfailures` and left out. One that fails later, because it loads lazily (alias files, cytobands), is logged and drawn without. As a result, the sequence fallback to chrom sizes from ADR 0001 is removed: chrom sizes are an optional part and never stand in for the sequence.

## Considered options

- **Keep the sequence fallback as a named exception.** Rejected. It lets an optional part replace the required one, so the real minimum would differ from the documented one. It also helps only when a single file fails: for hg38 the sequence and the chrom sizes come from the same host.
- **Report lazily loaded optional parts by loading them during the genome load.** Rejected, because alias files can be large and are not needed until they are used.

## Consequences

- If a genome's sequence fails, `createBrowser` rejects and leaves nothing behind. The embedder decides what to do next. IGV-Web gets no browser in that case.
- A definition that supplies only chrom sizes (`format: "chromsizes"`) is not a genome definition in the model.
