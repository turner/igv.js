import {test, expect, TINY_GENOME} from "./harness.js"

const DATA = "/test/e2e/data"

// The FASTA and its index: the whole sequence source.
const SEQUENCE = "**/tiny.fa*"
const CHROM_SIZES = "**/tiny.chrom.sizes"

// The loadfailures entry for TINY_GENOME's sequence source failing.
const sequenceFailure = {kind: "sequence", url: TINY_GENOME.fastaURL, message: expect.any(String)}

test("a blocked sequence source opens a navigable browser on the chrom sizes", async ({igvPage}) => {

    await igvPage.blockRequests(SEQUENCE)

    const result = await igvPage.createBrowser({genome: TINY_GENOME})

    expect(result).toEqual({resolved: true})
    await expect(igvPage.trackLabels()).toContainText([TINY_GENOME.tracks[0].name])

    expect(await igvPage.search("chr2:101-200")).toEqual({resolved: true})
    expect(await igvPage.currentLoci()).toEqual("chr2:101-200")
})

test("the sequence fallback is reported as kind sequence", async ({igvPage}) => {

    await igvPage.blockRequests(SEQUENCE)

    await igvPage.createBrowser({genome: TINY_GENOME}, {listen: true})

    expect(await igvPage.loadFailureEvents()).toEqual([[sequenceFailure]])
    await expect(igvPage.alert()).toContainText(TINY_GENOME.fastaURL)
})

test("a genome switch that falls back opens and reports the sequence failure", async ({igvPage}) => {

    await igvPage.createBrowser({genome: TINY_GENOME})
    await igvPage.listenForLoadFailures()
    await igvPage.blockRequests(SEQUENCE)

    const result = await igvPage.loadGenome({...TINY_GENOME, id: "tiny-fallback"})

    expect(result).toEqual({resolved: true})
    expect(await igvPage.loadFailureEvents()).toEqual([[sequenceFailure]])
})

test("with the sequence source and the chrom sizes both blocked, the load rejects", async ({igvPage}) => {

    await igvPage.blockRequests(SEQUENCE)
    await igvPage.blockRequests(CHROM_SIZES)

    const result = await igvPage.createBrowser({genome: TINY_GENOME})

    expect(result.resolved).toBe(false)
})

test("the sequence fallback leaves the genome definition unchanged", async ({igvPage}) => {

    await igvPage.blockRequests(SEQUENCE)

    await igvPage.createBrowser({genome: TINY_GENOME})

    // Tracks are left out: session loading stamps an order on track configurations, fallback or not
    const {tracks, ...definition} = await igvPage.genomeDefinition()
    const {tracks: _, ...original} = TINY_GENOME
    expect(definition).toEqual(original)
})

test("a chrom-sizes-only definition loads normally and is not a sequence fallback", async ({igvPage}) => {

    const result = await igvPage.createBrowser({
        genome: {id: "tiny-sizes", name: "Tiny chrom sizes", format: "chromsizes", fastaURL: `${DATA}/tiny.chrom.sizes`}
    }, {listen: true})

    expect(result).toEqual({resolved: true})
    expect(await igvPage.search("chr2:101-200")).toEqual({resolved: true})
    expect(await igvPage.loadFailureEvents()).toEqual([])
    await expect(igvPage.alert()).toBeHidden()
})
