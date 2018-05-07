"use strict";

const xmlSimple  = require('xml-simple');
const Errors     = require('./Errors');

class DocumentHelper {

    static stripLettersFromId(pmcid) {
        return pmcid.replace(/\D/g,'');
    }

    /**
     * Returns a map of the summary's `uid`s to IDs of type `idType`. `uid`s that
     * to not have a linked ID of type `idType` are removed from the result set.
     *
     * This method may raise an exception if the document is not in the expected
     * format.
     *
     * @param summaryDocument a JSON document as returned by `esummary` API
     * @param idType used as predicate filter on the articleids
     * @param xform a tranform function to apply to the linked ID
     * @return An object mapping the `uid` to the linked ID
     */
    static getLinkedIdsByType(summaryDocument, idType, xform) {
        xform = xform || ((x) => x);
        try {
            return summaryDocument
                .result
                .uids
                .reduce((acc, uid) => {
                    const articleIds = (summaryDocument.result[uid].articleids || []);
                    const linkedId = articleIds.find(idObj => idObj.idtype === idType);
                    if (linkedId) {
                        acc[uid] = xform(linkedId.value);
                    }
                    return acc;
                }, {});
        } catch(err) {
            throw new Errors.InvalidDocumentFormatError(err);
        }
    }

    /**
     * Merges the demographic data and esummary data from the PCM data into a PubMiner
     * summary result
     * @param demoDetails a map of demographic details including sentences and tables
     * @param summaryResults results as returned by NCBI's esummary API
     */
    static mergeDemographicAndSummaryResults(demoDetails, summaryResults) {
        // TODO: Address #54 here
        const linkedIds = DocumentHelper
            .getLinkedIdsByType(summaryResults, 'pmid', this.stripLettersFromId);
        return summaryResults
            .result
            .uids
            .map(resultItem => {
                const summaryItem = summaryResults.result[resultItem];
                return Object.assign({
                    uid: linkedIds[summaryItem.uid], //change uid from PMC to PMID
                    title: summaryItem.title,
                    authors: summaryItem.authors,
                    pubdate: summaryItem.pubdate,
                    pmid: linkedIds[summaryItem.uid],
                    pmcid: summaryItem.uid
                }, demoDetails[resultItem] || {});
            });
    }

    /**
     * Given a PubMed search result, extracts a simplified result
     * in canonical form for consumption by
     * @param searchDocument
     */
    static extractSearchResults(searchDocument, query) {
        try {
            return {
                webenv: searchDocument.esearchresult.webenv,
                querykey: searchDocument.esearchresult.querykey,
                searchTerm: query,
                itemsFound: parseInt(searchDocument.esearchresult.count),
                itemsReturned: parseInt(searchDocument.esearchresult.retmax)
            };
        } catch (err) {
            throw new Errors.InvalidDocumentFormatError(err);
        }
    }

    static extractEnvironmentFromLinkResults(linkDocument, previousQueryKey) {
        try {
            const lnkSet = linkDocument.linksets[0];
            if (lnkSet.linksetdbhistories) {
                return {
                    webenv: lnkSet.webenv,
                    querykey: lnkSet.linksetdbhistories[0].querykey
                };
            } else {
                // In this case, the result set of the eLink matches that of the
                // esearch and a new query-key is not generated
                return {
                    webenv: lnkSet.webenv,
                    querykey: previousQueryKey
                };
            }

        } catch (err) {
            throw new Errors.InvalidDocumentFormatError(err);
        }
    }

    static extractAbstract(detailDocument) {
        return DocumentHelper.convertXmlToJson(detailDocument)
            .then( json => {

                const abstract = json
                    .PubmedArticle
                    .MedlineCitation
                    .Article
                    .Abstract
                    .AbstractText;

                // The abstract can be an array of sections...
                if (Array.isArray(abstract)) {
                    let result = {};
                    abstract.forEach((abstractTxt) => {
                        result[abstractTxt['@'].Label.toLowerCase()] = abstractTxt['#'];
                    });
                    return result;

                // or an object...
                } else if (abstract && typeof abstract === 'object') {
                    return {
                        abstract: abstract['#']
                    };

                // or plain text
                } else {
                    return {
                        abstract: abstract
                    };
                }
            })
            .catch(err => {
                // TODO: log the pmid/pmcid of the document
                console.error(`error extracting abstract for detail document ${err}`, err);
                return { abstract: 'error extracting abstract for article ID'};
            });
    }

    static convertXmlToJson(xmlDetailDocument) {
        return new Promise((resolve, reject) => {
            xmlSimple.parse(xmlDetailDocument, (err, parsed) => {
                if (err) {
                    reject(new Errors.InvalidDocumentFormatError(err));
                } else {
                    resolve(parsed);
                }
            });
        });
    }

    static groupSentencesBySection(sentences) {
        const groupedSentences = (sentences || [])
            .reduce((acc, s) => {
                acc[s.section] = (acc[s.section] || []);
                acc[s.section].push(s.text);
                return acc;
            }, {});

        return Object
            .keys(groupedSentences)
            .reduce((acc, sec) => {
                acc.push({section: sec, sentences: groupedSentences[sec]});
                return acc;
            }, []);
    }
}

module.exports = DocumentHelper;
