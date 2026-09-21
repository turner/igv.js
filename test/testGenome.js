import "./utils/mockObjects.js"
import Genome from "../js/genome/genome.js"
import {updateReference} from "../js/genome/updateReference.js"
import {assert} from 'chai'
import {shortenChromsomeName} from "../js/rulerTrack.js"


suite("testGenome", function () {

    test("Shorten name", function() {
        const names = ["chr1", "chromosome_1"]
        const expected = ["1", "chromosome_1"]

        for(let i=0; i<names.length; i++) {
            const shortened = shortenChromsomeName(names[i])
            assert.equal(shortened, expected[i])
        }
    })

    test("update reference", function() {

        const reference = {
            "id": "hg18",
            "name": "Human (hg18)",
            "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta",
            "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta.fai",
            "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/cytoBandIdeo.txt.gz",
            "tracks": [
                {
                    "name": "Refseq Genes",
                    "format": "refgene",
                    "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/refGene.txt.gz",
                    "indexed": false,
                    "visibilityWindow": -1,
                    "order": 1000000,
                    "searchable": true
                }
            ],
            "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY"
        }

        updateReference(reference)
        assert.isNotOk(reference.fastaURL)
        assert.isNotOk(reference.indexURL)
        assert.isOk(reference.twoBitURL)
        assert.isOk(reference.chromSizesURL)


    })

    suite("bases", function () {

        const DATA = "test/e2e/data"
        const tiny = {
            id: "tiny",
            fastaURL: `${DATA}/tiny.fa`,
            indexURL: `${DATA}/tiny.fa.fai`,
            chromSizesURL: `${DATA}/tiny.chrom.sizes`
        }

        test("a genome whose sequence loads has bases", async function () {
            const genome = await Genome.createGenome({...tiny})
            assert.isTrue(genome.hasBases)
            assert.isUndefined(genome.sequenceFallback)
        })

        test("a chrom-sizes-only definition has no bases and is not a sequence fallback", async function () {
            const genome = await Genome.createGenome({id: "tiny-sizes", format: "chromsizes", fastaURL: tiny.chromSizesURL})
            assert.isFalse(genome.hasBases)
            assert.isUndefined(genome.sequenceFallback)
        })

        test("a sequence fallback has no bases and is recorded as a fallback", async function () {
            const genome = await Genome.createGenome({...tiny, fastaURL: `${DATA}/missing.fa`, indexURL: `${DATA}/missing.fa.fai`})
            assert.isFalse(genome.hasBases)
            assert.isDefined(genome.sequenceFallback)
        })
    })
})
