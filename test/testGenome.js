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

    suite("sequence source", function () {

        const DATA = "test/e2e/data"

        test("a failed sequence source rejects the genome, even with chromSizesURL", async function () {
            const config = {
                id: "tiny",
                fastaURL: `${DATA}/missing.fa`,
                indexURL: `${DATA}/missing.fa.fai`,
                chromSizesURL: `${DATA}/tiny.chrom.sizes`
            }
            let error
            try {
                await Genome.createGenome(config)
            } catch (e) {
                error = e
            }
            assert.isDefined(error)
        })
    })

    suite("genome id", function () {

        test("an explicit id wins over twoBitURL", function () {
            const genome = new Genome({id: "foo", twoBitURL: "test/data/twobit/foo.2bit"})
            assert.equal(genome.id, "foo")
        })

        test("a twoBitURL given as a File uses its name", function () {
            const twoBitURL = new File(new ArrayBuffer(0), "foo.2bit")
            const genome = new Genome({twoBitURL})
            assert.equal(genome.id, "foo.2bit")
        })
    })
})
