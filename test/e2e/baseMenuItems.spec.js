import {test, expect, TINY_GENOME} from "./harness.js"

const DATA = "/test/e2e/data"

// Zoomed in far enough (under 1 bp per pixel) for the sequence track to offer its sequence items, and wholly
// inside geneA so a click anywhere on the gene track lands on it.
const LOCUS = "chr1:201-400"

const SEQUENCE_ITEMS = ["View visible sequence...", "Copy visible sequence", "BLAT visible sequence"]
const FEATURE_ITEMS = ["View feature sequence", "Copy feature sequence"]

const CHROM_SIZES_ONLY = {id: "tiny-sizes", name: "Tiny chrom sizes", format: "chromsizes", fastaURL: `${DATA}/tiny.chrom.sizes`}

// The menu labels that offer bases
const sequenceItems = labels => labels.filter(label => /sequence/.test(label))

// The load-failure alert is off: after a fallback it would cover the tracks the test right-clicks
async function openAt(igvPage, genome) {
    expect(await igvPage.createBrowser({genome, showLoadFailureAlert: false})).toEqual({resolved: true})
    expect(await igvPage.search(LOCUS)).toEqual({resolved: true})
}

test("a genome with bases offers the sequence menu items", async ({igvPage}) => {

    await openAt(igvPage, TINY_GENOME)

    expect(sequenceItems(await igvPage.contextMenu("sequence"))).toEqual(SEQUENCE_ITEMS)
    expect(sequenceItems(await igvPage.contextMenu("annotation"))).toEqual(FEATURE_ITEMS)
})

test("after a sequence fallback the menu items that need bases are absent", async ({igvPage}) => {

    await igvPage.blockRequests("**/tiny.fa*")
    await openAt(igvPage, TINY_GENOME)

    expect(sequenceItems(await igvPage.contextMenu("sequence"))).toEqual([])
    expect(sequenceItems(await igvPage.contextMenu("annotation"))).toEqual([])
})

test("on a chrom-sizes-only genome the menu items that need bases are absent", async ({igvPage}) => {

    await openAt(igvPage, {...CHROM_SIZES_ONLY, tracks: TINY_GENOME.tracks})

    expect(sequenceItems(await igvPage.contextMenu("sequence"))).toEqual([])
    expect(sequenceItems(await igvPage.contextMenu("annotation"))).toEqual([])
})

test("the menu items return after switching to a genome that loads completely", async ({igvPage}) => {

    await openAt(igvPage, CHROM_SIZES_ONLY)
    expect(await igvPage.loadGenome({...TINY_GENOME, id: "tiny-complete"})).toEqual({resolved: true})
    expect(await igvPage.search(LOCUS)).toEqual({resolved: true})

    expect(sequenceItems(await igvPage.contextMenu("sequence"))).toEqual(SEQUENCE_ITEMS)
    expect(sequenceItems(await igvPage.contextMenu("annotation"))).toEqual(FEATURE_ITEMS)
})
