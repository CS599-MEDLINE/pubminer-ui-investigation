"use strict";

const assert = require('assert');
const QueryHelper = require('../QueryHelper');

describe('QueryTermHelper', function () {
    describe('.isEmpty', function () {

        it('returns true for undefined', function () {
            assert.strictEqual(QueryHelper.isEmptyTerm(null), true);
        });

        it('returns true for empty string', function () {
            assert.strictEqual(QueryHelper.isEmptyTerm(""), true);
        });

        it('returns true for non-string', function () {
            assert.strictEqual(QueryHelper.isEmptyTerm(["hello"]), true);
        });

        it('returns false for non-empty string', function () {
            assert.strictEqual(QueryHelper.isEmptyTerm("not empty"), false);
        });
    });

    describe('.getDateFilter', function () {

        it('returns empty string for 0', function () {
            assert.strictEqual(QueryHelper.getDateFilter('0'), "");
        });

        it('returns empty string undefined value', function () {
            assert.strictEqual(QueryHelper.getDateFilter(undefined), "");
        });

        it('returns empty string unsupported value', function () {
            assert.strictEqual(QueryHelper.getDateFilter("5"), "");
        });

        it('returns expected term for a valid value', function () {
            ["1", "2", "3"].forEach(value => {
                const pattern = `^"last ${value} years"\\[PDat\\]$`;
                const regex = new RegExp(pattern);
                assert.strictEqual(regex.test(QueryHelper.getDateFilter(value)), true);
            });
        });
    });

    describe('.combineSearchTerms', function () {

        it('returns a provided string unchanged', function () {
            const nonArrayTerm = 'xyz';
            const combinedTerms = QueryHelper.combineSearchTerms(nonArrayTerm);
            assert.strictEqual(combinedTerms, nonArrayTerm);
        });

        it('returns the single item in an array unchanged', function () {
            const singleArrayTerm = ['xyz'];
            const combinedTerms = QueryHelper.combineSearchTerms(singleArrayTerm);
            assert.strictEqual(combinedTerms, singleArrayTerm[0]);
        });

        it('removes empty terms', function () {
            const term = 'xyz';
            const combinedTerms = QueryHelper.combineSearchTerms(['', term, null]);
            assert.strictEqual(combinedTerms, term);
        });

        it('combines two terms', function () {
            const terms = ['xyz', 'abc'];
            const combinedTerms = QueryHelper.combineSearchTerms(terms);
            assert.strictEqual(combinedTerms, `(${terms[0]}) AND (${terms[1]})`);
        });

        it('combines multiple terms', function () {
            const terms = ['xyz', 'abc', 'def'];
            const combinedTerms = QueryHelper.combineSearchTerms(terms);
            assert.strictEqual(combinedTerms, `(${terms[0]}) AND (${terms[1]}) AND (${terms[2]})`);
        });

    });

    describe('.mergeQueryOptions', function () {

        it('returns an empty object for undefined array', function () {
            const merged = QueryHelper.mergeQueryOptions(null);
            const mergedString = JSON.stringify(merged);
            assert.strictEqual(mergedString, JSON.stringify({}));
        });

        it('returns an empty object for empty array', function () {
            const merged = QueryHelper.mergeQueryOptions([]);
            const mergedString = JSON.stringify(merged);
            assert.strictEqual(mergedString, JSON.stringify({}));
        });

        it('returns a single object unchanged', function () {
            const baseOptions = {
                retmax: 15,
                api_key: "hello"
            };
            const merged = QueryHelper.mergeQueryOptions([baseOptions]);
            assert.deepStrictEqual(merged, baseOptions);
        });

        it('combines all provided fields into the final object', function () {
            const baseOptions = {
                api_key: "hello"
            };

            const callOptions = {
                retmax: 99
            };

            const expectedCombined = {
                api_key: "hello",
                retmax: 99
            };

            const merged = QueryHelper.mergeQueryOptions([baseOptions, callOptions]);
            assert.deepStrictEqual(merged, expectedCombined);
        });

        it('combines all provided fields into the final object for multiple objects', function () {
            const baseOptions = {
                api_key: "hello"
            };

            const callOptions = {
                retstart: 0
            };

            const serviceOptions = {
                retmax: 99
            };

            const expectedCombined = {
                api_key: "hello",
                retmax: 99,
                retstart: 0
            };

            const merged = QueryHelper.mergeQueryOptions([baseOptions, callOptions, serviceOptions]);
            assert.deepStrictEqual(merged, expectedCombined);
        });

        it('overrides fields defined in later objects', function () {
            const baseOptions = {
                api_key: "hello"
            };

            const callOptions = {
                retstart: 0,
                retmax: 99
            };

            const overrideOptions = {
                retstart: 20
            };

            const expectedCombined = {
                api_key: "hello",
                retmax: 99,
                retstart: 20
            };

            const merged = QueryHelper.mergeQueryOptions([baseOptions, callOptions, overrideOptions]);
            assert.deepStrictEqual(merged, expectedCombined);
        });
    });
});

