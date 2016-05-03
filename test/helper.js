'use strict';


const pathUtil = require('path');
const http = require('http');
const plover = require('plover');
const request = require('supertest');

const util = require('./util');


describe('helper', function() {
  const root = pathUtil.join(__dirname, 'fixtures/app');

  it('use assets helper', function() {
    const agent = createAgent({
      applicationRoot: root,
      port: 60001
    });
    return agent.get('/list')
        .expect(equal('list.html'));
  });

  it('assets tags with url concat', function() {
    const agent = createAgent({
      applicationRoot: root,
      env: 'production',
      port: 60002,
      assets: {
        enableConcat: true,
        concatItems: [
          { match: /^\/g\/(.*)$/, prefix: '/g/??' }
        ]
      }
    });

    return agent.get('/list')
        .expect(equal('list-concat.html'));
  });
});


function createAgent(settings) {
  const app = plover(settings);
  const server = http.createServer(app.callback());
  server.listen(settings.port);
  return request.agent(server);
}


function equal(path) {
  return util.htmlEqual(util.fixture('app/expect/' + path));
}
