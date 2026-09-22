import {test, expect, TINY_GENOME} from "./harness.js"

const DATA = "/test/e2e/data"
const MISSING = `${DATA}/missing.bed`

const bed = (name, url) => ({name, type: "annotation", format: "bed", url})

// A loadfailures entry for a track whose URL failed.
const trackFailure = url => ({kind: "track", url, message: expect.any(String)})

// TINY_GENOME plus a second genome track whose file is blocked.
const GENOME_WITH_BROKEN_TRACK = {
    ...TINY_GENOME,
    tracks: [...TINY_GENOME.tracks, bed("Broken genome track", MISSING)]
}

test("a blocked genome track leaves a working browser with the remaining tracks", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING}`)

    const result = await igvPage.createBrowser({genome: GENOME_WITH_BROKEN_TRACK})

    expect(result).toEqual({resolved: true})
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name])
})

test("a blocked session track leaves a working browser with the remaining tracks", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING}`)

    const result = await igvPage.createBrowser({
        genome: TINY_GENOME,
        tracks: [bed("Broken session track", MISSING), bed("Session track", `${DATA}/tiny.genes.bed?session`)]
    })

    expect(result).toEqual({resolved: true})
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name, "Session track"])
})

test("restoring a session with a blocked track opens the rest of the session", async ({igvPage}) => {

    await igvPage.createBrowser({genome: TINY_GENOME})
    await igvPage.blockRequests(`**${MISSING}`)

    const result = await igvPage.loadSession({
        genome: TINY_GENOME,
        tracks: [bed("Restored track", `${DATA}/tiny.genes.bed?restored`), bed("Broken session track", MISSING)]
    })

    expect(result).toEqual({resolved: true})
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name, "Restored track"])
})

test("loadfailures fires once for the first load, with an entry per failure, to a createBrowser listener", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING}*`)

    await igvPage.createBrowser({
        genome: GENOME_WITH_BROKEN_TRACK,
        tracks: [bed("Broken session track", `${MISSING}?session`)]
    }, {listen: true})

    const events = await igvPage.loadFailureEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual([
        trackFailure(MISSING),
        trackFailure(`${MISSING}?session`)
    ])
})

test("a genome switch with a blocked track loads the rest and reports it to a subscribed listener", async ({igvPage}) => {

    await igvPage.createBrowser({genome: TINY_GENOME})
    await igvPage.listenForLoadFailures()
    await igvPage.blockRequests(`**${MISSING}`)

    const result = await igvPage.loadGenome({...GENOME_WITH_BROKEN_TRACK, id: "tiny-broken"})

    expect(result).toEqual({resolved: true})
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name])
    expect(await igvPage.loadFailureEvents()).toEqual([[trackFailure(MISSING)]])
})

test("loadTrackList still rejects on a failed track, and does not report it as a load failure", async ({igvPage}) => {

    await igvPage.createBrowser({genome: TINY_GENOME}, {listen: true})
    await igvPage.blockRequests(`**${MISSING}`)

    const result = await igvPage.loadTrackList([bed("Broken", MISSING)])

    expect(result.resolved).toBe(false)
    expect(await igvPage.loadFailureEvents()).toEqual([])
    await expect(igvPage.alert()).toBeHidden()
})

test("by default one alert names every URL that failed in the load", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING}*`)

    await igvPage.createBrowser({
        genome: GENOME_WITH_BROKEN_TRACK,
        tracks: [bed("Broken session track", `${MISSING}?session`)]
    })

    await expect(igvPage.alert()).toBeVisible()
    await expect(igvPage.alert()).toContainText(MISSING)
    await expect(igvPage.alert()).toContainText(`${MISSING}?session`)
})

test("a createBrowser loadfailures listener replaces the alert, for later loads too", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING}`)

    await igvPage.createBrowser({genome: GENOME_WITH_BROKEN_TRACK}, {listen: true})
    await igvPage.loadGenome({...GENOME_WITH_BROKEN_TRACK, id: "tiny-broken"})

    expect(await igvPage.loadFailureEvents()).toHaveLength(2)
    await expect(igvPage.alert()).toBeHidden()
})

test("a genome definition listing no tracks loads normally, with nothing reported", async ({igvPage}) => {

    const {tracks, ...genomeWithoutTracks} = TINY_GENOME

    const result = await igvPage.createBrowser({genome: genomeWithoutTracks}, {listen: true})

    expect(result).toEqual({resolved: true})
    await expect(igvPage.trackLabels()).toHaveCount(0)
    expect(await igvPage.loadFailureEvents()).toEqual([])
    await expect(igvPage.alert()).toBeHidden()
})

test("a blocked hidden session track is reported once and does not stop the load", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING}`)

    const result = await igvPage.createBrowser({
        genome: TINY_GENOME,
        tracks: [{...bed("Hidden track", MISSING), hidden: true}]
    }, {listen: true})

    expect(result).toEqual({resolved: true})
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name])
    expect(await igvPage.loadFailureEvents()).toEqual([[trackFailure(MISSING)]])
})
