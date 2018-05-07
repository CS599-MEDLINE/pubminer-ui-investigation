"use strict";

const assert = require('assert');
const DocHelper = require('../DocumentHelper');
const Errors = require('../Errors');
const fs = require('fs');
const fsOptions = {
    encoding: 'utf-8',
    flag: 'r'
};

describe('DocumentHelper', function () {

    describe('.stripLetterFromId', function () {
        it('returns numeric portion of the identifier', function () {
            const id = DocHelper.stripLettersFromId('PMC12345');
            assert.strictEqual(id, '12345');
        });

        it('returns pure numeric identifiers unchanged', function () {
           const id = DocHelper.stripLettersFromId('12345');
           assert.strictEqual(id, '12345');
        });
    });

    describe('.extractAbstract', function () {

        it('returns text for simple text abstract', function () {
            const xml = fs.readFileSync('./test/data/detail/efetch.xml', fsOptions);
            const abstract = DocHelper.extractAbstract(xml);
            return abstract.then(abs => {
                assert.strictEqual(abs.abstract,
                    'Anti-glycolipid antibodies are key to revealing the pathomechanisms');
            });
        });

        // TODO: more testing of `extractAbstract` with different document formats

    });

    describe('.extractSearchResults', function () {

        it('extracts meta information from NCBI search results', function () {
            const results = require('./data/search/pubmed_search_success');
            const query = 'my-search-term';
            const er = DocHelper.extractSearchResults(results, query);
            assert.strictEqual(er.itemsFound, parseInt(results.esearchresult.count));
            assert.strictEqual(er.searchTerm, query);
            assert.strictEqual(er.itemsReturned, results.esearchresult.idlist.length);
            assert.strictEqual(er.webenv, results.esearchresult.webenv);
            assert.strictEqual(er.querykey, results.esearchresult.querykey);
        });
    });

    describe('.getLinkedIdsByType', function () {

        it('raises  uids field', function(){
            const docResult = {
                result: {
                    notUids: null
                }
            };
            assert.throws(function () {
                return DocHelper.getLinkedIdsByType(docResult);
            }, new Errors.InvalidDocumentFormatError(
                new TypeError(`Cannot read property 'reduce' of undefined`)));
        });

        it('returns a map of uids to id-type', function () {
            const summary = require('./data/summary/pubmed-esummary-success.json');
            const linkedIds = DocHelper.getLinkedIdsByType(summary, "pmc");
            assert.strictEqual(linkedIds["29489680"], 'PMC5851734');
            assert.strictEqual(linkedIds["29390338"], 'PMC5815750');

        });

        it('removes IDs without the linked ID type from the result', function () {
            const summary = require('./data/summary/pubmed-esummary-success.json');
            const linkedIds = DocHelper.getLinkedIdsByType(summary, "pmc");
            assert.strictEqual(linkedIds["29603827"], undefined);
        });

    });

    describe('.groupSentencesBySection', function () {

        it('handles undefined arrays', function () {
            const grouped = DocHelper.groupSentencesBySection(null);
            assert.strictEqual(grouped.length, 0);
        });

        it('handles empty arrays', function () {
            const grouped = DocHelper.groupSentencesBySection([]);
            assert.strictEqual(grouped.length, 0);
        });

        it('keeps stable order of grouped sections', function () {
            const sections = [1, 2, 1, 3, 2, 4].map(x => 'sec' + x);
            const texts = sections.map((sec, idx) => `text ${idx} for ${sec}`);
            const sentences = sections.map((s, idx) => {
               return {
                   section: s,
                   text: texts[idx]
               };
            });

            const grouped = DocHelper.groupSentencesBySection(sentences);
            assert.strictEqual(grouped.length, 4);
            assert.strictEqual(grouped[0].sentences.length, 2);
            assert.strictEqual(grouped[1].sentences.length, 2);
            assert.strictEqual(grouped[2].sentences.length, 1);
            assert.strictEqual(grouped[3].sentences.length, 1);
        });

        it('keeps a stable ordering of sentences', function () {
            const sections = [1, 2, 1, 3, 2, 4].map(x => 'sec' + x);
            const texts = sections.map((sec, idx) => `text ${idx} for ${sec}`);
            const sentences = sections.map((s, idx) => {
                return {
                    section: s,
                    text: texts[idx]
                };
            });

            const grouped = DocHelper.groupSentencesBySection(sentences);
            assert.strictEqual(grouped.length, 4);

            const sec1Sentences = grouped[0].sentences;

            let lastIdx = -1;
            sec1Sentences.forEach(sentence => {
                let idx = texts.indexOf(sentence);
                assert.strictEqual(idx > lastIdx, true);
                lastIdx = idx;
            });

            const sec2Sentences = grouped[1].sentences;
            lastIdx = -1;
            sec2Sentences.forEach(sentence => {
                let idx = texts.indexOf(sentence);
                assert.strictEqual(idx > lastIdx, true);
                lastIdx = idx;
            });
        });
    });

    describe('.mergeDemographicAndSummaryResults', function () {

        const demoDetails = require('./data/demographics/fake_demo_data.json');
        const summary = require('./data/summary/pubmed-esummary-success.json');

        it('returns all items from the summary in the same order', function () {
            DocHelper.mergeDemographicAndSummaryResults(demoDetails, summary);
            // TODO: add validations

        });

        it('includes demographic details where available', function () {

        });

        it('returns the expected attributes for each item', function () {

        });

    });
});
