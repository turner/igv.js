import {test, expect, DATA, TINY_GENOME} from "./harness.js"

// Optional parts that load lazily, on first use after createBrowser resolves (ADR 0002): each one that fails is
// logged once and drawn without. They are not reported in loadfailures.

const MISSING_CYTOBAND = `${DATA}/missing.cytoband.txt`
const MISSING_CYTOBAND_BB = `${DATA}/missing.cytoband.bb`
const MISSING_ALIAS = `${DATA}/missing.chromAlias.txt`

// Visiting each chromosome in turn rebuilds the locus columns, so every visit repaints the ideogram
const LOCI = ["chr2", "chr1", "chr2"]

const CYTOBAND_PARTS = [
    {name: "cytobandURL", url: MISSING_CYTOBAND},
    {name: "cytobandBbURL", url: MISSING_CYTOBAND_BB}
]

for (const {name, url} of CYTOBAND_PARTS) {

    const genome = {...TINY_GENOME, id: `tiny-${name}`, [name]: url}

    test(`a blocked ${name} leaves a working browser with an ideogram drawn without bands`, async ({igvPage}) => {

        const blocked = await igvPage.blockRequests(`**${url}`)

        const result = await igvPage.createBrowser({genome, locus: "chr1"}, {listen: true})

        expect(result).toEqual({resolved: true})
        await expect(igvPage.ideograms()).toBeVisible()
        await expect.poll(() => igvPage.ideogramIsPainted()).toBe(true)
        await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name])
        await expect(igvPage.alert()).toBeHidden()
        await expect.poll(() => blocked.length).toBeGreaterThan(0)
        expect(await igvPage.search("chr2")).toEqual({resolved: true})
        expect(await igvPage.currentLoci()).toMatch(/^chr2:/)
        expect(await igvPage.loadFailureEvents()).toEqual([])
        expect(igvPage.pageErrors).toEqual([])
    })

    test(`a blocked ${name} is logged once, not on every repaint`, async ({igvPage}) => {

        await igvPage.blockRequests(`**${url}`)

        expect(await igvPage.createBrowser({genome, locus: "chr1"})).toEqual({resolved: true})
        for (const locus of LOCI) {
            expect(await igvPage.search(locus)).toEqual({resolved: true})
        }

        // Cytobands load as the ideogram paints, which the search does not await, so wait for the log
        await expect.poll(() => igvPage.consoleErrorsMentioning(url).length).toBeGreaterThan(0)
        expect(igvPage.consoleErrorsMentioning(url)).toHaveLength(1)
        expect(igvPage.pageErrors).toEqual([])
    })
}

const GENOME_WITH_ALIAS = {...TINY_GENOME, id: "tiny-alias", aliasURL: MISSING_ALIAS}

test("a blocked aliasURL still finds a chromosome by its canonical name", async ({igvPage}) => {

    const blocked = await igvPage.blockRequests(`**${MISSING_ALIAS}`)

    const result = await igvPage.createBrowser({genome: GENOME_WITH_ALIAS, locus: "chr1"}, {listen: true})

    expect(result).toEqual({resolved: true})
    expect(await igvPage.search("chr2")).toEqual({resolved: true})
    expect(await igvPage.currentLoci()).toMatch(/^chr2:/)
    await expect(igvPage.trackLabels()).toHaveText([TINY_GENOME.tracks[0].name])
    await expect(igvPage.alert()).toBeHidden()
    expect(blocked.length).toBeGreaterThan(0)
    expect(await igvPage.loadFailureEvents()).toEqual([])
    expect(igvPage.pageErrors).toEqual([])
})

test("a blocked aliasURL is logged once, not on every search", async ({igvPage}) => {

    await igvPage.blockRequests(`**${MISSING_ALIAS}`)

    // Each search looks its chromosome name up in the alias
    expect(await igvPage.createBrowser({genome: GENOME_WITH_ALIAS, locus: "chr1"})).toEqual({resolved: true})
    for (const locus of LOCI) {
        expect(await igvPage.search(locus)).toEqual({resolved: true})
    }

    expect(igvPage.consoleErrorsMentioning(MISSING_ALIAS)).toHaveLength(1)
    expect(igvPage.pageErrors).toEqual([])
})
