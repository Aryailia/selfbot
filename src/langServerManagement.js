// Modules
const {Helper, _} = require('./inc');
const config = require('../config');

const {PERMISSION_SELF} = config;

// Code Body
const ROLE_INCLUDE_PREFIXES = ['Learning', 'Heritage', 'Fluent', 'Native'];
const ROLE_IGNORE_SUFFIX = [
  'Cantonese', 'Mandarin',
  'English', 'Manglish', 'Singlish',
  'Other', 'Classical Chinese'
];


const library = Helper.makeLibrary(() => true, '.');
library.addCommand('ping2', ['Regular'],
  '',
  'For testing. Should respond with \'pong\'.',
  'To test if the bot is working. Should respond with \'pong\'.',
  PERMISSION_SELF,
  function (parameter, options) {
    options.origin.send('pong');
    console.log('\n\n');
    return true; // return success
  }
);


function _getColoringLanguageRoles(guild) {
  const roleNames = guild.roles.map(role => role.name);
  const languages = _.chain(roleNames)(
    // roles that start with the prefixes
    _.sieve(name => true === ROLE_INCLUDE_PREFIXES.some(prefix =>
      name.toLowerCase().startsWith(prefix.toLowerCase())))
    // roles that are not in ignore list
    ,_.sieve(name => false === ROLE_IGNORE_SUFFIX.some(suffix =>
      name.toLowerCase().endsWith(suffix.toLowerCase())))
    ,_.map(name => extractLanguage(name)) // Get language name half
    ,_.unique()
    ,_.unmonad(Array.prototype.sort)
  );
  return languages;
}


// Creates a no permission role
// Doesn't affect permissions of use external emoji and add reactions
// Todo: add error priting for failure and what not
library.addCommand('createrole', ['Language Server'],
  ' [<perimssionMask>]',
  'Adds a role with <permissionMask> permission level. <permissionMask> must be a number.',
  `  If nothing is specified for <permissionMask>, then it copies @ everyone
  Can also specify guild flag coming soon (TM)`,
  PERMISSION_SELF,
  function (parameter, options) {
    options.originChannel.guild.createRole({
      name: parameter,
      permissions: parameter === '' ? 0 : parseInt(parameter)
    });
  }
);

library.addCommand('listlangs', ['Language Server'],
  '_listroles [\'local\']',
  'Lists all the roles in prefixed by learning/etc and not in the ignore list.',
  '\'local\' specifies the current channel',
  PERMISSION_SELF,
  function (parameter, options) {
    const {serverId, self, origin} = options;
    const target = self.guilds.get(serverId);
    const languages = _getColoringLanguageRoles(parameter === 'local'
      ? target
      : self.guilds.get(process.env.LANGUAGE_SERVER_ID)
    );
    origin.send(`'${languages.join('\', \'')}'`);
    return true;
  }
);

function extractLanguage(name) {
  return name.match(/.+? (.+)/)[1];
}


library.addCommand('assigncolor', ['Language Server'],
  '',
  'Assigns all the non-main language roles a color tweening between two values',
  `  Hard-coded tween between to 0xCA3A2E to 0xFFBF8E 
  Prefixes are ${ROLE_INCLUDE_PREFIXES.join(', ')}
  Excludes are ${ROLE_IGNORE_SUFFIX.join(', ')}`,
  PERMISSION_SELF,
  function (parameter, options) {
    const {origin, serverId, self} = options;

    // Setting stuff
    const startColor = [202,58, 46];  // 0xCA3A2E
    const endinColor = [254,191,142]; // 0xFEBF8E

    const prefix = ROLE_INCLUDE_PREFIXES;
    const suffix = _getColoringLanguageRoles(self.guilds.get(serverId));

    const length = suffix.length;
    const colorIndices = [0, 1, 2];
    const step = _.chain(colorIndices)(
      _.map(i => (startColor[i] - endinColor[i]) /  (length - 1))
    );
    const colorMap = {};
    _.range(0, length, 1).forEach(i =>
      // Map over each color, so three elements and tween with sizes of {step}
      colorMap[suffix[i]] = _.chain(colorIndices)(_.map( 
        c => Math.max(0,Math.min(255,Math.round(endinColor[c] + step[c] * i)))
      ))
    );

    const languages = Object.keys(colorMap);    
    (origin.guild.roles
      .filter(role => ROLE_INCLUDE_PREFIXES
        .some(prefix => languages
          .some(lang => role.name === `${prefix} ${lang}`)
        )
      ).forEach(role => role.setColor(colorMap[extractLanguage(role.name)]))
    );
    return true;
  }
);

/*
function commands(addCommand) {
  // Todo: Maybe custom guild specification or what not

  addCommand('langstonadeko', ['Language Server'],
    '',
    'Adds all the language roles to nadeko',
    `Adds all the language roles to nadeko
    Prefixes are ${_rolePrefixList.join(', ')}
    Excludes are ${_roleIgnoreList.join(', ')}`,
    function (parameter, options, self, name) {
      const channel = options.originChannel;
      const list1 = _rolePrefixList;
      const list2 = _getColoringLanguageRoles(channel.guild);
      
      const roleCollection = channel.guild.roles;
      list1.forEach(function (type) {
        var roleList = _.flow( // Get all the roles that are `${list1} ${list2}`
          _.map(function (lang) {
            return roleCollection.find('name', `${type} ${lang}`);
          }),
          _.filter(function (role) { return role != undefined; })
        )(list2);
        roleList.forEach(function (role) { // Assign color
          channel.send(`.asar ${role.name}`);
        });
      });
    }
  );
}
//*/
module.exports = library;