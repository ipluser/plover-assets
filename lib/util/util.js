'use strict';


const pathUtil = require('path');
const crypto = require('crypto');


exports.getTempDir = function(settings) {
  return settings.tmpdir || pathUtil.join(settings.applicationRoot, 'tmp');
};


exports.getPublicDir = function(settings) {
  return (settings.assets || {}).publicRoot ||
      pathUtil.join(settings.applicationRoot, 'public');
};


exports.getAssetsPrefix = function(settings) {
  return (settings.assets || {}).prefix || '/g';
};


const now = Date.now();
const rQueryStamp = /\?.*$/;

/**
 * 取得缓存地址
 *
 * @param   {String}  path     - 原始地址
 * @param   {Object}  settings - 配置
 * @return  {String}           - 缓存地址
 */
exports.getCachePath = function(path, settings) {
  const tmpdir = exports.getTempDir(settings);
  const shasum = crypto.createHash('sha1');
  shasum.update(path + now);
  const filename = shasum.digest('hex') +
      pathUtil.extname(path).replace(rQueryStamp, '');
  return pathUtil.join(tmpdir, filename);
};

