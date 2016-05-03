'use strict';


const pathUtil = require('path');


module.exports = function(app) {
  app.addEngine('art', require('plover-arttemplate'));

  const root = app.settings.applicationRoot;
  const plugin = require(pathUtil.join(root, '../../../lib/plugin.js'));
  plugin(app);
};

