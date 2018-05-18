`use strict`;

const BartConnector = require('./scripts/bartconnector.js');

const bc = new BartConnector();

/* Tell me your departure station. */
/*
bc.getBartEtdByStation('Powell Street').then( ret => {
    console.log(ret);
});
*/

/* Tell me the name of destination station or which direction is your destination at? */
//console.log(bc.getDirectionByDeptDest('Daly City', 'Daly City'));

bc.getBartEtdByStationDirection('San Bruno', 'south').then( ret => {
    console.log(ret.info);
    let speech = [];
    speech.push(`This is the information of ${ret['departure']} station.`);
    for(let dest in ret.info ) {
        let item = 0;
        if(ret.info[dest][item]['minutes'] == 'Leaving') {
            speech.push(`${dest} train is about leaving from platform ${ret.info[dest][item]['platform']}.`);
            if(typeof ret.info[dest][item+1]!= 'undefined') speech.push(`And next one is coming in ${ret.info[dest][item+1]['minutes']} minutes coming to platform ${ret.info[dest][item+1]['platform']}.`);
        } else {
            speech.push(`${dest} train is coming to platform ${ret.info[dest][item]['platform']} in ${ret.info[dest][item]['minutes']} minutes.`);
            if(typeof ret.info[dest][item+1]!= 'undefined') speech.push(`And next one is coming to platform ${ret.info[dest][item+1]['platform']} in ${ret.info[dest][item+1]['minutes']} minutes.`);
        }
        speech.push("<break time='0.5s'/>");
    }
    console.log(speech.join("\n"));
}).catch( error =>{
    console.log(error);
});


exports.handler = (event, context, callback) => {
};


