const IS_DEVELOPMENT = process.env.DEVELOPMENT === 'true';
const importModules = {
  chunk: 'lodash/fp/chunk',
  concat: 'lodash/fp/concat',
  flow: 'lodash/fp/flow',
  flatMap: 'lodash/fp/flatMap',
  filter: 'lodash/fp/filter',
  join: 'lodash/fp/join',
  last: 'lodash/fp/last',
  map: 'lodash/fp/map',
  reduce: 'lodash/fp/reduce',
  sortBy: 'lodash/fp/sortBy',
  take: 'lodash/fp/take',
  uniq: 'lodash/fp/uniq',
  uniqWith: 'lodash/fp/uniqWith',
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