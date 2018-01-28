const Helper = require('disbot-utils');

// const PERMISSION_PRIVATE = [...PERMISSION_SELF,
//   { type: Helper.PERMTYPE}
// ];

module.exports = { 
  IGNORE_SERVER_LIST_MUTUAL_FRIEND_COUNT: {
    '272885620769161216': 'Google Emoji',
    '222078108977594368': 'Discord.js',
    '152169167192064000': 'Discoid'
  },
  ROLES_MESSAGE_WIDTH: 60,
  ROLES_MAX_DISPLAY: 99,
  ROLES_COL_THRESHOLD: 60, // Once past this character limit
  SURVEY_MIN_DEFAULT: 4,

  PERMISSION_SELF: [
    { type: Helper.PERM_TYPE_USER, value: process.env.SELF_ID, level: 1 }
  ],
  
  

  prefix: 'me\\.',
  prefix_literal: 'me.'
};