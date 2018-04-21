// search.js
const httpRequest = require('request');
const xmlSimple   = require('xml-simple');
const config =  require('config');
const DocumentHelper = require('./DocumentHelper');
const QueryHelper = require('./QueryHelper');

const demoSvc = function() {
    const awsConfig = config.get('AwsConfig')
    const DemographicsService  = require('./services/DemographicsService');
    return new DemographicsService(awsConfig);
}();

const pmSvc = function() {
    const pmConfig = config.get('PubMedService');
    const pmService = require('./services/PubMedService');
    return pmService.create(pmConfig);
}();

// base url for all E-Utilities requests
const eUtilsBaseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';

let errorOf = (description) => {
  return {error: description};
};

let pubMedApi = {

    search : function(searchParams, callback) {

        let searchTerm = searchParams.searchTerm;
        let pubDateFilter = searchParams.pubDateFilter;

        if (QueryHelper.isEmptyTerm(searchTerm)) {
            // signal the caller that the (empty) results are ready
            callback({searchTerm: '', itemsFound: 0, itemsReturned: 0, items: []});
        } else {

            const query = QueryHelper.combineSearchTerms([
                searchTerm,
                config.get('PubMedService').searchFilter,
                QueryHelper.getDateFilter(pubDateFilter)
            ]);

            console.log(`calling esearch for ${query}...`);
            pmSvc.search(query, {
                db: 'pubmed',
            }).then(results => {
                console.log(`calling elink...`);
                return pmSvc.link({
                    db: 'pmc',
                    dbfrom: 'pubmed',
                    linkname: 'pubmed_pmc',
                    cmd: 'neighbor_history',
                    query_key: results.querykey,
                    WebEnv: results.webenv
                });
            }).then(linkResults => {
                console.log(`calling pmc esearch for open access articles...`);
                return pmSvc.search('open access[filter]', {
                    query_key: linkResults.querykey,
                    WebEnv: linkResults.webenv
                });
            }).then(pmcSearchResults => {
                //Override the search term
                pmcSearchResults.searchTerm = searchTerm;
                callback(pmcSearchResults);
            }).catch(err => {
                console.log(`error performing search ${err}`);
                callback(errorOf('unexpected error performing search'));
            });
        }
    },

    getSummaries: function(webenv, querykey, start, max, callback) {

        const environment = {
            webenv: webenv,
            querykey: querykey
        };

        const options = {
            max: max,
            start: start
        };

        pmSvc.fetchSummary(environment, options)
            .then(summaryResults => {
                demoSvc
                    .getDemographicDetailsForIds(summaryResults.result.uids)
                    .then(demoDetails => {
                        const linkedIds = DocumentHelper
                            .getLinkedIdsByType(summaryResults, 'pmid', x => x);
                        return summaryResults
                            .result
                            .uids
                            .map(resultItem => {
                                let item = summaryResults.result[resultItem];
                                if (demoDetails[resultItem]) {
                                    // TODO: copy the whole object instead of each attribute
                                    // e.g. item.dd = demoDetails[resultItem];
                                    for (let att in demoDetails[resultItem]) {
                                        item[att] = demoDetails[resultItem][att];
                                    }
                                }
                                //overwrite the uid with the pmid
                                item.uid = linkedIds[item.uid];
                                return item;
                            });
                    })
                    .then(mergedData => {
                        // console.log(`mergedData ${JSON.stringify(mergedData[0])}`)
                        callback({items: mergedData})
                    })
            });
    },

    fetchResultDetail: function (pmId, callback) {
        let uri = `${eUtilsBaseUrl}efetch.fcgi?db=pubmed&id=${pmId}&retmode=xml`;
        console.log(`fetching details for pmid ${pmId} at ${uri}`);
        httpRequest(uri, null, (err, response, body) => {

            let result = {};

            if (err) {
                console.log(`error fetching details for ${pmId}`, err);
                result.error = "failed to get publication details";
                return;
            }

            // extract the abstracts from result details
            xmlSimple.parse(body, (err, parsed) => {
                if (err) {
                    console.log(`failed to parse ${err}`);
                    result = errorOf("unable to parse publication details");
                    return;
                }

                try {

                    let abstract = parsed
                         .PubmedArticle
                         .MedlineCitation
                         .Article
                         .Abstract
                         .AbstractText;

                    // The abstract can be an array of sections...
                    if (Array.isArray(abstract)) {
                         abstract.forEach((abstractTxt) => {
                             result[abstractTxt['@'].Label.toLowerCase()] = abstractTxt['#'];
                         });
                    // or an object...
                    } else if (abstract && typeof abstract === 'object'){
                        result["abstract"] = abstract['#'];
                    // or plain text
                    } else {
                        result["abstract"] = abstract;
                    }
                }
                catch(e) {
                    console.log(`error extracting the abstract's text from the document ${e}`);
                    result.error = "unexpected document format";
                }
            });

            callback(result);
        });
    }
};

module.exports = pubMedApi;
