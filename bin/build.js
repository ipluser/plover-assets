'use strict';


const assert = require('assert');
const pathUtil = require('path');
const fs = require('fs');
const co = require('co');
const Builder = require('../lib/builder');


/* eslint no-console: 0, no-process-exit: 0 */


module.exports = build;


function build(opts) {
  opts = Object.assign({}, opts);

  const appRoot = opts.applicationRoot;
  assert(appRoot, '`options.applicationRoot` required');
  opts.outputDir = opts.outputDir || pathUtil.join(appRoot, 'public');

  const settings = loadSettings(appRoot);

  console.log('build assets %s -> %s', appRoot, opts.outputDir);

  const builder = new Builder(settings);
  return co(function* () {
    yield builder.buildApp(opts);
  });
}


function loadSettings(root) {
  const path = pathUtil.join(root, 'config/app.js');
  if (!fs.existsSync(path)) {
    throw new Error('`config/app.js` not exists');
  }
  return require(path);
}


/* istanbul ignore next */
if (require.main === module) {
  const program = require('commander');
  program
    .version(require('../package.json').version)
    .option('--applicationRoot [applicationRoot]')
    .option('-o, --outputDir [outputDir]', 'output dir')
    .parse(process.argv);

  const appRoot = program.applicationRoot ?
      pathUtil.resolve(program.applicationRoot) : process.cwd();
  const outputDir = program.outputDir && pathUtil.resolve(program.outputDir);

  const opts = {
    applicationRoot: appRoot,
    outputDir: outputDir
  };

  build(opts)
    .then(() => console.log('BUILD_SUCCESS'))
    .catch(e => {
      console.error('BUILD_ERROR');
      e = e || {};
      console.error(e.stack || e);
      process.exit(1);
    });
}
