# igv.js

A genome browser that embeds in a web page. It shows a reference genome, and data tracks aligned to it, across one or more loci.

## Language

### Genome

**Genome**:
A reference assembly: its chromosomes (names and lengths), where its bases come from, and optional cytobands and **genome tracks**.
_Avoid_: reference (for the whole assembly), assembly

**Genome definition**:
The description of a **genome** that a caller supplies, either as an ID that igv.js resolves or as a configuration object.
_Avoid_: genome config, genome JSON

**Sequence source**:
Where a **genome**'s bases come from (2bit, FASTA, or chromosome sizes only). It is loaded while the **genome** is built.
_Avoid_: sequence track (a different thing), reference

**Sequence-less genome**:
A **genome** whose chromosomes are known but whose bases are not, because its **sequence source** supplies only chromosome sizes. Navigation works, and anything that needs bases does not.
_Avoid_: degraded genome, reduced genome

**Sequence fallback**:
Loading a **sequence-less genome** in place of a **genome** whose **sequence source** failed. A **genome definition** that asks for chromosome sizes only gives a **sequence-less genome**, but that is not a **sequence fallback**.

**Established session**:
The state of the browser once its **genome** has loaded exactly as its **genome definition** describes: its real **sequence source**, every **genome track**, and the **sequence track**. After a **sequence fallback**, or when a **genome track** failed, the session is not established. It can only be used to pick a different **genome**, and it cannot be saved.
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

- A **genome** has exactly one **sequence source**. A **sequence-less genome** is one whose **sequence source** supplies chromosome sizes only.
- A **genome** has zero or more **genome tracks**. Loading a session loads the **genome tracks** first, then the **session tracks**.
- The **sequence track** reads from the **genome**'s **sequence source**. It never loads a file of its own unless its configuration names one.

- A session is saved only when it is an **established session**. Work is assumed to begin only once the session is established.

## Flagged ambiguities

- "The sequence failed" has been used to mean the **sequence track** failed. What fails is the **sequence source**, while the **genome** is built. The **sequence track** fetches nothing when it is created.
