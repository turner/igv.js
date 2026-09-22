import {test, expect, DATA, TINY_GENOME} from "./harness.js"

// Optional parts that are awaited while the genome is built (ADR 0002): each one that fails is left out, and
// reported in the load's loadfailures event alongside any track failures.

const MISSING_ALIAS_BB = `${DATA}/missing.chromAlias.bb`
const MISSING_CHROM_SIZES = `${DATA}/missing.chrom.sizes`

// The indexed FASTA lists its chromosomes, so the alias bigBed is preloaded for the whole genome view
const GENOME_WITH_ALIAS_BB = {...TINY_GENOME, id: "tiny-alias-bb", chromAliasBbURL: MISSING_ALIAS_BB}

test("a blocked chromAliasBbURL leaves a working browser, and loadfailures names it", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING_ALIAS_BB}`)

    const result = await igvPage.createBrowser({genome: GENOME_WITH_ALIAS_BB}, {listen: true})

    expect(result).toEqual({resolved: true})
    expect(await igvPage.chromosomeNames()).toEqual(["chr1", "chr2"])
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name])
    expect(await igvPage.loadFailureEvents()).toEqual([[
        {kind: "chromAlias", url: MISSING_ALIAS_BB, message: expect.any(String)}
    ]])
})

// A 2bit sequence lists its chromosome names but not their lengths, so the chrom sizes are fetched during the load
const TWOBIT_WITH_CHROM_SIZES = {twoBitURL: "/test/data/twobit/foo.2bit", chromSizesURL: MISSING_CHROM_SIZES}

test("a blocked chromSizesURL on a 2bit genome leaves a working browser, and loadfailures names it", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING_CHROM_SIZES}`)

    const result = await igvPage.createBrowser({genome: TWOBIT_WITH_CHROM_SIZES}, {listen: true})

    expect(result).toEqual({resolved: true})
    expect(await igvPage.chromosomeNames()).toEqual(["chr1"])
    expect(await igvPage.sequenceTrackCount()).toEqual(1)
    expect(await igvPage.loadFailureEvents()).toEqual([[
        {kind: "chromSizes", url: MISSING_CHROM_SIZES, message: expect.any(String)}
    ]])
})

const MISSING_TRACK = `${DATA}/missing.bed`
const GENOME_WITH_ALIAS_BB_AND_BROKEN_TRACK = {
    ...GENOME_WITH_ALIAS_BB,
    tracks: [...TINY_GENOME.tracks, {name: "Broken genome track", type: "annotation", format: "bed", url: MISSING_TRACK}]
}

const EXPECTED_FAILURES = [
    {kind: "chromAlias", url: MISSING_ALIAS_BB, message: expect.any(String)},
    {kind: "track", url: MISSING_TRACK, message: expect.any(String)}
]

test("a failed optional part is reported with the track failures, in one event", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING_ALIAS_BB}`)
    await igvPage.blockRequests(`**${MISSING_TRACK}`)

    await igvPage.createBrowser({genome: GENOME_WITH_ALIAS_BB_AND_BROKEN_TRACK}, {listen: true})

    expect(await igvPage.loadFailureEvents()).toEqual([EXPECTED_FAILURES])
})

test("a failed optional part is listed with the track failures, in one alert", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING_ALIAS_BB}`)
    await igvPage.blockRequests(`**${MISSING_TRACK}`)

    await igvPage.createBrowser({genome: GENOME_WITH_ALIAS_BB_AND_BROKEN_TRACK})

    await expect(igvPage.alert()).toContainText(MISSING_ALIAS_BB)
    await expect(igvPage.alert()).toContainText(MISSING_TRACK)
})

test("a genome switch reports a failed optional part with the track failures, once", async ({igvPage}) => {

    await igvPage.createBrowser({genome: TINY_GENOME})
    await igvPage.listenForLoadFailures()
    await igvPage.blockRequests(`**${MISSING_ALIAS_BB}`)
    await igvPage.blockRequests(`**${MISSING_TRACK}`)

    const result = await igvPage.loadGenome(GENOME_WITH_ALIAS_BB_AND_BROKEN_TRACK)

    expect(result).toEqual({resolved: true})
    expect(await igvPage.loadFailureEvents()).toEqual([EXPECTED_FAILURES])
    await expect(igvPage.alert()).toContainText(MISSING_ALIAS_BB)
    await expect(igvPage.alert()).toContainText(MISSING_TRACK)
})
