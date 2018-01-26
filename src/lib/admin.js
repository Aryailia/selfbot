module.exports = function (library,
  {
    _
  },
  {
    PERMISSION_SELF
  })
{
  library.addCommand('findid', ['Regular'],
    '',
    'For testing. Should respond with \'pong\'.',
    'To test if the bot is working. Should respond with \'pong\'.',
    PERMISSION_SELF,
    function (parameter, options) {
      options.origin.send('pong');
      return true; // return success
    }
  );

  function errorMessageFactory(send) {
    return function (message) {
      send(message);
      return false;
    };
  }

  library.addCommand('delete', ['Regular'],
    ' <type>',
    'For testing. Should respond with \'pong\'.',
    'To test if the bot is working. Should respond with \'pong\'.',
    PERMISSION_SELF,
    function (type, options) {
      const {param2, origin, serverId, self} = options;
      const guild = self.guilds.get(serverId);
      const errMsg = errorMessageFactory(origin.send);

      if (param == null) return errMsg('Enter the type.');

      switch (type.toLowerCase()) {
        case 'r': case 'role':
          if (!guild.roles.has(param2))
            return errMsg(`Role with id ${param2} does not exist`);
          
          guild.role.get(param2).delete()
            .then(r => `Succefully deleted role, ${r.name} ${r.id}`)
            .catch(errMsg);    
          break;

        default:
          return errMsg('<type> invalid.');
      }

      return true; // return success
    }
  );
};