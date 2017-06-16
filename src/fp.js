const IS_DEVELOPMENT = process.argv[2] != undefined &&
  process.argv[2].trim().toLowerCase() === 'development';
const importModules = {
  flow: 'lodash/fp/flow',
  chunk: 'lodash/fp/chunk',
  map: 'lodash/fp/map',
  flatMap: 'lodash/fp/flatMap',
  filter: 'lodash/fp/filter',
  concat: 'lodash/fp/concat',
  take: 'lodash/fp/take',
  reduce: 'lodash/fp/reduce',
  join: 'lodash/fp/join',
  last: 'lodash/fp/last',
  zip: 'lodash/fp/zip',
};

if (IS_DEVELOPMENT) {
  Object.keys(importModules).forEach(function (mod) {
    delete require.cache[importModules[mod]];
  });
}

const exportModules = {};
Object.keys(importModules).forEach(function (mod) {
  exportModules[mod] = require(importModules[mod]);
});

module.exports = exportModules;