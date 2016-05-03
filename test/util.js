'use strict';


const pathUtil = require('path');
const fs = require('fs');


exports.fixture = function(path) {
  path = pathUtil.join(__dirname, 'fixtures', path);
  return fs.readFileSync(path, 'utf-8');
};


exports.htmlEqual = function(html) {
  return function(res) {
    tagTrim(res.text).should.equal(tagTrim(html));
  };
};


function tagTrim(html) {
  return html.trim().replace(/>\s+/g, '>').replace(/\s+</g, '<');
}
