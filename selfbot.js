'use strict';
require('dotenv').config();

// Always Load
const Discord = require('discord.js');
// const Discord = require('./lib/bothelpers/psuedodiscord.js');
const config = require('./config');
const {Helper} = require('./src/inc');
const DEVELOPMENT = process.env.DEVELOPMENT === 'true';

// Dynamic Loads
const imports = Helper.conditionalLoader(DEVELOPMENT, {
  commands: require.resolve('./src/commands.js'),
  parse: require.resolve('./src/flags.js'),
});
imports.staticOnFalse();

// Login
const selfbot = new Discord.Client({ bot: false }); // Is self-bot
selfbot.login(process.env.TOKEN);

// Ready
selfbot.on('ready', () => {
  console.log('Selfbot is ready.');
});

selfbot.on('message', function (msg) {
  if (msg.author.id !== selfbot.user.id) { return; } // Only respond to myself
  const commandMatch = Helper
    .validateParseCommand(config.prefix, Helper.REGEX_SPACE, msg.content);
  if (commandMatch === null) { return; } // Not a valid command format

  imports.dynamicOnTrue();
  // Now break the parameter into flag and main
  const parameterMatch = typeof commandMatch[2] === 'undefined'
    ? null
    : imports.parse.matchArgs.exec(commandMatch[2]);

  // Options and defaults (may be overwritten by flags)
  const options = {
    // Stuff that should not change
    origin: msg.channel,
    author: msg.author, // Discord.user
    member: msg.member, // Discord.guildMember
    self: selfbot,

    // Stuff that is okay to be overwritten by flags
    channel: msg.channel,
    serverId: msg.channel.guild.id,
  };

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
  
  // if (IS_DEVELOPMENT === true && Discord.psuedo === true) {
  //   console.log('commandMatch', commandMatch);
  //   console.log('parameterMatch', parameterMatch);
  //   console.log('commnad', command);
  //   console.log('arg    ', arg);
  //   console.log('options', options);
  // }

  // Execute the command
  try {
    if (imports.commands.run(command, arg, options) == true) {
      // msg.delete(); // Delete if valid command
    } else {
      console.error('an error! nooooo');
    }
  } catch (err) {
    console.error(err);
  }
});
//*/

const http = require('http');
const express = require('express');
const app = express();
app.get('/', (request, response) => {
  console.log(Date.now() + ' Ping Received');
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 290000);