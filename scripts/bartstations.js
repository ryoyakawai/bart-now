const bartStations = {
    '12th':	'12th St. Oakland City Center',
    '16th':	'16th St. Mission (SF)',
    '19th':	'19th St. Oakland',
    '24th':	'24th St. Mission (SF)',
    'ashb':	'Ashby (Berkeley)',
    'antc':	'Antioch',
    'balb':	'Balboa Park (SF)',
    'bayf':	'Bay Fair (San Leandro)',
    'cast':	'Castro Valley',
    'civc':	'Civic Center (SF)',
    'cols':	'Coliseum',
    'colm':	'Colma',
    'conc':	'Concord',
    'daly':	'Daly City',
    'dbrk':	'Downtown Berkeley',
    'dubl':	'Dublin/Pleasanton',
    'deln':	'El Cerrito del Norte',
    'plza':	'El Cerrito Plaza',
    'embr':	'Embarcadero (SF)',
    'frmt':	'Fremont',
    'ftvl':	'Fruitvale (Oakland)',
    'glen':	'Glen Park (SF)',
    'hayw':	'Hayward',
    'lafy':	'Lafayette',
    'lake':	'Lake Merritt (Oakland)',
    'mcar':	'MacArthur (Oakland)',
    'mlbr':	'Millbrae',
    'mont':	'Montgomery St. (SF)',
    'nbrk':	'North Berkeley',
    'ncon':	'North Concord/Martinez',
    'oakl':	'Oakland International Airport',
    'orin':	'Orinda',
    'pitt':	'Pittsburg/Bay Point',
    'pctr':	'Pittsburg Center',
    'phil':	'Pleasant Hill',
    'powl':	'Powell St. (SF)',
    'rich':	'Richmond',
    'rock':	'Rockridge (Oakland)',
    'sbrn':	'San Bruno',
    'sfia':	'San Francisco International Airport',
    'sanl':	'San Leandro',
    'shay':	'South Hayward',
    'ssan':	'South San Francisco',
    'ucty':	'Union City',
    'warm':	'Warm Springs/South Fremont',
    'wcrk':	'Walnut Creek',
    'wdub':	'West Dublin',
    'woak':	'West Oakland'
};
const bartLines = {
    /** Sounth to North 0, 1, 2, ..., x **/
    'red': [
        'mlbr', 'sbrn', 'ssan', 'colm', 'daly', 'balb', 'glen', '24th', '16th',
        'civc', 'powl', 'mont', 'embr', 'woak', '12th', '19th', 'mcar', 'ashb',
        'dbrk', 'nbrk', 'plza', 'deln', 'rich'
    ],
    'yellow': [
        'mlbr', 'sfia', 'sbrn', 'ssan', 'colm', 'daly', 'balb', 'glen', '24th',
        '16th', 'civc', 'powl', 'mont', 'embr', 'woak', '12th', '19th', 'mcar',
        'rock', 'orin', 'lafy', 'wcrk', 'phil', 'conc', 'ncon', 'pitt', 'pctr'
    ],
    'blue': [
        'daly', 'balb', 'glen', '24th', '16th', 'civc', 'powl', 'mont', 'embr',
        'woak', 'lake', 'ftvl', 'cols', 'sanl', 'bayf', 'cast', 'wdub', 'dubl'
    ],
    'green': [
        'daly', 'balb', 'glen', '24th', '16th', 'civc', 'powl', 'mont', 'embr',
        'woak', 'lake', 'ftvl', 'cols', 'sanl', 'bayf', 'hayw', 'shay', 'ucty',
        'frmt', 'warm'
    ],
    'orange': [
        'warm', 'frmt', 'ucty', 'shay', 'hayw', 'bayf', 'sanl', 'cols', 'ftvl',
        'lake', '12th', '19th', 'mcar', 'ashb', 'dbrk', 'nbrk', 'plza', 'deln',
        'rich'
    ]
};

module.exports = { stations: bartStations, lines: bartLines };
