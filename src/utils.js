const path = require('path');
const IS_DEVELOPMENT = process.argv[2] != undefined &&
  process.argv[2].trim().toLowerCase() === 'development';
if (IS_DEVELOPMENT) {
  delete require.cache[path.resolve('./personal/personal.json')];
}
const personal = require(path.resolve('./personal/personal.json'));
const personalChannel = personal.self_notify_location;

const MAX_MESSAGE_LENGTH = 2000; // Discord is 2000 a message
const MAX_SEARCH_CLUSTER = 25;
const FETCH_LIMIT = 100;

const Utils = {
  /**
   * @param {Channel} Channel The channel to check
   * @returns {boolean} True
   */
  isPersonal: function (channel) {
    return channel.id === personalChannel.channel;
  },
  langServerId: function (channel) {
    return personal.language_server;
  },

  /**
   * @param {Object} commands
   * @param {Object} help
   * @returns {function (Object, Object)} The main command and help objects
   * to merge into in the current context
   */
  export: function (sourceCommands, sourceHelp) {
    return function (targetCommands, targetHelp) {
      Object.keys(sourceCommands).forEach(function (key) {
        if (targetCommands.hasOwnProperty(key)) {
          throw new SyntaxError(`Already registered the '${newCommand}' command`);
        }
        targetCommands[key] = sourceCommands[key];
        targetHelp[key] = sourceHelp[key];
      });
    };
  },

  displayDetailedHelp: function (help, channel) {
    channel.send(`**${help.command}**\n${help.header}\n${help.body}`);
  },

  addCommand: function (name, commands, help,
      format, description, documentation, handler) {
    if (commands.hasOwnProperty(name)) { // Check if already added
      throw new SyntaxError(`Already registered the '${name}' command`);
    }
    help[name] = { command: format, header: description, body: documentation };
    commands[name] = function (parameter, options, client) {
      if (options.help === true) { // Help flag overrules execution
        Utils.displayDetailedHelp(help[name], options.originChannel);
      } else {
        handler(parameter, options, client, name);
      }
    };
  },

  // Makes use of dynobot to alert myself in private channel
  alert: function (message, client) {
    const channel = client.guilds.get(personalChannel.server)
      .channels.get(personalChannel.channel);
    channel.send(`?alert ${message.replace(/\s/g, '_')}`);
  },

  /**
   * @param {Snowflake} id String id for a user
   * @param {number} limit Number of search results between 1 and 25
   * @param {Guild} server Server object to search
   * @param {Snowflake} channelId String id for the channel
   * @return {Promise<Array<Message>>} Promise of results
   */
  getLatestMessages: function (id, limit, server, channelId) {
    const options = {
      author: id,
      contextSize: 0,
      channel: channelId,
      limit: Math.max(1, Math.min(MAX_SEARCH_CLUSTER, limit)),
    };
    
    return server.search(options).then(result =>
      result.messages.reduce((x, y) => x.concat(y), []));
  },

  
  delete: function (message) {
    return message.delete(0).then(
      function () { return 1; },
      function () { return 0; }
    );
  },

  // Utilizes the search command, or fetchMessages method to delete messages
  // Uses {message} as the reference point to delete all messages after
  deleteMessages: function (channel, message, predicate) {
    // First delete all messages after {message}
    return channel.fetchMessages({after: message.id}).then(function (msgList) {
      if (msgList.size === 0) { // Terminating condition
        return 0; // No more messages after so return zero
      }

      const lastMessage = msgList.values().next().value;
      const deletions = msgList // Delete all excluding {lastMessage}
        .filter(function (msg) { return msg.deletable; })
        .filter(predicate)
        .filter(function (msg) { return msg.id !== lastMessage.id; })
        .map(Utils.delete);
      
      // Return number of deletions successfully performed
      return Promise.all(deletions).then(function (count) { // Sum
        return count.reduce(function (a, x) { return a + x; }, 0);
      }).then(function (total) { // Then delete using {lastMessage} as new base
        return(Utils.deleteMessages(channel, lastMessage, predicate)
          .then(function (x) { return total + x; })); // Sum with old total
      });
    // Then delete {message} now that everything after is deleted
    }).then(function (deletionCount) {
      return(Utils.delete(message)
        .then(function (x) { return deletionCount + x; }));
    });
  },

  /**
   * Gets the message object from just the id for the message
   * @param {Guild} server Guild to search
   * @param {String|Snowflake} messageId Message ID to search for
   * @returns {Promise<Message>} Message on find, reject when can't
   */
  findMessageById: function (server, messageId) {
    const query = server.channels
      .filter(chan => chan.type === 'text')
      .map(chan => chan.fetchMessage(messageId).then( // Invert
        x => Promise.reject(x),
        x => Promise.resolve(x))
      );
    
    // Return first successful
    return Promise.all(query).then( // Doing a nand not fetch
      x => Promise.reject(x), // All searches failed
      x => Promise.resolve(x) // Return first sucess
    );
  },

  /**
   * @param {string} format
   */
  formatDate: function (timestamp, format) {
    const date = new Date(timestamp);
    return(format
      .replace(/y/g, date.getFullYear())
      .replace(/M/g, (date.getMonth() + 1))
      .replace(/d/g, date.getDate())
      .replace(/h/g, date.getHours())
      .replace(/m/g, ('0' + date.getMinutes()).substr(-2)));
  },

  /**
   * Concatenates a message to be optimal for discord's send size limits
   * Prioritises keeping entries in {strArray} in tact
   * @param {string[]} strArray The strings to output
   * @param {Object} selfClient
   * @param {string} padding 
   */
  notifyMe: function (strArray, selfClient, padding) {
    let fragment = '';
    const max = MAX_MESSAGE_LENGTH - padding.length * 2;
    const channel = selfClient.guilds.get(personalChannel.server)
      .channels.get(personalChannel.channel);
    
    for (let i = 0; i < strArray.length; ++i) {
      const cur = strArray[i];
      if ((fragment.length + cur.length) <= max) { // Build fragment
        fragment += cur;
      } else {                                     // Print process
        const extra = Math.floor(cur.length / max);
        // Output such that always start with a new entry of {strArray}
        if (fragment.length > 0) {
          channel.send(padding + fragment + padding);
        }
        // Segement {cur} into {max} length strings (and send since at max)
        for (let j = 1; j < extra; ++j) {
          channel.send(padding + cur.substr(j * max, max) + padding);
        }
        // Rest of the string
        fragment = cur.substr(extra * max);
      }
    }
    // Print left overs
    if (fragment.length > 0) {
      channel.send(padding + fragment + padding);
    }
  },

  truncate: function (str, targetLength) {
    return str.length < (targetLength - 1)
      ? str.substr(0, targetLength - 1)
      : str.substr(0, targetLength - 3) + '...';
  },

  truncateAndPad: function (str, targetLength) {
    const trunc = Utils.truncate(str, targetLength);
    return trunc + (new Array(targetLength - trunc.length).join(' '));
  },
};

module.exports = Utils;