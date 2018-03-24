// search.js

let httpRequest = require('request');
let xmlSimple   = require('xml-simple');

// base url for all E-Utilities requests
const eUtilsBaseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';

let errorOf = (description) => {
  return {error: description};
};

let pubMedApi = {

    search : function(searchTerm, callback) {

        // setup the api key parameter if an api key is available.
        let apiKey = '';
        if (process.env.EUTILS_API_KEY) {
            apiKey = `&api_key=${process.env.EUTILS_API_KEY}`
        }

        // results object initialized with 'no results found' data
        var results = {searchTerm: '', itemsFound: 0, itemsReturned: 0, items: []};

        if (typeof searchTerm === "undefined" || searchTerm.trim().length === 0) {
            // signal the caller that the (empty) results are ready
            callback(results);

        } else {
            // E-Search request
            var db = "pubmed";
            var filter = "Therapy/Broad[filter]";
            var searchTermWithFilter = `(${filter}) AND (${searchTerm})`;
            var searchUrl = `${eUtilsBaseUrl}esearch.fcgi?db=${db}&term=${searchTermWithFilter}&retmode=json&usehistory=y${apiKey}`;
            httpRequest(searchUrl, {json: true}, (err, response, body) => {
                if (err) {
                    return console.log(err);
                }

                // populate the results object with the pieces we already know
                results.searchTerm = searchTerm;
                results.itemsFound = body.esearchresult.count;
                results.itemsReturned = body.esearchresult.retmax;

                // Build the e-link url using webenv and querykey.
                // eLink url composition
                //   dbfrom - database for the source ids
                //   db - database for the target ids
                //   linkname - link to retrieve (pubmed_pmc, pubmed_pmc_embargo, pubmed_pmc_local, pubmed_pmc_refs)
                //   query_key - key to input ids from eHistory server
                //   WebEnv - web environment for query_key
                //   cmd=neighbor_history - store results on eHistory server
                //   retmode=json - return as json
                var dbfrom = "pubmed";
                var db = "pmc";
                var linkname = "pubmed_pmc";
                var querykey = body.esearchresult.querykey;
                var webenv = body.esearchresult.webenv;
                var linkUrl = `${eUtilsBaseUrl}elink.fcgi?db=${db}&dbfrom=${dbfrom}&linkname=${linkname}&query_key=${querykey}&WebEnv=${webenv}&cmd=neighbor_history&retmode=json${apiKey}`;

                // E-Link request
                httpRequest(linkUrl, {json: true}, (err, response, body) => {
                    if (err) {
                        return console.log(err);
                    }

                    // Build the e-summary url using the webenv and querykey.
                    var db = "pubmed";
                    var querykey = body.linksets[0].linksetdbhistories[0].querykey;
                    var webenv = body.linksets[0].webenv;
                    var summaryUrl = `${eUtilsBaseUrl}esummary.fcgi?db=${db}&query_key=${querykey}&WebEnv=${webenv}&retmode=json&retmax=100${apiKey}`;

                    // E-Summary request
                    httpRequest(summaryUrl, {json: true}, (err, response, body) => {
                        if (err) {
                            return console.log(err);
                        }

                        // Add each returned item to the result object's item array
                        body.result.uids.forEach( (element) => {
                            results.items.push(body.result[element]);
                        });

                        // signal the caller that the results are ready
                        callback(results);
                    });
                });
            });
        }
    },

    fetchResultDetail: function (pmcId, callback) {
        let uri = `${eUtilsBaseUrl}efetch.fcgi?db=pmc&id=${pmcId}&retmode=xml`;
        console.log(`fetching details for ${pmcId} at ${uri}`);
        httpRequest(uri, null, (err, response, body) => {

            let result = {};

            if (err) {
                console.log(`error fetching details for ${pmcId}`, err);
                result.error = "failed to get publication details";
                return;
            }

            console.log('body:', body); // TODO: remove verbose logging later

            // extract the abstracts from result details
            xmlSimple.parse(body, (err, parsed) => {
                if (err) {
                    console.log(`failed to parse ${err}`);
                    result = errorOf("unable to parse publication details");
                    return;
                }

                try {
                    let abstract = parsed
                        .article
                        .front
                        ['article-meta']
                        .abstract;

                    if (!abstract) {
                        result = errorOf("article does not contain an abstract");
                        return;
                    }

                    // check for sections
                    if (Array.isArray(abstract.sec)) {
                        abstract
                            .sec
                            .forEach(s => {
                                console.log(`${s.title.toLowerCase()} ${s.p['#']}`);
                                result[s.title.toLowerCase()] = s.p["#"];
                            });

                    // check for a paragraph (ex. PMC 5858162)
                    } else if (abstract.p) {
                        console.log(`extracting paragraph ${abstract.p}`);
                        result.abstract = abstract.p['#'];
                    } else {
                        result = errorOf(`unexpected abstract format '${abstract}'`);
                    }


                    // parsed
                    //     .PubmedArticle
                    //     .MedlineCitation
                    //     .Article
                    //     .Abstract
                    //     .AbstractText
                    //     .forEach((abstractTxt) => {
                    //         console.log(abstractTxt['@'].Label); // the abstract type
                    //         console.log(abstractTxt['#']); // the abstract's text
                    //         result[abstractTxt['@'].Label.toLowerCase()] = abstractTxt['#'];
                    //     });
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
