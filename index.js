`use strict`;

const BartConnector = require('./scripts/bartconnector.js');

const bc = new BartConnector();

/* Tell me your departure station. */
bc.getBartEtdByStation('Powell St. (SF)').then( ret => {
    console.log(ret);
});

/* Tell me the name of destination station or which direction is your destination at? */
console.log(bc.getDirectionByDeptDest('West Oakland', 'Daly City'));

