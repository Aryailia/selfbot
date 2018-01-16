'use strict';

/**
 * @todo Add command categories for help
 * @todo fix seperator for command format in botwrapper
 * @todo login to set sender token for psuedodiscord
 * @todo message delete for pseudodiscord
 * @todo Currently finished functionality with
 * - ping
 * - makesample
 * - prune
 * @todo Need to refactor
 * - survey
 * - stalk
 * @todo Features still in progress
 * - help
 * - list (mostly complete, though lots to do if i make permission converter)
 * - role (add verbose)
 * @todo plans
 * - permission converter
 */

const IS_DEVELOPMENT = process.argv[2] != undefined &&
  process.argv[2].trim().toLowerCase() === 'development';

const Utils = require('./utils.js');
const Helper = require('../lib/bothelpers/botwrapper.js');
const config = require('./config.json');
const _ = require('./fp.js');
const langServer = require('./langServerManagement.js');
const IGNORE_LIST = config.ignore_server;

const ROLES_MESSAGE_WIDTH = 60;
const ROLES_MAX_DISPLAY = 99;
const ROLES_COL_THRESHOLD = 60; // Inclusive threshold afer which we bump to 3 columns

const fp = require('../lib/bothelpers/fp');
const personal = require('../personal/personal.json');
//const personal = require('../personal/personal.json');
const PERMISSION_SELF = [
  { type: Helper.PERM_TYPE_USER, value: personal.self_id, level: 1 }];
// const PERMISSION_PRIVATE = [...PERMISSION_SELF,
//   { type: Helper.PERMTYPE}];


const library = Helper.makeLibrary(
  // Same arguments as regular command just with two extra parameters before
  function detailedHelp(lib, name, parameter, options) {
    if (options.help === true) { // Help flag overrules execution
      options.help = false;
      library.run('help', name, options);
      return false; // Halt regular execution
    } else {
      return true; // Continue with regular execution of commands
    }
  },
  config.prefix_literal
);
//langServer(library.addCommand);

library.addCommand('ping', ['Regular'],
  '',
  'For testing. Should respond with \'pong\'.',
  'To test if the bot is working. Should respond with \'pong\'.',
  PERMISSION_SELF,
  function (parameter, options) {
    options.origin.send('pong');
    return true; // return success
  }
);

library.addCommand('help', ['Regular'],
  ' [<command>]',
  'For seeing the documentation',
  `Lists the documentation for each function
  Valid forms are:
  - help
  - help <command>
  eg. help ping

  You can set the -h flag after an actual command to display specific info as well`,
  PERMISSION_SELF,
  function (parameter, options) {
    // channel, author, member, commandName, strict, combine
    const command = parameter.toLowerCase();
    const {origin, author, member} = options;
    library.defaultHelp(origin, author, member, command, true, true);
    return true;
  }
);

library.addCommand('makesample', ['Personal', 'Development'],
  'makesample <length>',
  'Generates a specifiable length of conversation. For testing.',
  `Generates an <length>-long conversation. Only availabe in personal.
  <length> must be between 1 and 100`,
  PERMISSION_SELF,
  function (parameter, options) {
    const length = parseInt(parameter);
    //if (!Utils.isPersonal(options.originChannel)) {
    //  Utils.alert('Only available in private channel', selfbot);
    //  return;
    //}

    const channel = options.origin;
    const toSpam = options.parameter == null
      ? 'ping'
      : options.parameter;
    if (parameter === '' || 100 < length && length < 0) {
      channel.send(`${config.prefix_literal}${toSpam} -h`);
    } else {
      for (let i = 0; i < length; ++i) {
        channel.send(i);
        //channel.send('?flipcoin');
      }
    }
    return true;
  }
);
// library.commands.ms = library.commands.makesample; // Alias
library.alias('ms', 'makesample')

library.addCommand('prune', ['Regular'],
  ' [-u <userId>] [-g <serverId>] <messageId>',
  'Deletes all messages from <messageId> to the present.',
  `Deletes all messages from <messageId> to the present.
  If you set the -u flag, this will only prune messages sent by <userId>`,
  PERMISSION_SELF,
  function (messageId, options, name) {
    const client = options.self;
    const channel = options.origin;
    const server = client.guilds.get(options.serverId);
    if (messageId === '') { // Requires a parameter
      channel.send(`${config.prefix_literal}${name} -h`);
      return;// false;
    }

    // For use by Util.deleteMessages()'s filter
    const predicate = server.members.has(options.userId)
      ? function (msg) { return msg.author.id === options.userId; }
      : function () { return true; }; // Always true, ie. filters nothing

    // First find the message (and channel) within {server} by id
    Utils.findMessageById(server, messageId).then(function (message) {
      // Then try to delete
      Utils.deleteMessages(message.channel, message, predicate)
        .then(function (x) { channel.send(`Cleared ${x} messages.`); });
    // Otherwise give error feedback
    }).catch(function (err) {
      console.error(`-----\nError: ${name}\n${err}`);
      channel.send(`Error: message with id '${messageId}' not found`);
    });

    return true;
  }
);

