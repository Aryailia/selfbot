// Modules
const IS_DEVELOPMENT = process.argv[2] != undefined &&
  process.argv[2].trim().toLowerCase() === 'development';
const Utils = require('./utils.js');
const _ = require('./fp.js');

// Code Body
const _rolePrefixList = ['Learning', 'Heritage', 'Fluent', 'Native'];
const _roleIgnoreList = ['Cantonese','Mandarin','English','Other','Classical Chinese'];


function commands(addCommand) {
  /**
   * 
   * @param {Guild} guild 
   * @returns {Array<String>}
   */
  function _getColoringLanguageRoles(guild) {
    const roles = guild.roles.map(function (role) { return role.name; });
    const languages = _.flow(
      _.filter(function (role) { // roles that start with the prefixes
        return _rolePrefixList.reduce(function (sentinel, compare) {
          return sentinel || role.toLowerCase().startsWith(compare.toLowerCase());
        }, false);
      }),
      _.filter(function (role) { // roles that are not in ignore list
        return _roleIgnoreList.reduce(function (sentinel, compare) {
          return sentinel && !role.toLowerCase().endsWith(compare.toLowerCase());
        }, true);
      }),
      _.map(function (role) { return role.split(' ')[1]; }), // Get language name half
      _.uniqWith(function (lang1, lang2) { return lang1 === lang2; }),
      _.sortBy(function (x) { return x; })
    )(roles);
    return languages;
  }

  addCommand('listlangs', ['Language Server'],
    '_listroles [\'local\']',
    'Lists all the roles in prefixed by learning/etc and not in the ignore list.',
    '\'local\' specifies the current channel',
    function (parameter, options, self) {
      const languages = _getColoringLanguageRoles(parameter === 'local'
        ? options.originChannel.guild
        : self.guilds.find('id', Utils.langServerId()));
      options.originChannel.send(`'${languages.join('\', \'')}'`);
    }
  );


  // Creates a no permission role
  // Doesn't affect permissions of use external emoji and add reactions
  // Todo: add error priting for failure and what not
  addCommand('createrole', ['Language Server'],
    ' [<perimssionMask>]',
    'Adds a role with <permissionMask> permission level. <permissionMask> must be a number.',
    `  If nothing is specified for <permissionMask>, then it copies @ everyone
    Can also specify guild flag coming soon (TM)`,
    function (parameter, options) {
      options.originChannel.guild.createRole({
        name: parameter,
        permissions: parameter === '' ? '' : parseInt(parameter)
      });
    }
  );

  // Todo: Maybe custom guild specification or what not
  addCommand('assigncolor', ['Language Server'],
    '',
    'Assigns all the non-main language roles a color tweening between two values',
    `  Hard-coded tween between to 0xCA3A2E to 0xFFBF8E 
    Prefixes are ${_rolePrefixList.join(', ')}
    Excludes are ${_roleIgnoreList.join(', ')}`,
    function (parameter, options, self) {
      // Setting stuff
      const startColor = [202,58, 46];  // 0xCA3A2E
      const endinColor = [255,191,142]; // 0xFFBF8E

      const list1 = _rolePrefixList;
      const list2 = _getColoringLanguageRoles(options.originChannel.guild);

      // Actual code
      const maxIndex = list2.length - 1;
      // x[1] - x[0], _zip(endinColor)
      // x[0] - x[1], _zip(startColor)
      const colorTween = _.flow(
        _.zip(endinColor),
        _.map(function (x) { return (x[1] - x[0]) / maxIndex; }),
        _.zip(endinColor)
      )(startColor);
      const colorHash = {}; // Associated array of <language, color> pairs
      list2.forEach(function (language, index) {
        colorHash[language] = colorTween.map(function (x) {
          return Math.max(0,Math.min(255,Math.round(x[0] + x[1] * index)));
        });
      });
      
      const roleCollection = options.originChannel.guild.roles;
      list1.forEach(function (type) {
        var roleList = _.flow( // Get all the roles that are `${list1} ${list2}`
          _.map(function (lang) {
            return roleCollection.find('name', `${type} ${lang}`);
          }),
          _.filter(function (role) { return role != undefined; })
        )(list2);
        roleList.forEach(function (role) { // Assign color
          role.setColor(colorHash[role.name.split(' ')[1]]);
        });
      });
    }
  );

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

module.exports = commands;