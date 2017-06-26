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

const library = Helper.setupCommands(function (name, lib) {
  /*function (parameter, options, client) {
    if (options.help === true) { // Help flag overrules execution
      Utils.displayDetailedHelp(help[name], options.originChannel);
    } else {
      handler(parameter, options, client, name);
    }
  };*/
   //if (options.help === true) { // Help flag overrules execution
   // lib.commands.displayDetailedHelp(help[name], options.originChannel);
  //}
  return true;
});
const help = library.help;
const commands = library.commands;
langServer(commands, help);

library.addCommand('help2', ['Regular'], ' [<command>]',
  'For seeing the documentation',
  `Lists the documentation for each function
  Valid forms are:
  - help
  - help <command>
  eg. help ping

  You can set the -h flag after an actual command to display specific info as well`,
  function (parameter, options) {
    Helper.defaultHelp(library, true, false, parameter, options.originChannel);
  }
);

Utils.addCommand('help', commands, help,
  'help',
  'Lists ',
  `  Valid forms are:
  - help
  - help <command>
  eg. help ping

  You can set the -h flag after an actual command to display specific info as well`,
  function (parameter, options) {
    const channel = options.originChannel;
    if (parameter === '') { // General help message is print all the headers
      const messages = _.map(function (commandName) {
        return `**${config.prefix}${commandName}** ${help[commandName].header}`;
      }, Object.keys(help));
      channel.send(_.sortBy(x => x, messages).join('\n'));
    } else {
      if (!commands.hasOwnProperty(parameter)) {
        channel.send(`Error: No help command named '${parameter}'`);
        console.error(`Error: No help command named '${parameter}'`);
      } else if (!help.hasOwnProperty(parameter)) {
        channel.send(`Error: No help entry for '${parameter}'`);
        console.error(`Error: No help entry for '${parameter}'`);
      } else {
        Utils.displayDetailedHelp(help[parameter], channel);
      }
    }
  }
);

library.addCommand('ping', ['Regular'], '',
  'For testing. Should respond with \'pong\'.',
  'To test if the bot is working. Should respond with \'pong\'.',
  function (parameter, options) {
    options.originChannel.send('pong');
  }
);
/*
library.addCommand('makesample', ['Personal', 'Development'], ' <length>',
  'makesample <length>',
  'Generates a specifiable length of conversation. For testing.',
  `Generates an <length>-long conversation. Only availabe in personal.
  <length> must be between 1 and 100`,
  function (parameter, options, client, name) {
    const length = parseInt(parameter);
    //if (!Utils.isPersonal(options.originChannel)) {
    //  Utils.alert('Only available in private channel', selfbot);
    //  return;
    //}

    const channel = options.originChannel;
    if (parameter === '' || 100 < length && length < 0) {
      channel.send(`${config.prefix_literal}${name} -h`);
    } else {
      for (let i = 0; i < length; ++i) {
        channel.send(i);
        //channel.send('?flipcoin');
      }
    }
  }
);*/
Utils.addCommand('makesample', commands, help,
  'makesample <length>',
  'Generates an <length>-long conversation. Only availabe in personal.',
  '  <length> must be between 1 and 100',
  function (parameter, options, client, name) {
    const length = parseInt(parameter);
    //if (!Utils.isPersonal(options.originChannel)) {
    //  Utils.alert('Only available in private channel', selfbot);
    //  return;
    //}

    const channel = options.originChannel;
    if (parameter === '' || 100 < length && length < 0) {
      channel.send(`${config.prefix_literal}${name} -h`);
    } else {
      for (let i = 0; i < length; ++i) {
        channel.send(i);
        //channel.send('?flipcoin');
      }
    }
  }
);
commands.ms = commands.makesample; // Alias

Utils.addCommand('prune', commands, help,
  'prune [-u <userId>] [-g <serverId>] <messageId>',
  'Deletes all messages from <messageId> to the present.',
  '  If you set the -u flag, this will only prune messages sent by <userId>',
  function (messageId, options, client, name) {
    const channel = options.originChannel;
    const server = client.guilds.get(options.serverId);
    if (messageId === '') { // Requires a parameter
      channel.send(`${config.prefix_literal}${name} -h`);
      return;
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
  }
);

Utils.addCommand('survey', commands, help,
  'survey <sharedServerCount = 2>',
  'Finds all users that share ',
  `
  `,
  function (serverID, options, selfbot) {
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
  }
);

Utils.addCommand('stalk', commands, help,
  'stalk <userID>',
  'Finds the last 25 messages made by the user <userID> in all servers you are in',
  '',
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

Utils.addCommand('list', commands, help,
  'list -g <guildId> <parameter>',
  'Lists out information related to the server',
  `  Only can be used in personal text channel
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

Utils.addCommand('role', commands, help,
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
module.exports = commands;