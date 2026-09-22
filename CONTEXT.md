# igv.js

A genome browser that embeds in a web page. It shows a reference genome, and data tracks aligned to it, across one or more loci.

## Language

### Genome

**Genome**:
A reference assembly: its **sequence source**, the chromosomes (names and lengths) that source provides, and any **optional parts**.
_Avoid_: reference (for the whole assembly), assembly, partially constructed genome (a genome whose **optional part** failed is still a complete genome; one whose **genome track** failed is a complete genome in a session missing that track)

**Genome definition**:
The description of a **genome** that a caller supplies, either as an ID that igv.js resolves or as a configuration object. At minimum it names a **sequence source** (a FASTA or 2bit file); that alone is enough to build a **genome** and a browser. Everything else in it is an **optional part**.
_Avoid_: genome config, genome JSON

**Optional part**:
Any part of a **genome definition** other than its **sequence source**: chromosome sizes, cytobands, chromosome aliases, and **genome tracks**.

**Sequence source**:
Where a **genome**'s bases come from: a 2bit or FASTA file. It is loaded while the **genome** is built, and it is the one part a **genome** cannot do without.
_Avoid_: sequence track (a different thing), reference

**Established session**:
The state of the browser once its **genome** has loaded exactly as its **genome definition** describes: its **sequence source**, every **optional part**, and the **sequence track**. When an **optional part** failed, the session is not established.
_Descoped (#8)_: nothing refuses to save or share a session that is not established. The term is kept for discussion only.
_Avoid_: fully loaded, complete session

### Tracks

**Sequence track**:
The display track that shows a **genome**'s bases. igv.js adds it itself, and it fetches nothing when it is created.
_Avoid_: sequence (on its own), reference track

**Genome tracks**:
The annotation tracks declared in a **genome definition**, such as a RefSeq gene track. They load whenever the **genome** loads.
_Avoid_: default tracks, reference tracks

**Session tracks**:
The tracks a session or `createBrowser` configuration lists, as opposed to the **genome tracks**.

## Relationships

- A **genome** has exactly one **sequence source**. Chromosome sizes never stand in for it.
- A **genome** loads if and only if its **sequence source** loads. An **optional part** that fails is left out and never stops the **genome** loading. It is reported if it fails while the **genome** loads, and logged if it fails later, on first use.
- A **genome** has zero or more **genome tracks**. Loading a session loads the **genome tracks** first, then the **session tracks**.
- The **sequence track** reads from the **genome**'s **sequence source**. It never loads a file of its own unless its configuration names one.

- ~~A session is saved only when it is an **established session**.~~ Descoped (#8): any session can be saved.

## Flagged ambiguities

- "The sequence failed" has been used to mean the **sequence track** failed. What fails is the **sequence source**, while the **genome** is built. The **sequence track** fetches nothing when it is created.
- "Sequence-less genome" and "sequence fallback" named a genome built from chromosome sizes alone. A definition that supplies only chromosome sizes is not a **genome definition**, so neither term is part of the language.