library.addCommand('survey', ['Regular'],
// const MIN = 2; // Minimum shared guild count
  ' [-g <guildId>] <sharedServerCount = 2>',
  'Finds all users that share servers with me',
  `
  `,
  PERMISSION_SELF,
  function (parameter, options) {
    const min = parameter === '' ? '2' : parameter;
    const {self, serverId} = options;
    const target = self.guilds.get(serverId);
    
    Utils.notifyMe(`**Finding friends in '${target.name}'**`, self, '');

    // Mapping to profiles to get at mutualGuilds
    const profileList = target.members
      .filter(member => member.id !== self.user.id && !member.user.bot)
      .map(member => member.user.fetchProfile());
    const friendCandidates = Promise.all(profileList).then(
      member => member
      .filter(member => member.mutualGuilds
        .filter(guild =>!IGNORE_LIST.hasOwnProperty(guild)).size >= min)
      .map(profile => {
        const user = profile.user;
        const start = `${user.username} ${user.id} is in`;
        const guilds = profile.mutualGuilds;
        return(options.verbose
          ? `${start} ${guilds.map(server => server.name).join(', ')}\n\n`
          : `${start} ${guilds.size} servers\n`);
      }),
      error => `${error}\n\n`)

    friendCandidates.then(output => Utils.notifyMe(output, self, '```'));
  }
);

const SURVEY_MIN_DEFAULT = 4;
library.addCommand('survey', ['Regular'],
  ` [-g <guildId>] <sharedServerCount = ${SURVEY_MIN_DEFAULT}>`,
  'Finds all users that share servers with me',
  `
  `,
  PERMISSION_SELF,
  function (parameter, options) {
    const min = (parameter === '') ? SURVEY_MIN_DEFAULT : parseInt(parameter);
    const {self, serverId, author} = options;
    const target = self.guilds.get(serverId); // Defaults to issuing server
    const targetMembers = target.members;
    
    Utils.notifyMe(`**Finding friends in '${target.name}'**`, self, '');
    
    const validGuilds = self.guilds.filter(s =>
      s.id !== serverId // && s.id != '' // Not in servers to black list
    );
    const friendIdsWithCounter = targetMembers.map(member =>
      [ member.id
      , validGuilds.reduce((n, server) => n + server.members.has(member.id), 0)
      ]
    );

    const strings = fp.chain(friendIdsWithCounter
    , fp.sieve, [([id, count]) => count >= min && id !== author.id]
    , fp.unmonad(Array.prototype.sort), [(a, b) => a[1] - b[1]] // Small to big
    , fp.map, [([memberId, count]) => { // Format into string
        const {displayName, id} = targetMembers.get(memberId);
        return `${displayName} <@${id}> '${id}' shares ${count} servers\n`;
      }]
    );
    Utils.notifyMe(strings, self, '');
    return true;
  }
);
/*
library.addCommand('stalk', ['Regular'],
  'stalk <userID>',
  'Finds the last 25 messages made by a user in all shared servers',
  `Finds the last 25 messages made by the user <userID> in all servers you are in
  `,
  function (id, options, self) {
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
  }
);

library.addCommand('list', ['Regular', 'Personal'],
  'list -g <guildId> <parameter>',
  'Lists out information related to the server',
  `Lists out information related to the server.
  Available options for parameter are:
  - channels
  - roles`,
  function (parameter, options, selfbot) {
    let output = '';
    let failure = false;
    const server = selfbot.guilds.get(options.serverId);

    // Fails
    if (parameter === '') {
      failure = true; output = 'list - please specify channels, roles';
    } else if (!Utils.isPersonal(options.originChannel)) {
      failure = true; output = 'list - only available in personal channel';
    } else if (server == undefined) {
      failure = true; output = `list - invalid server id ${options.serverId}`;
    }
    if (failure) {
      output = 'Error: ' + output;
      Utils.notifyMe([output], selfbot, '');
      console.error(output);
      return;
    }
    
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
            return(`・${role.name} => ${role.hexColor},
              ${role.members.size} members ` + `${role.permissions}\n`);
          });
        break;
      default:
        //output
        break;
    }
    Utils.notifyMe([`**Listing ${parameter} for server ${server.name}**\n`]
      .concat(output), selfbot, '');
  }
);

library.addCommand('role', ['Regular', 'Broken'],
  'role <fullTitle>',
  'Counts and displays all the members in a table',
  `  I forget if I put a max on the number of members to be displayed
  Probably want to use verbose flag to toggle that...`,
  function (parameter, options, self) {
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
          _.flow(
            _.take(ROLES_MAX_DISPLAY), // Limit
            _.chunk(maxIndex + 1),     // Group into columns
            _.flatMap(function (line) { return _.flow(
              _.take(maxIndex),        // Pad until except for last element
              _.map(function (name) { return Utils.truncateAndPad(name, len); })
              )(line) + line[maxIndex].substr(0, len) + '\n';
            }))(usernames),
          '```', memberSize <= ROLES_MAX_DISPLAY ? '' : '...\n'
        ).join(''));                  // Join said array of strings
      });
  }
);
//*/
module.exports = library;