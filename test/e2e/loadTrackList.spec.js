import {test, expect, TINY_GENOME} from "./harness.js"

const GENES = "/test/e2e/data/tiny.genes.bed"

const bed = (name, url) => ({name, type: "annotation", format: "bed", url})

test("a rejecting loadTrackList leaves the tracks that loaded ordered and sized", async ({igvPage}) => {

    await igvPage.createBrowser({genome: TINY_GENOME})

    // The first track finishes last, so arrival order differs from configured order.
    // The query strings only make the two URLs distinct.
    await igvPage.page.route("**/tiny.genes.bed?slow", async route => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return route.continue()
    })
    await igvPage.blockRequests("**/missing.bed")

    const result = await igvPage.loadTrackList([
        bed("First", `${GENES}?slow`),
        bed("Broken", "/test/e2e/data/missing.bed"),
        bed("Third", `${GENES}?third`)
    ])

    expect(result.resolved).toBe(false)
    expect(result.message).toContain("missing.bed")
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name, "First", "Third"])

    // Every track's data panel spans the same width.
    const widths = await igvPage.viewportWidths()
    expect(widths.length).toBeGreaterThan(2)
    expect(new Set(widths).size).toBe(1)
})
