'use strict';

const _flow = require('lodash/fp/flow');
const _chunk = require('lodash/fp/chunk');
const _map = require('lodash/fp/map');
const _flatMap = require('lodash/fp/flatMap');
const _filter = require('lodash/fp/filter');
const _concat = require('lodash/fp/concat');
const _take = require('lodash/fp/take');
const _reduce = require('lodash/fp/reduce');
const _join = require('lodash/fp/join');
const _last = require('lodash/fp/last');
const _zip = require('lodash/fp/zip');


const Utils = require('./utils.js');
const config = require('./config.json');
const IGNORE_LIST = config.ignore_server;

const ROLES_MESSAGE_WIDTH = 60;
const ROLES_MAX_DISPLAY = 99;
const ROLES_COL_THRESHOLD = 60; // Inclusive threshold afer which we bump to 3 columns

//const description = {};
const commands = {
  echo: function (parameter, options) {
    if (parameter.length > 0) {
      options.originChannel.send(parameter);
    }
  },

  test: function (serverId, options, selfbot) {
  /*  Utils.getLatestMessages(selfbot.user.id, 25, selfbot.guilds.get(serverId))
      .then(messages => {
        const output = messages.map(msg => msg.content);
        Utils.notifyMe(output, selfbot, '```');
      });*/
    console.log(selfbot.guilds.get(serverId).icon);
    console.log(selfbot.guilds.get(serverId).iconURL);
  },

  /**
   * Deletes any messages from a specified ID onwards
   * At the moment this command doesn't check if any of the deletes were
   * successful and and tally those, eg. won't catch random network errors
   * Does handle not having permission to delete.
   */
/*  prune: function (messageId, channel, self) {
    const guildId = channel.guild.id;
    Utils.findMessageById(self.guilds.get(guildId), messageId).then(
      // Success so start the deleteing
      message => 
        Utils.deleteAfter(message.channel, message)
        .then(count => {
          if (message.deletable) {
            message.delete(0);
            return count + 1;
          } else {
            return count;
          }
          
        }).then(count =>
          Utils.notifyMe(`Tried to clear ${count} messages.`, self, '')),
        
      // Couldn't find message with id
      () => Utils.notifyMe(`Message ${messageId} not found.`, self, '')
      
    );
  },*/

  survey: function (serverID, options, selfbot) {
    const VERBOSE = false;
    const MIN = 2; // Minimum shared guild count
    const target = selfbot.guilds.get(serverID);
    
    Utils.notifyMe(`**Finding friends in '${target.name}'**`, selfbot, '');

    // Mapping to profiles to get at mutualGuilds
    const profileList = target.members
      .filter(member => member.id !== selfbot.user.id && !member.user.bot)
      .map(member => member.user.fetchProfile());
    Promise.all(profileList)
      .then(member => member
        .filter(profile => profile.mutualGuilds
          .filter(guild =>!IGNORE_LIST.hasOwnProperty(guild)).size >= MIN)
        .map(profile => {
          const user = profile.user;
          const start = `${user.username} ${user.id} is in`;
          const guilds = profile.mutualGuilds;
          return(VERBOSE
            ? `${start} ${guilds.map(server => server.name).join(', ')}\n\n`
            : `${start} ${guilds.size} servers\n`);
        }))
      .then(output => Utils.notifyMe(output, selfbot, '```'));
  },

  stalk: function (id, options, self) {
    // Going through the guilds to avoid caching issues of client.users
    const query = self.guilds.find(server =>(server.member(id) !== null));
    if (query === null) {
      Utils.notifyMe(`Could not find user '${id}'`, self, '');
      return;
    }
    
    const COUNT = 25;
    const LINE_LENGTH = 60;
    const FORMAT = 'h:m y-M-d';
    
    const target = query.member(id).user;
    const header = [`**Messages by ${target.username}, ${target.id}`
      + ` (now ${Utils.formatDate(Date.now(), FORMAT)})**\n\n`];
    target.fetchProfile()
      // Turn them into a list of searches, which are promises
      .then(profile => profile.mutualGuilds.map(server =>
        Utils.getLatestMessages(id, COUNT, server)))
      // Have to wait for all searches to resolve
      .then(searchPerGuild => Promise.all(searchPerGuild)
        .then(searches => searches
          .reduce((x, y) => x.concat(y), [])  // flatten Promise.all()
          .sort(msg => msg.createdTimestamp)  // Sort lastest first
          .slice(0, COUNT)                    // Take
          .sort(msg => -msg.createdTimestamp) // Sort chronological again
          .map(msg =>                         // And format output
            `${Utils.truncate(msg.content, LINE_LENGTH)} ` + '``on ' +
            Utils.formatDate(msg.createdTimestamp, FORMAT) +
            ` in #${msg.channel.name} within ${msg.guild.name}` + '``\n'
          )))
      .then(msgs => Utils.notifyMe(header.concat(msgs), self, ''));
  },

  'exit': function () {
    process.exit(0);
  }
};

  // Change param to be channels, friends, 
