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

  displayDetailedHelp: function (helpEntry, sender) {
    sender(helpEntry.header + '\n' + helpEntry.body);
  },

  addCommand: function (name, commands, help,
      format, description, documentation, handler) {
    if (commands.hasOwnProperty(name)) { // Check if already added
      throw new SyntaxError(`Already registered the '${name}' command`);
    }
    help[name] = { command: format, header: description, body: documentation };
    commands[name] = function (parameter, options, client) {
      if (options.help === true) { // Help flag overrules execution
        Utils.displayDetailedHelp(help[name], options.originChannel.send);
      } else {
        handler(parameter, options, client);
      }
    };
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

  deleteAfter: function (channel, message, count = 0) {
    console.log(message.content);
    return channel.fetchMessages({limit: FETCH_LIMIT, after: message.id})
      .then(messageList => [
        // 0. D 
        messageList
          .filter(message => !message.deletable)
          .reduce((last, msg) => (msg.createdTimestamp > last.createdTimestamp 
            ? msg
            : last), message),
        // 1. Delete and give the amount of delete mesages
        messageList
          .filter(message => message.deletable)
          .map(message => message.delete(0).then(() => 1, () => 0))
      ])

      .then(x => Promise.all(x[1])
        .then(deleteCount => deleteCount.reduce((x, y) => x + y, 0))
        .then(deletedSum => deletedSum === 0 && message.id === x[0].id
          ? x[0] // Case that nothing deleted and not traversing
          : Utils.deleteAfter(channel, x[1], count + deletedSum))
      );
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