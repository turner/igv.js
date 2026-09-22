import {test, expect, DATA} from "./harness.js"

// A minimal genome definition is a sequence source and nothing else (ADR 0002): no id, no index, no chrom sizes.
const FASTA_ONLY = {fastaURL: `${DATA}/tiny.fa`}
const TWOBIT_ONLY = {twoBitURL: "/test/data/twobit/foo.2bit"}

// A second id-less 2bit genome. The test server ignores the query, so it is the same file at a different URL;
// its derived id differs only if the id keeps the whole URL, as it does for fastaURL.
const OTHER_TWOBIT_ONLY = {twoBitURL: "/test/data/twobit/foo.2bit?other"}

// The navbar shows "..." for an empty genome id
const EMPTY_GENOME_LABEL = /^(\.\.\.)?$/

const DEFINITIONS = [
    {name: "fastaURL", genome: FASTA_ONLY, chromosomes: ["chr1", "chr2"]},
    {name: "twoBitURL", genome: TWOBIT_ONLY, chromosomes: ["chr1"], offsiteStartupSearch: true}
]

for (const {name, genome, chromosomes, offsiteStartupSearch} of DEFINITIONS) {

    test(`${name} alone gives a browser with the genome's chromosomes and a sequence track`, async ({igvPage}) => {

        const result = await igvPage.createBrowser({genome})

        expect(result).toEqual({resolved: true})
        expect(await igvPage.chromosomeNames()).toEqual(chromosomes)
        expect(await igvPage.sequenceTrackCount()).toEqual(1)
    })

    test(`${name} alone gives a non-empty genome id and navbar label`, async ({igvPage}) => {

        await igvPage.createBrowser({genome})

        expect(await igvPage.genomeId()).not.toEqual("")
        await expect(igvPage.genomeLabel()).not.toHaveText(EMPTY_GENOME_LABEL)
    })

    test(`${name} alone makes no off-site request`, async ({igvPage}) => {

        // foo.2bit has one chromosome, so no whole genome view: the startup search is for the bare name "chr1",
        // which search.js sends to the igv.org search service before trying it as a chromosome. The id fix (#19)
        // changes only the genome in that request, so this stays expected-fail until the search order is fixed.
        // tiny.fa passes only because its two chromosomes give a whole genome view, and "all" is searched locally.
        test.fail(!!offsiteStartupSearch)

        await igvPage.createBrowser({genome})

        expect(igvPage.offsiteRequests).toEqual([])
    })
}

test("switching between two id-less 2bit genomes fires genomechange", async ({igvPage}) => {

    await igvPage.createBrowser({genome: TWOBIT_ONLY})
    await igvPage.listenForGenomeChanges()

    const result = await igvPage.loadGenome(OTHER_TWOBIT_ONLY)

    expect(result).toEqual({resolved: true})
    expect(await igvPage.genomeChangeEvents()).toHaveLength(1)
})
