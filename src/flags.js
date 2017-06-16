const path = require('path');
const IS_DEVELOPMENT = process.argv[2] != undefined &&
  process.argv[2].trim().toLowerCase() === 'development';
if (IS_DEVELOPMENT) {
  delete require.cache[path.resolve('./src/config.json')];
}
const config = require(path.resolve('src/config.json'));

const flagSetters = {
  'h': function (options) {
    options.help = true;
  }, 'g': function (options, parameter) {
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