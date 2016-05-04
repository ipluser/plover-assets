'use strict';


const pathUtil = require('path');
const fse = require('fs-extra');
const co = require('co');

const build = require('../bin/build');


describe('bin/build', function() {
  const root = pathUtil.join(__dirname, 'fixtures/app');
  const outputDir = pathUtil.join(root, 'public2');

  it('test', function() {
    return co(function* () {
      fse.removeSync(outputDir);
      yield build({ applicationRoot: root, outputDir: outputDir });
      fse.existsSync(outputDir).should.be.true();
    });
  });
});
