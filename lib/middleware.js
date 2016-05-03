'use strict';


const pathUtil = require('path');
const co = require('co');
const fs = require('mz/fs');
const sendfile = require('koa-sendfile');

const util = require('./util/util');
const handler = require('./handler');


const logger = require('plover-logger')('plover-assets:middleware');


/**
 * 前端资源访问中间件
 *
 * @param   {Object} settings          - 配置信息
 * @param   {KoaApplication} app       - koa应用对象
 * @return  {Middleware}               - Koa中间件
 */
module.exports = function(settings, app) {
  const moduleResolver = app.moduleResolver;
  const filterOptions = {
    settings: settings,
    moduleResolver: moduleResolver
  };

  const prefix = util.getAssetsPrefix(settings);

  const rAssetsTest = new RegExp('^' + prefix + '[/?]');
  // prefix/??
  const rConcat = new RegExp('^(' + prefix + ')/?\\?\\?');
  const rQuery = /\?.*$/;
  // prefix/module/action
  const rAssets = new RegExp('^' + prefix + '/');
  const rInfo = /([^\/]+)\/(.+)$/;

  const publicDir = util.getPublicDir(settings);

  const fse = require('fs-extra');
  fse.ensureDirSync(util.getTempDir(settings));


  return function* PloverMiddlewareAssets(next) {
    // 不是本应用的assets的请求
    if (!rAssetsTest.test(this.path)) {
      return yield* next;
    }

    // 如果public目录有，则直接返回
    const publicPath = pathUtil.join(publicDir, this.path);
    logger.debug('try get from publicdir: %s', publicPath);
    if (yield* tryGetFromPath(this, publicPath)) {
      return;
    }

    if (!settings.development) {
      // 非开发环境尝试从cache文件中获取
      const cachePath = util.getCachePath(this.url, settings);
      logger.debug('try get from cache: %s -> %s', this.url, cachePath);
      if (yield* tryGetFromPath(this, cachePath)) {
        return;
      }
    }

    // 处理concat协议
    const concatMatch = rConcat.exec(this.url);
    if (concatMatch) {
      logger.debug('try process concat assets: %s', this.url);
      return yield* processConcatAssets(this, concatMatch[1]);
    }

    // 请求模块资源
    logger.debug('process module assets: %s', this.url);
    return yield* processAssets(this);
  };


  /*
   * 尝试从指定路径直接加载文件
   */
  function* tryGetFromPath(ctx, path) {
    if (yield fs.exists(path)) {
      const stat = yield fs.stat(path);
      if (stat.isFile()) {
        logger.debug('send file %s', path);
        yield sendfile(ctx, path);
        return true;
      }
    }
    return false;
  }


  /**
   * 处理concat assets资源请求
   *
   * @param {KoaContext} ctx          - Koa上下文
   * @param {String}     concatPrefix - concat url前缀
   */
  function* processConcatAssets(ctx, concatPrefix) {
    // 去掉concat前缀，去掉可能的时间缀，再根据`,`切成路径数组
    const paths = ctx.url.replace(rConcat, '').replace(rQuery, '').split(',');
    const list = yield paths.map(path => {
      return co(function* () {
        // 先尝试从pulbic目录下取
        const cachePath = pathUtil.join(publicDir, concatPrefix, path);
        logger.debug('try load concat file from publicdir: %s', cachePath);
        if (yield fs.exists(cachePath)) {
          logger.debug('send file: %s', cachePath);
          return yield fs.readFile(cachePath, 'utf-8');
        }

        // 再从模块目录下取
        const o = getAssetsPathInfo('/' + path);
        if (!o) {
          return '';
        }

        let body = yield* runFilter(o, filterOptions);
        if (body === false && (yield fs.exists(o.path))) {
          logger.debug('send file: %s', o.path);
          body = yield fs.readFile(o.path, 'utf-8');
        }
        return body || '';
      });
    });

    const body = list.join('\n');

    yield* tryWriteToCache(ctx.url, settings, body);
    setResponse(ctx, ctx.url, body);
  }


  /**
   * 处理assets资源请求
   *
   * @param   {KoaContext}  ctx  - Koa上下文
   */
  function* processAssets(ctx) {
    // 去掉assets前缀
    const path = ctx.path.replace(rAssets, '');
    const o = getAssetsPathInfo(path);
    if (!o) {
      return;
    }

    const body = yield* runFilter(o, filterOptions);
    if (body !== false) {
      yield* tryWriteToCache(ctx.url, settings, body);
      setResponse(ctx, ctx.path, body);
      return;
    }

    if (yield fs.exists(o.path)) {
      yield sendfile(ctx, o.path);
      return;
    }
  }


  /**
   * 运行filter
   * @param {AssetsPathInfo}  o       - 资源信息
   * @param {Object}          options - 选项
   * @return {String|false}   result  - 结果
   */
  function* runFilter(o, options) {
    try {
      return yield* handler.filter(o.path, o.info, options);
    } catch (e) {
      logger.error('process assets error: %s', o.path);
      throw e;
    }
  }


  /**
   * 取得资源信息
   *
   * @param   {String}  path  - 路径
   * @return  {Object}        - 资源信息结构
   */
  function getAssetsPathInfo(path) {
    const match = rInfo.exec(path);
    if (!match) {
      return null;
    }

    const module = match[1];
    const action = match[2];
    logger.debug('request %s:%s', module, action);

    const info = moduleResolver.resolve(module);

    if (!info) {
      logger.error('module not found: %s', module);
      return null;
    }

    const realPath = pathUtil.join(info.path, info.assetsRoot, action);
    logger.debug('%s:%s -> %s', module, action, realPath);
    return {
      path: realPath,
      info: info
    };
  }
};
//~


const rQueryStamp = /\?.*$/;

/**
 * 输出内容
 *
 * @param   {KoaContext}  ctx   Koa上下文
 * @param   {String}    path  路径，用于取得扩展名
 * @param   {String}    body  输出的内容
 */
function setResponse(ctx, path, body) {
  const buffer = new Buffer(body);
  ctx.length = buffer.length;
  ctx.type = pathUtil.extname(path).replace(rQueryStamp, '');
  ctx.body = buffer;
}


function* tryWriteToCache(url, settings, body) {
  if (settings.development) {
    return;
  }
  try {
    logger.debug('try write to cache: %s', url);
    yield fs.writeFile(util.getCachePath(url, settings), body);
  } catch (e) {
    logger.error(e);
  }
}

