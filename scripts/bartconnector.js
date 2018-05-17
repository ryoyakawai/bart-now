`use strict`;

module.exports = class BartConnector {

    constructor() {
        this._JSON = 'n'; // 'y' or 'n'
        this._BART_ST_INFO = require('./bartstations.js');
        this._BART_STATIONS = this._BART_ST_INFO.stations;
        this._BART_STATIONS_R = Object.keys(this._BART_STATIONS).reduce( (obj,key) => {
            obj[ this._BART_STATIONS[key] ] = key;
            return obj;
        }, {});
        this._BART_LINES = this._BART_ST_INFO.lines;
        this._BART_API_KEY = 'MW9S-E7SL-26DU-VV8V';
        this._BART_API_URL = {
            'ETD': 'https://api.bart.gov/api/etd.aspx' // ?cmd=etd&orig=12th&key=MW9S-E7SL-26DU-VV8V&json=y 
        };
        this._BART_SAMPLE_QUERY = 'https://api.bart.gov/api/etd.aspx?cmd=etd&orig=12th&key=MW9S-E7SL-26DU-VV8V&json=y';
        this._request = require('request');
        this._parseString = require('xml2js').parseString;
    }

    getBartContents(url) {
        return new Promise( ( resolve, reject ) => {
            this._request(url, (error, response, body) => {
                if(error === null) {
                    resolve(body);
                } else {
                    reject(new Error(error));
                }
            });
        });
    }

    getBartEtdByStation( station ) {
        let abbr = this._BART_STATIONS_R[station];
        let query = `cmd=etd&orig=${abbr}&key=${this._BART_API_KEY}&json=${this._JSON}`;
        let url = this._BART_API_URL['ETD'] + '?' + query;
        console.log(url);
        return new Promise( ( resolve, reject ) => {
            this._request(url, (error, response, body) => {
                if(error === null) {
                    this.convert2json(body).then( ret => {
                        this.printResult(ret.root, station);
                        resolve( ret.root );
                    });
                } else {
                    reject(new Error(error));
                }
            });
        });
    }

    convert2json(xml) {
        return new Promise( (resolve, reject) => {
            this._parseString(xml, (err, result) => {
                resolve(result);
            });
        });
    }

    getDirectionByDeptDest(dept, dest) {
        let result = {};
        let dept_R = this._BART_STATIONS_R[dept],
            dest_R = this._BART_STATIONS_R[dest];
        for(let color in this._BART_LINES) {
            result[color] = {
                dept_n: dept, dest_n: dest, 
                dept: findIndex(this._BART_LINES[color], dept_R),
                dest: findIndex(this._BART_LINES[color], dest_R)
            };
            if( result[color].dept >= 0 && result[color].dest >= 0 ) {
                if(result[color].dept > result[color].dest) {
                    result[color]['direction'] = 'south';
                } else
                if(result[color].dept < result[color].dest) {
                    result[color]['direction'] = 'north';
                } else {
                    result[color]['direction'] = 'still';
                }
            } else {
                delete result[color];
            }
        }
        return result;

        function findIndex(array, target) {
            let i = 0, result = -1;
            while(i < array.length) {
                if(array[i] == target) {
                    result = i;
                    break;
                }
                i++;
            }
            return result;
        }

    }

    printResult(ret, st0) {
        console.log(st0, ret);
        let result = ret;
        let time = (new String(result.time)).split(' ');
        let out = {};
        console.log(time);
        console.log('----------------------------');
        for(let i in result.station[0].etd) {
            for(let j in result.station[0].etd[i].estimate) {
                let st1 = result.station[0].etd[i].destination;
                console.log('[[[ ' + st0 + ' ----> ' + st1 + ' ]]]');
                out[st1] = [];
                result.station[0].etd[i].estimate[j].time = time[0].split(':');
                delete result.station[0].etd[i].estimate[j]['color'];
                delete result.station[0].etd[i].estimate[j]['hexcolor'];
                console.log(result.station[0].etd[i].estimate[j]);
            }
        }

    }
    

};



