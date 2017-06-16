'use strict';

const path = require('path');
const IS_DEVELOPMENT = process.argv[2] != undefined &&
  process.argv[2].trim().toLowerCase() === 'development';

const imports = {};
if (IS_DEVELOPMENT) {
  delete require.cache[path.resolve('./src/utils.js')];
  delete require.cache[path.resolve('./src/config.json')];
  delete require.cache[path.resolve('./src/langServerManagement.js')];
  delete require.cache[path.resolve('./src/fp.js')];
}
const Utils = require(path.resolve('./src/utils.js'));
const config = require(path.resolve('./src/config.json'));
const _ = require(path.resolve('./src/fp.js'));
imports.langServer = require(path.resolve('./src/langServerManagement.js'));
const IGNORE_LIST = config.ignore_server;

const ROLES_MESSAGE_WIDTH = 60;
const ROLES_MAX_DISPLAY = 99;
const ROLES_COL_THRESHOLD = 60; // Inclusive threshold afer which we bump to 3 columns

const help = {};
const commands = {};
imports.langServer(commands, help);

Utils.addCommand('help', commands, help,
  'help',
  'Lists ',
  `  Valid forms are:
  - help
  - help <command>
  eg. help ping

  You can set the -h flag after an actual command to display specific info as well`,
  function (parameter, options) {
    const sendMessage = options.originChannel.send;
    if (parameter === '') { // General help message is print all the headers
      const messages = _.map(function (commandName) {
        return `**${config.prefix}${commandName}** ${help[commandName].header}`;
      }, Object.keys(help));
      sendMessage(_.sortBy(x => x, messages).join('\n'));
    } else {
      if (!commands.hasOwnProperty(parameter)) {
        sendMessage(`Error: No help command named '${parameter}'`);
        console.error(`Error: No help command named '${parameter}'`);
      } else if (!help.hasOwnProperty(parameter)) {
        sendMessage(`Error: No help entry for '${parameter}'`);
        console.error(`Error: No help entry for '${parameter}'`);
      } else {
        Utils.displayDetailedHelp(help[parameter], sendMessage);
      }
    }
  }
);

Utils.addCommand('ping', commands, help,
  'ping',
  'To test if the bot is working',
  'Should respond with \'pong\'.',
  function (parameter, options) {
    options.originChannel.send('pong');
  }
);


  //test: function (serverId, options, selfbot) {
    //Utils.getLatestMessages(selfbot.user.id, 25, selfbot.guilds.get(serverId))
    //  .then(messages => {
    //    const output = messages.map(msg => msg.content);
    //    Utils.notifyMe(output, selfbot, '```');
    //  });
    
    //console.log(selfbot.guilds.get(serverId).icon);
    //console.log(selfbot.guilds.get(serverId).iconURL);
  //},
// Deletes any messages from a specified ID onwards
  // At the moment this command doesn't check if any of the deletes were
  // successful and and tally those, eg. won't catch random network errors
  // Does handle not having permission to delete.
  //prune: function (messageId, channel, self) {
  //  const guildId = channel.guild.id;
  //  Utils.findMessageById(self.guilds.get(guildId), messageId).then(
  //    // Success so start the deleteing
  //    message => 
  //      Utils.deleteAfter(message.channel, message)
  //      .then(count => {
  //        if (message.deletable) {
  //          message.delete(0);
  //          return count + 1;
  //        } else {
  //          return count;
  //        }
  //        
  //      }).then(count =>
  //        Utils.notifyMe(`Tried to clear ${count} messages.`, self, '')),
  //      
  //    // Couldn't find message with id
  //    () => Utils.notifyMe(`Message ${messageId} not found.`, self, '')
  //    
  //  );
  //},

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