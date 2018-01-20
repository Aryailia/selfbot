'use strict';

/**
 * @todo fix seperator for command format in botwrapper
 * @todo login to set sender token for psuedodiscord
 * @todo message delete for pseudodiscord
 * @todo Features still in progress
 * - list (mostly complete, though lots to do if i make permission converter)
 * - role (add verbose)
 */

const Utils = require('./utils.js');
const config = require('../config');
const {Helper, _} = require('./inc');

// Configs stuff
const {
  ROLES_MESSAGE_WIDTH,
  ROLES_MAX_DISPLAY,
  ROLES_COL_THRESHOLD,
  SURVEY_MIN_DEFAULT,
  IGNORE_SERVER_LIST_MUTUAL_FRIEND_COUNT,
  PERMISSION_SELF,
} = config;

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

require('./langServerManagement.js').mergeTo(library);

library.addCommand('ping', ['Regular'],
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

// This is suppose to simulate a conversation with a bot
library.addCommand('makesample', ['Personal', 'Development'],
  ' <length>',
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
library.alias('ms', 'makesample');

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

    const strings = _.chain(friendIdsWithCounter)(
      _.sieve(([id, count]) => count >= min && id !== author.id)
      ,_.unmonad(Array.prototype.sort, (a, b) => a[1] - b[1]) // Small to big
      ,_.map(([memberId, count]) => { // Format into string
        const {displayName, id} = targetMembers.get(memberId);
        return `${displayName} <@${id}> '${id}' shares ${count} servers\n`;
      })
    );
    Utils.notifyMe(strings, self, '');
    return true;
  }
);

library.addCommand('stalk', ['Regular'],
  'stalk <userID>',
  'Finds the last 25 messages made by a user in all shared servers',
  `Finds the last 25 messages made by the user <userID> in all servers you are in
  `,
  PERMISSION_SELF,
  function (id, options) {
    const {self} = options;
    // Going through the guilds to avoid caching issues of client.users
    const mutualGuilds = self.guilds.filter(g => g.member(id) !== null);
    const target = mutualGuilds.first().members.get(id);

    if (target === null) {
      Utils.notifyMe(`Could not find user '${id}'`, self, '');
      return false;
    }
    
    const COUNT = 25;
    const LINE_LENGTH = 60;
    const FORMAT = 'y-M-d h:m';
    
    // const reverseDate = ();
    const header = [`**Messages by ${target.user.username} <@${target.id}>`
      + `, ${target.id} (now ${Utils.formatDate(Date.now(), FORMAT)})**\n\n`];
    // return true;
      // Turn them into a list of searches, which are promises
      // Have to wait for all searches to resolve
    Promise.all(mutualGuilds.map(s => Utils.getLatestMessages(id, COUNT, s)))
      .then(searches => _.chain(searches)(
        _.flatten(1)
        ,_.unmonad(Array.prototype.sort,
          (a, b) => a.createdTimestamp - b.createdTimestamp)
        ,_.takeLast(COUNT)
        ,_.map(msg => 
          `${Utils.formatDate(msg.createdTimestamp, FORMAT)}: ` +
          ` **in <#${msg.channel.id}> within ${msg.guild.name}**\n` +
          `${Utils.truncate(msg.content, LINE_LENGTH)}\n\n`
        )
      ))
      // .then(stuff => console.log(stuff))
      .then(msgs => Utils.notifyMe(header.concat(msgs), self, ''));
    return true;
  }
);

/**
 * @todo fuzzy match
 * @todo check interaction of guilds.members with offline users who have no role
 */
library.addCommand('listrole', ['Regular', 'Broken'],
  'role <fullTitle>',
  'Counts and displays all the members in a table',
  `  I forget if I put a max on the number of members to be displayed
  Probably want to use verbose flag to toggle that...`,
  PERMISSION_SELF,
  function (parameter, options) {
    const {self, serverId, origin, verbose} = options;
    const server = self.guilds.get(serverId);

    // Find valid roles, there might be multiples with the same name
    const roleList = server.roles.filter(role =>
      role.name.toLowerCase() === parameter.toLowerCase() // Change to fuzzy
    );
  
    const msgs = ((roleList.size === 0)
      ? [`'${parameter}' was not a valid role name.`]
      : roleList.map(function (role) {
        const memberSize = role.members.size;
        const maxIndex = memberSize < ROLES_COL_THRESHOLD ? 1 : 2;
        const columnWidth = Math.floor(ROLES_MESSAGE_WIDTH / (maxIndex + 1));
        const usernames = role.members.map(member => member.user.username);
        
        // console.log('wat face', role.name)
        return `'${role.name}' has ${memberSize} members\n${'```'}${
          _.chain(usernames)(
            _.take(ROLES_MAX_DISPLAY)
            ,_.map(name => Utils.truncateAndPad(name, columnWidth))
            ,_.chunk(maxIndex + 1) // chunk so know where to add newlines

            // undefined from chunk just fizzles from .join()
            ,_.map(row => `${row.join('').trim()}\n`) // make into string
          ).join('')
        }${'```'}`;
      })
    );
    Helper.massMessage(msgs, origin);
    return true;
  }
);

/*
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
//*/
module.exports = library;