commands.list = function (parameter, options, selfbot) {
  if (parameter === '') return;
  if (!Utils.isPersonal(options.originChannel)) return;

  let output = '';
  const server = selfbot.guilds.get(options.serverId);
  
  switch (parameter.toLowerCase()) {
  case 'channels':
    output = server.channels.map(chan =>
      `${chan.type === 'voice' ? '' : '#'}${chan.name}: \n`
      + chan.permissionOverwrites.map(perm => {
        const name = perm.type === 'role'
          ? perm.channel.guild.roles.get(perm.id).name
          : `<@${perm.channel.guild.members.get(perm.id).id}>`;
        return `・${name} => allow:${perm.allow} deny:${perm.deny}`;
      }).join('\n') + '\n');
    break;
  case 'roles':
    output = server.roles
      .map(function (role) {
        return(`・${role.name} => ${role.hexColor}, ${role.members.size} members `
          + `${role.permissions}\n`);
      });
    break;
  default: break;
  }
  
  Utils.notifyMe([`**Listing ${parameter} for server ${server.name}**\n`]
    .concat(output), selfbot, '');
};

// Creates a no permission role
// Doesn't affect permissions of use external emoji and add reactions
commands.createrole = function (parameter, options, self) {
  options.originChannel.guild.createRole({
    name: parameter,
    permissions: 0
  });
};

// Todo: put check to make sure all color changes were successful
// Too lazy to put check 
commands.colorroles = function (parameter, options, self) {
  // Setting stuff
  var startColor = [202,58, 46];  // 0xCA3A2E
  var endinColor = [255,191,142]; // 0xFFBF8E
  //var endinColor = [0,0,0]; // 0xFFBF8E
  var list1 = ['Learning', 'Fluent', 'Heritage', 'Native'];
  var list2 = [
    'Gan','Hakka','Hokkien', 'Hunanese',
    'Jin', 'Lanzhouhua', 'Longdu','Pinghua','Taishanese','Teochew','Wu',
    'Zhejiang',
  ];
  /*var list2 = [ // For my own testing
    'Hui', 'Gan', 'English', 'Japanese', 'Cantonese'
  ];*/
  /**
   * Exclude Cantonese, Mandarin, English, Other, Classical Chinese
   */

  // Actual code
  var maxIndex = list2.length - 1;
  // x[1] - x[0], _zip(endinColor)
  // x[0] - x[1], _zip(startColor)
  var color = _flow(
    _zip(endinColor),
    _map(function (x) { return (x[1] - x[0]) / maxIndex; }),
    _zip(endinColor)
  )(startColor);
  var roleCollection = options.originChannel.guild.roles;

  list1.forEach(function (type) {
    var roleList = _map(function (lang) {
      return roleCollection.find('name', `${type} ${lang}`);
    }, list2);
    var len = _reduce(function (acc, value) {
      return value == null ? acc: acc + 1;
    }, 0, roleList);

    // Must have found every role otherwise exit
    if (len !== list2.length) {
      console.log(`createrole: problem with ${type}`);
      return;
    }

    // me.colorroles
    // Tween assign color
    roleList.forEach(function (role, index) {
      var newColor = color.map(function (x) {
        return Math.max(0,Math.min(255,Math.round(x[0] + x[1] * index)));
      });
      console.log(newColor);
      role.setColor(newColor);
    });
  });
};

// Counts members that have a role
commands.role = function (parameter, options, self) {
  if (typeof parameter === 'undefined') return;

  const server = self.guilds.get(options.serverId);
  // Find valid roles, there might be multiples with the same name
  const roleList = server.roles.filter(function (role) {
    return role.name.toLowerCase() === parameter.toLowerCase(); });
 
  roleList.size === 0
    ?options.originChannel.send(`'${parameter}' was not a valid role name.`)
    :roleList.forEach(function (role) {
      const memberSize = role.members.size;
      const maxIndex = memberSize < ROLES_COL_THRESHOLD ? 1 : 2;
      const len = Math.floor(ROLES_MESSAGE_WIDTH / (maxIndex + 1));
      const usernames = role.members.map(function (member) {
        return member.user.username; });
      
      options.originChannel.send(
        ['```'].concat(             // Construct array of string bits
        `'${role.name}' has ${memberSize} members\n`,
        _flow(
          _take(ROLES_MAX_DISPLAY), // Limit
          _chunk(maxIndex + 1),     // Group into columns
          _flatMap(function (line) { return _flow(
            _take(maxIndex),        // Pad until except for last element
            _map(function (name) { return Utils.truncateAndPad(name, len); })
            )(line) + line[maxIndex].substr(0, len) + '\n';
          }))(usernames),
        '```', memberSize <= ROLES_MAX_DISPLAY ? '' : '...\n'
      ).join(''));                  // Join said array of strings
    });
};

module.exports = commands;