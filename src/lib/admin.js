module.exports = function (library,
  {_, Helper},
  {PERMISSION_SELF})
{
  function _removeMentions(name) {
    return name.replace('@', '{@}');
  }

  library.addCommand('findid', ['Admin'],
    ' -p <type> <regex>',
    'Finds the all the ids that match <regex> of type <type>',
    `    Finds the all the ids that match <regex> of type <type>.
    Valid forms are:
     ・ -p guild <regex>: searches all guilds that I am a part of
     ・ -p g <regex>: same as guild
     ・ -p role <regex: searches all the roles in the current guild (-g)
     ・ -p r <regex>
    `,
    PERMISSION_SELF,
    function (parameter, options) {
      const {param2, origin, serverId, self} = options;
      const server = self.guilds.get(serverId);

      if (param2 == null || param2 === '') {
        origin.send('Error: Enter the type.');
        return false;
      }
      const search = new RegExp(parameter);
      console.log(param2);

      const strings = (function (type) { // Switch
        if (type === 'r' || type === 'role') {
          return (server.roles
            .filter(role => role.name.match(search) != null)
            .sort((a, b) => b.calculatedPosition - a.calculatedPosition)
            .map(role => `${role.id} **${_removeMentions(role.name)}**\n`)
          );
        } else if (type === 'g' || type === 'guild') {
          return (self.guilds
            .filter(guild => guild.name.match(search) != null)
            .map(guild => `${guild.id} **${_removeMentions(guild.name)}**\n`)
          );
        } else if (type === 'u' || type === 'user') {
          return ['WIP'];
        } else {
          return ['Enter valid'];
        }
      })(param2.toLowerCase());

      Helper.massMessage(strings.length === 0 ? ['None found'] : strings, origin);

      return true; // return success
    }
  );

  library.addCommand('delete', ['Admin'],
    ' <type>',
    'deletes',
    'To test if the bot is working. Should respond with \'pong\'.',
    PERMISSION_SELF,
    function (parameter, options) {
      const {param2, origin, serverId, self} = options;
      const guild = self.guilds.get(serverId);
      const send = origin.send;

      if (param2 == null || param2 === '') {
        send('Error: Enter the type.');
      } else {
        const type = param2.toLowerCase();
        if (type === 'r' || type === 'role') {
          if (!guild.roles.has(parameter)) {
            send(`Role with id ${parameter} does not exist`);
          } else {
            guild.roles.get(parameter).delete()
              .then(r => send(`Succefully deleted role, ${r.name} ${r.id}`))
              .catch(send);
          }
        // } else if (type === 'r' || type === 'role') {
        } else {
          send('Error: Invalid <type>.');
        }
      }
      return true; // return success
    }
  );
};