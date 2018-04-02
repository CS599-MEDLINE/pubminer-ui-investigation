

describe('Pubminer Search Spec', function() {
    context('searching', function() {

        beforeEach(function(){
           cy.visit('/list');
        });

        it('shows results for query', function() {
            let term = "breast cancer";
            cy.search(term);

            cy.url()
                .should('include', `/results?searchTerm=${term.replace(/\s+/g, '+')}`);

            // TODO: add tests around results returned
        });

        it('handles queries with no results', function () {
            // TODO: implement
        });

    });
});
