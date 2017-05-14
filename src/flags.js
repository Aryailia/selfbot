const config = require('./config.json');

const flagSetters = {
  'g': function (options, parameter) {
    options.serverId = parameter;
  }, 'v': function (options) {
    options.verbose = true;
  }, 't': function (options) {
    options.test = 'i do things';
  }
};

const main = '([\\s\\S]+)';
const flags = Object.keys(flagSetters);
const flagStr = flags.join(''); 
const parse = {
  matchCommand: new RegExp(`^${config.prefix}(\\S+)(?: +${main})?$`),
  matchArgs:    new RegExp(`^((?:-[${flagStr}](?: +[^-\\s]+)? +)*)${main}?$`),
  flagList: flags,
  flagSetters: flagSetters,
};

flags.forEach(flag =>
  parse[flag] = new RegExp(`(?:-\\S(?: +\\S*)? +)*-${flag}(?: +(\\S*))?`)
);


module.exports = parse;