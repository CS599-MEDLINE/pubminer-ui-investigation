

describe('Pubminer search results', function() {

        beforeEach(function(){
           cy.visit('/list');
        });

        let good_term = 'breast cancer'
        let bad_term = 'lkajsdlkajsdlkajsdlkjasdlkajsdlkajsdlasjdlkasjda'

        it('returns a 200', function () {
            cy.search(good_term);         
        });

        it('url includes search terms', function() {
            cy.search(good_term);
            cy.url().should('include', `/results?searchTerm=${good_term.replace(/\s+/g, '+')}`);
        });

        it('display message when no results are available', function () {
            cy.search(bad_term);
            cy.contains(`No results found for "${bad_term}`);
        });

        it('display result counts', function () {
            cy.search(good_term);
            cy.get('#resultsCount');
        });

        it('have a show more button when there are >20 results', function () {
            cy.search(good_term);
            cy.get('#moreButton').click();
        });

        it('do not have show more button for no results', function () {
            cy.search(bad_term);
            cy.get('#moreButton').should('not.exist');
        });

        it('include a link for every row', function () {
            cy.search(good_term);
            cy.get(".article-title").click({ multiple: true, force: true})
            cy.get('.pmids')
            .each(function (el) {
                expect(el.context).to.have.property('href')
            })
        })

        it('include authors for every row', function () {
            cy.search(good_term);
            cy.get(".article-title").click({ multiple: true, force: true})
            cy.get('.pm-list-row-authors')
            .each(function (el) {
                console.log(el.context)
            })
        })

        it('include a close button for every row', function () {
            cy.search(good_term);
            cy.get(".article-title").click({ multiple: true, force: true })
            cy.get('.close')
            .each(function (el) {
                console.log(el.context)
            })
        })

        it('include checkbox for every item', function () {
            cy.search(good_term);
            cy.get(".article-title").click({ multiple: true, force: true })
            cy.get('.uid')
            .each(function (el) {
                console.log(el.context)
            })
        })

        it('include checkbox for every item', function () {
            cy.search(good_term);
            cy.get(".article-title").click({ multiple: true, force: true })
            cy.get('.uid')
            .each(function (el) {
                expect(el.context.type).equals('checkbox')
            })
        })

        it('have additional information attached', function () {
            cy.search(good_term);
            cy.get(".article-title").click({ multiple: true, force: true })
            cy.get('.list-group-item-header').find('.list-view-pf-additional-info-item')
        })

        it('has a menu button and export button', function(){
            cy.search(good_term);
            cy.get("#menuButton").click();
            cy.get(".applauncher-pf-link").click();
        })

        it('results have some information item element [abstract,sentence,table]', function () {
            cy.search(good_term);
            cy.get(".article-title").click({ multiple: true, force: true })
            cy.get(".list-view-pf-expand-active").find('.list-view-pf-additional-info')
            .each(function (el, a, b) {
                console.log(el.context);
            })
        })

        // TODO: figure this one out
        // it('results have some information item element [abstract,sentence,table]', function () {
        //     cy.search(good_term);
        //     cy.get(".article-title").click({ multiple: true, force: true })
        //     cy.get(".list-view-pf-expand-active").find('.list-view-pf-additional-info')
        //     .each(function (el, a, b) {
        //         // el.context['list-view-pf-additional-info-item']
        //     })
        // })


});
