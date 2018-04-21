describe('The home page', function() {
    // 'PubMiner' title is on /list
    it('contains the PubMiner title', function () {
        cy.visit('/list')
        cy.title().should('include', 'PubMiner')
    })

    it('contains have an empty input box', function() {
        cy.get('input').should('not.have.value', 'US')
    })

    // TODO: figure out how the date and count will be implemented and check for those things
    it('displays a last updated date and article count', function(){
        cy.get('#whatsnew').should('contain', 'Last update')
        cy.get('#update-count').should('contain','new articles added') //any number
    })

    it('whats new table has a header', function(){
        cy.get('#table1_wrapper').should('contain', 'PMC ID')
    })

    // TODO: should we have an export button here?
})


