'use strict';


const rComment = /^\s*\/\*[^*]*\*+([^\/*][^*]*\*+)*\//;

// @name
// @name: value
// @name: 'value'
// @name: "value"
const rAnno = /@([-\w]+)(?:\s*:\s*(?:([-\w]+)|(?:['"]([^'"]+)['"])))?/g;

// 兼容老版本
const rOldAnno = /!!cmd:\s*([-\w]+)\s*=\s*([-\w]+)\s*/g;


module.exports = function(body, name) {
  const match = rComment.exec(body);
  if (!match) {
    return null;
  }

  return tryGet(match[0], rAnno, name) ||
      tryGet(match[0], rOldAnno, name) || null;
};


function tryGet(body, re, name) {
  re.lastIndex = 0;
  let match = null;
  do {
    match = re.exec(body);
  } while (match && match[1] !== name);

  return match ? (match[2] || match[3] || true) : null;
}

