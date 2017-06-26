'use strict';

// Always Load
const Discord = require('discord.js');
//const Discord = require('./lib/bothelpers/psuedodiscord.js');
const config = require('./src/config.json');
const personal = require('./personal/personal.json');
const Helper = require('./lib/bothelpers/botwrapper.js');
const IS_DEVELOPMENT = process.argv[2] != undefined &&
  process.argv[2].trim().toLowerCase() === 'development';

// Dynamic Loads
const imports = Helper.conditionalLoader(IS_DEVELOPMENT, {
  commands: require.resolve('./src/commands.js'),
  parse: require.resolve('./src/flags.js'),
});
imports.staticLoadIfNotDev();

const selfbot = new Discord.Client({ bot: false }); // Is self-bot
selfbot.login(personal.self_token);

// Ready
selfbot.on('ready', () => {
  console.log('Selfbot is ready.');
});

selfbot.on('message', function (msg) {
  if (msg.author.id !== selfbot.user.id) { return; } // Only respond to myself
  const commandMatch = Helper
    .checkCommandFormat(config.prefix).exec(msg.content);
  if (commandMatch === null) { return; } // Not a valid command format

  imports.dynamicLoadIfDev();
  // Now break the parameter into flag and main
  const parameterMatch = typeof commandMatch[2] === 'undefined'
    ? null
    : imports.parse.matchArgs.exec(commandMatch[2]);

  // Options and defaults
  const options = Object.create(null);
  options.originChannel = msg.channel;
  options.bulkSend = Helper.massMessage;
  options.personal = personal;
  options.serverId = msg.channel.guild.id;

  // Process the flags to set options
  const setFlag = imports.parse.flagSetters;
  if (parameterMatch !== null) {
    imports.parse.flagList.reduce((protoOptions, flag) => {
      const flagMatch = imports.parse[flag].exec(parameterMatch[1]);
      if (flagMatch !== null) {
        setFlag[flag](protoOptions, flagMatch[1]); // Mutates {protoOptions}
      }
      //console.log('flagMatch', flag, flagMatch);
      return protoOptions;
    }, options);
  }
  
  const command = commandMatch[1];
  const arg = parameterMatch == null
    ? ''
    : (parameterMatch[2] == null ? '' : parameterMatch[2]);
  
  if (IS_DEVELOPMENT && Discord.psuedo) {
    console.log('commandMatch', commandMatch);
    console.log('parameterMatch', parameterMatch);
    console.log('commnad', command);
    console.log('arg    ', arg);
    console.log('options', options);
  }

  if (imports.commands.hasOwnProperty(command)) {
    imports.commands[command](arg, options, selfbot);
    msg.delete(); // Delete command since it's valid
  }
});
//*/