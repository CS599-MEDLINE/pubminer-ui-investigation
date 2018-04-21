"use strict";

class QueryHelper {

    static isEmptyTerm(term) {
        return (
            typeof term === "undefined" ||
            typeof term !== "string" ||
            term.trim().length === 0);
    }

    static getDateFilter(num) {
        switch (num) {
            case "1":
            case "2":
            case "3":
                return `"last ${num} years"[PDat]`;
            default:
                return "";
        }
    };

    /**
     * Joins all terms using a conjunction. Empty and undefined terms
     * are removed.
     * @param terms the individual terms to be combined.
     * @return atomized and joined terms such as (term1) AND (term2)
     *         when passed [term1, term2]
     */
    static combineSearchTerms(terms) {
        if (!Array.isArray(terms)) {
            return terms;
        }

        const validTerms = terms.filter(x => !QueryHelper.isEmptyTerm(x));

        //
        if (validTerms.length < 2) {
            return validTerms.reduce((acc, x) => x, '');
        }

        return validTerms
            .slice(1)
            .reduce((acc, term) => `${acc} AND (${term})`, `(${validTerms[0]})`)
    }
}

module.exports = QueryHelper;
