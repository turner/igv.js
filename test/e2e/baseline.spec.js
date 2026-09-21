import {test, expect, TINY_GENOME} from "./harness.js"

test("baseline: nothing blocked, the browser opens with the genome track", async ({igvPage}) => {

    const result = await igvPage.createBrowser({genome: TINY_GENOME})

    expect(result).toEqual({resolved: true})
    await expect(igvPage.trackLabels()).toContainText([TINY_GENOME.tracks[0].name])
    expect(igvPage.offsiteRequests).toEqual([])
})

test("blockRequests aborts every request matching the pattern", async ({igvPage}) => {

    const blocked = await igvPage.blockRequests("**/tiny.genes.bed")

    await igvPage.createBrowser({genome: TINY_GENOME})

    expect(blocked.length).toBeGreaterThan(0)
    expect(blocked.every(url => url.endsWith("/tiny.genes.bed"))).toBe(true)
})
