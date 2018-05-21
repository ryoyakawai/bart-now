`use strict`;

module.exports = class BartConnector {

    constructor() {
        this._JSON = 'n'; // 'y' or 'n'
        this._BART_ST_INFO = require('./bartstations.js');
        this._BART_STATIONS = this._BART_ST_INFO.stations;
        this._BART_STATIONS_R = Object.keys(this._BART_STATIONS).reduce( (obj,key) => {
            obj[ this.convFormat(this._BART_STATIONS[key]) ] = key.replace(/^_*/g, '');
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
        let abbr = this._BART_STATIONS_R[this.convFormat(station)];
        let query = `cmd=etd&orig=${abbr}&key=${this._BART_API_KEY}&json=${this._JSON}`;
        let url = this._BART_API_URL['ETD'] + '?' + query;
        console.log(url);
        return new Promise( ( resolve, reject ) => {
            this._request(url, (error, response, body) => {
                if(error === null) {
                    this.convert2json(body).then( ret => {
                        console.log(ret);
                        resolve( ret.root );
                    });
                } else {
                    reject(new Error(error));
                }
            });
        });
    }

    getBartEtdByStationDirection(station, direction) {
        return new Promise( (resolve, reject) => {
            this.getBartEtdByStation(station).then( ret => {
                let out = {
                    departure: station,
                    direction: direction,
                    info: {}
                };
                for(let i in ret.station[0].etd) {
                    for(let j in ret.station[0].etd[i].estimate) {
                        if(this.convFormat(ret.station[0].etd[i].estimate[j]['direction'])
                           == this.convFormat(direction)) {
                            if(typeof out.info[ret.station[0].etd[i].destination] == 'undefined') out.info[ret.station[0].etd[i].destination]=[];
                            for(let item in ret.station[0].etd[i].estimate[j]) {
                                ret.station[0].etd[i].estimate[j][item] = ret.station[0].etd[i].estimate[j][item][0]; 
                            }
                            ret.station[0].etd[i].estimate[j]['departure'] = station;
                            out.info[ret.station[0].etd[i].destination].push(ret.station[0].etd[i].estimate[j]);
                            if(out.info[ret.station[0].etd[i].destination].length > 1) break;
                        }
                    }
                }
                console.log('[getBartEtdByStationDirection(): result] ', out);
                resolve(out);
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

    convFormat(str) {
        return new String(str).toLowerCase().replace(/ /g, '_');
    }
    
    getDirectionByDeptDest(dept, dest) {
        let result = {};
        let dept_short = this._BART_STATIONS_R[this.convFormat(dept)],
            dest_short = this._BART_STATIONS_R[this.convFormat(dest)];
        for(let color in this._BART_LINES) {
            result[color] = {
                dept_n: dept, dest_n: dest, 
                dept: findIndex(this._BART_LINES[color], dept_short),
                dest: findIndex(this._BART_LINES[color], dest_short)
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
        let direction;
        for(let color in result) {
            direction = result[color].direction;
        }
        return direction;

        
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

    hasOnlyDirection(dept) {
        let dept_short = this._BART_STATIONS_R[this.convFormat(dept)];
        let result = {
            status: false,
            onlyDirection: null
        };

        switch(dept_short) {
        case 'mlbr':
        case 'warm':
        case 'dubl':
            result.status = true;
            result.onlyDirection = 'north';
            break;
        case 'rich':
        case 'antc':
            result.status = true;
            result.onlyDirection = 'south';
            break;
        }

        return result;
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



