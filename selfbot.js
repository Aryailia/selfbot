'use strict';

// Externals
const Discord = require('discord.js');
// Internals
const commands = require('./src/commands.js');
const parse = require('./src/flags.js');
const setFlag = parse.flagSetters;
// Configs
const config = require('./src/config.json');
const personal = require('personal.json');

const selfbot = new Discord.Client({ bot: false }); // Is self-bot
selfbot.login(personal.self_token);

// Ready
selfbot.on('ready', () => {
  console.log('Selfbot is ready.');
});



selfbot.on('message', function (msg) {
  if (msg.author.id !== selfbot.user.id) { return; } // Only respond to myself
  const commandMatch = parse.matchCommand.exec(msg.content);
  if (commandMatch === null) { return; } // Not a valid command format
  msg.delete(); // Delete command since it's valid

  // Now break the parameter into flag and main
  const parameterMatch = typeof commandMatch[2] === 'undefined'
    ? null
    : parse.matchArgs.exec(commandMatch[2]);

  // Options and defaults
  const options = Object.create(null);
  options.originChannel = msg.channel;
  options.serverId = msg.channel.guild.id;
  // Process the flags to set options
  if (parameterMatch !== null) {
    parse.flagList.reduce((protoOptions, flag) => {
      const flagMatch = parse[flag].exec(parameterMatch[1]);
      if (flagMatch !== null) {
        setFlag[flag](protoOptions, flagMatch[1]); // Mutates {protoOptions}
      }
      return protoOptions;
    }, options);
  }
  
  const command = commandMatch[1];
  const arg = parameterMatch === null ?'' :parameterMatch[2];
  
  if (config.DEBUG) {
    console.log('commandMatch', commandMatch);
    console.log('parameterMatch', parameterMatch);
    console.log('commnad', command);
    console.log('arg    ', arg);
    console.log('options', options);
  }

  if (commands.hasOwnProperty(command)) {
    commands[command](arg, options, selfbot);
  }
});