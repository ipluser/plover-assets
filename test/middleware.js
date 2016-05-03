'use strict';


const pathUtil = require('path');
const co = require('co');
const plover = require('plover');
const request = require('supertest');
const fs = require('fs-extra');

const util = require('../lib/util/util');
const middleware = require('../lib/middleware');
const handler = require('../lib/handler');


describe('middleware', function() {
  const root = pathUtil.join(__dirname, './fixtures/app');
  const app = plover({ applicationRoot: root });

  app.addMiddleware(function* () {
    this.body = 'ok';
  });

  const agent = request.agent(app.callback());

  handler.add('css', '.less', LessHandler);

  before(function() {
    fs.emptyDirSync(pathUtil.join(root, 'tmp'));
  });

  it('can direct acces assets under `/g`', function() {
    return agent.get('/g/index.html')
        .expect('Hello World\n');
  });


  it('should yield next if not an assets request', function() {
    return agent.get('/hello').expect('ok');
  });


  it('module assets', function() {
    return agent.get('/g/index/css/view.css')
        .expect('body { }\n');
  });


  it('module assets with handler', function() {
    return agent.get('/g/index/css/test.css')
        .expect('compiled: body: {}\n');
  });


  it('module assets not exists', function() {
    return agent.get('/g/index/css/not-exists.css')
        .expect(404);
  });


  it('concat assets', function() {
    return agent.get('/g/??index.html,index/js/a.js,index/js/b.js,index/css/test.css,not-found.js')   // eslint-disable-line
        .expect('Hello World\n\nvar a = 1;\n\nvar b = 2;\n\ncompiled: body: {}\n\n');
  });


  const mapp = plover({ applicationRoot: root, env: 'production' });
  mapp.addMiddleware(middleware);
  const magent = request.agent(mapp.callback());

  it('should with cache when run in no dev mode', function() {
    return co(function* () {
      const url = '/g/index/css/test.css';
      const cachePath = util.getCachePath(url, mapp.settings);
      fs.existsSync(cachePath).should.not.true();
      const expect = 'compiled: body: {}\n';

      yield magent.get(url).expect(expect);

      fs.existsSync(cachePath).should.be.true();

      yield magent.get(url).expect(expect);
    });
  });


  it('module not found', function() {
    return agent.get('/g/not-exists/js/view.js')
      .expect(404);
  });


  it('invalid module assets url', function() {
    return agent.get('/g/abc.js')
      .expect(404);
  });
});


function LessHandler(path, source) {
  return 'compiled: ' + source;
}

