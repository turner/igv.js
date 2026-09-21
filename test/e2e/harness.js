// Playwright fixtures for driving igv.js in real Chromium.
//
// Each test gets an `igvPage`: the harness page, loaded with every off-site request aborted so the suite
// never touches the network. Tests assert on what a user or embedder observes — never on internal calls.

import {test as base, expect} from "@playwright/test"

const DATA = "/test/e2e/data"

// A custom genome whose every part is a local file, so each part can be blocked deterministically.
export const TINY_GENOME = {
    id: "tiny",
    name: "Tiny test genome",
    fastaURL: `${DATA}/tiny.fa`,
    indexURL: `${DATA}/tiny.fa.fai`,
    chromSizesURL: `${DATA}/tiny.chrom.sizes`,
    tracks: [
        {
            name: "Tiny genes",
            type: "annotation",
            format: "bed",
            url: `${DATA}/tiny.genes.bed`
        }
    ]
}

class IGVPage {

    constructor(page, baseURL) {
        this.page = page
        this.origin = new URL(baseURL).origin
        this.offsiteRequests = []
    }

    async open() {
        await this.page.route(url => url.origin !== this.origin, route => {
            this.offsiteRequests.push(route.request().url())
            return route.abort("internetdisconnected")
        })
        await this.page.goto("/test/e2e/harness.html")
        await this.page.waitForFunction(() => window.harnessReady === true)
    }

    /**
     * Abort every request whose URL matches `pattern` (a Playwright glob, RegExp, or predicate), as a network
     * failure would. Returns an array that fills with the URLs actually blocked.
     */
    async blockRequests(pattern) {
        const blocked = []
        await this.page.route(pattern, route => {
            blocked.push(route.request().url())
            return route.abort("failed")
        })
        return blocked
    }

    /**
     * Call igv.createBrowser in the page. Resolves to {resolved: true}, or {resolved: false, message}.
     * The igv.org default genome list is off, as it is fetched from the network.
     */
    createBrowser(config, {listen = false} = {}) {
        return this.page.evaluate(
            ([config, options]) => window.createBrowser(config, options),
            [{loadDefaultGenomes: false, ...config}, {listen}])
    }

    /** Call browser.loadTrackList in the page. Resolves to {resolved: true}, or {resolved: false, message}. */
    loadTrackList(configs) {
        return this.page.evaluate(configs => window.loadTrackList(configs), configs)
    }

    /** Call browser.loadSession in the page with a session object. Resolves like createBrowser. */
    loadSession(session) {
        return this.page.evaluate(session => window.loadSession(session), session)
    }

    /** Call browser.loadGenome in the page — a genome switch. Resolves like createBrowser. */
    loadGenome(genome) {
        return this.page.evaluate(genome => window.loadGenome(genome), genome)
    }

    /** Call browser.search in the page. Resolves like createBrowser. */
    search(locus) {
        return this.page.evaluate(locus => window.search(locus), locus)
    }

    /** The locus displayed, as browser.currentLoci() gives it: a string, or an array in multi-locus view. */
    currentLoci() {
        return this.page.evaluate(() => window.currentLoci())
    }

    /** The genome definition object passed to createBrowser, read back after the load. */
    genomeDefinition() {
        return this.page.evaluate(() => window.genomeDefinition())
    }

    /** Subscribe to loadfailures on the existing browser, as an embedder would after createBrowser. */
    listenForLoadFailures() {
        return this.page.evaluate(() => window.listenForLoadFailures())
    }

    /** The argument of every loadfailures event received so far (see the `listen` option of createBrowser). */
    loadFailureEvents() {
        return this.page.evaluate(() => window.loadFailureEvents)
    }

    /** The browser's alert dialog (viewports hold alert dialogs of their own). */
    alert() {
        return this.page.locator("#igv-div .igv-container > .igv-ui-alert-dialog-container")
    }

    /** Track labels as the user sees them (Playwright locators pierce igv's open shadow root). */
    trackLabels() {
        return this.page.locator("#igv-div .igv-track-label")
    }

    /** Rendered widths of every track's data panel, in the first locus column. */
    viewportWidths() {
        return this.page.locator("#igv-div .igv-column").first().locator(".igv-viewport")
            .evaluateAll(elements => elements.map(e => e.getBoundingClientRect().width))
    }
}

export const test = base.extend({
    igvPage: async ({page, baseURL}, use) => {
        const igvPage = new IGVPage(page, baseURL)
        await igvPage.open()
        await use(igvPage)
    }
})

export {expect}
