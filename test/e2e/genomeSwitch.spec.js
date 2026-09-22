import {test, expect, DATA, TINY_GENOME} from "./harness.js"

// A genome whose sequence source fails: loading it rejects. Its files are deliberately absent, and blocked besides.
const BROKEN_GENOME = {
    id: "tiny-broken",
    name: "Broken genome",
    fastaURL: `${DATA}/broken.fa`,
    indexURL: `${DATA}/broken.fa.fai`
}
const BROKEN_SEQUENCE = "**/broken.fa*"

const SESSION_TRACK = {name: "Session track", type: "annotation", format: "bed", url: `${DATA}/tiny.genes.bed?session`}
const ROI_SETS = [{features: [{chr: "chr1", start: 1000, end: 2000}]}]

// A browser on TINY_GENOME with a session track and a region of interest: the user's work.
async function openWithWork(igvPage) {
    await igvPage.createBrowser({genome: TINY_GENOME, locus: "chr1", tracks: [SESSION_TRACK], roi: ROI_SETS})
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name, SESSION_TRACK.name])
    await expect(igvPage.roiRegions()).toHaveCount(1)
}

test("a genome switch that fails leaves the previous genome, its tracks and its ROIs", async ({igvPage}) => {

    await openWithWork(igvPage)
    await igvPage.blockRequests(BROKEN_SEQUENCE)

    const result = await igvPage.loadGenome(BROKEN_GENOME)

    expect(result.resolved).toBe(false)
    expect(await igvPage.genomeId()).toEqual(TINY_GENOME.id)
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name, SESSION_TRACK.name])
    await expect(igvPage.roiRegions()).toHaveCount(1)
    expect(await igvPage.search("chr2:101-200")).toEqual({resolved: true})
})

test("after a failed genome switch, switching to a working genome succeeds", async ({igvPage}) => {

    await openWithWork(igvPage)
    await igvPage.blockRequests(BROKEN_SEQUENCE)
    await igvPage.loadGenome(BROKEN_GENOME)

    const result = await igvPage.loadGenome({...TINY_GENOME, id: "tiny-2"})

    expect(result).toEqual({resolved: true})
    expect(await igvPage.genomeId()).toEqual("tiny-2")
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name])
})

test("a successful genome switch clears the previous genome's tracks and ROIs", async ({igvPage}) => {

    await openWithWork(igvPage)

    const result = await igvPage.loadGenome({...TINY_GENOME, id: "tiny-2", tracks: []})

    expect(result).toEqual({resolved: true})
    expect(await igvPage.genomeId()).toEqual("tiny-2")
    await expect(igvPage.trackLabels()).toHaveCount(0)
    await expect(igvPage.roiRegions()).toHaveCount(0)
})

test("a rejected createBrowser leaves no browser in the page and none in the browser list", async ({igvPage}) => {

    await igvPage.blockRequests(BROKEN_SEQUENCE)

    const result = await igvPage.createBrowser({genome: BROKEN_GENOME})

    expect(result.resolved).toBe(false)
    await expect(igvPage.containerContents()).toHaveCount(0)
    expect(await igvPage.browserCount()).toEqual(0)
})

// TINY_GENOME's sequence source: the FASTA and its index. Its chrom sizes stay reachable, but never stand in for the
// sequence (ADR 0002).
const TINY_SEQUENCE = "**/tiny.fa*"

test("with the sequence blocked and the chrom sizes reachable, createBrowser rejects and leaves no browser", async ({igvPage}) => {

    await igvPage.blockRequests(TINY_SEQUENCE)

    const result = await igvPage.createBrowser({genome: TINY_GENOME})

    expect(result.resolved).toBe(false)
    await expect(igvPage.containerContents()).toHaveCount(0)
    expect(await igvPage.browserCount()).toEqual(0)
})

test("a genome switch whose sequence fails, with the chrom sizes reachable, leaves the previous genome", async ({igvPage}) => {

    await openWithWork(igvPage)
    await igvPage.blockRequests(TINY_SEQUENCE)

    const result = await igvPage.loadGenome({...TINY_GENOME, id: "tiny-2"})

    expect(result.resolved).toBe(false)
    expect(await igvPage.genomeId()).toEqual(TINY_GENOME.id)
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name, SESSION_TRACK.name])
    await expect(igvPage.roiRegions()).toHaveCount(1)
})
