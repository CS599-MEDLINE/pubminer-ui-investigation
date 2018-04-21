var express = require("express");
var router = express.Router();
var pubMedQuery = require('../search');

const rowRequestSize = 20;

router.get('/', (request, response) => {

    // search PubMed for results matching the search terms
    pubMedQuery.search(request.query, (queryResult) => {

        if (queryResult.itemsFound === 0) {
            // Render the 'results' view
            response.render('results', {"results": {items: []},
                                        "qryResult": queryResult});
        } else {
            // Get summaries for the first set of result rows
            console.log(`results.js calling getSummaries ${JSON.stringify(queryResult)}`);
            pubMedQuery.getSummaries(queryResult.webenv, queryResult.querykey, 0, rowRequestSize, (results) => {

                // Render the 'results' view using query results
                response.render('results', {"results": results,
                                            "qryResult": queryResult});
            });
        }
    });
});

router.get('/:webenv/:querykey', function(req, res, next) {

    // Get summaries for result rows
    pubMedQuery.getSummaries(req.params.webenv, req.params.querykey, req.query.start, rowRequestSize, (results) => {

        // Render the 'list' view using query results, if any
        res.render('resultRows', { "results": results });
    });

});

module.exports = router;
