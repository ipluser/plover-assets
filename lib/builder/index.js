'use strict';


const pathUtil = require('path');
const fs = require('fs-extra');
const sortBy = require('lodash/sortBy');
const is = require('is-type-of');


const Resolver = require('plover-module-resolver');
const getModuleInfo = Resolver.getModuleInfo;
const assetsUtil = require('plover-assets-util');

const util = require('../util/util');
const handler = require('../handler');
const buildModule = require('./build-module');

const debug = require('debug')('plover-assets:builder');


/* eslint no-console: 0 */


class Builder {

  constructor(settings) {
    // 标识非开发态
    settings.development = false;

    // 构建模块解析器
    this.moduleResolver = new Resolver(settings);

    // 处理器
    this.ploverAssetsHandler = handler;

    // 配置
    this.settings = settings;

    // 处理步骤
    this.actionList = [];

    // 安装编译插件
    installPlugins(this);
  }


  * buildApp(options) {
    options = Object.assign({}, options);

    // assets输出目录
    const prefix = util.getAssetsPrefix(this.settings);
    const outputDirRoot = pathUtil.join(options.outputDir, prefix);

    // 其他编译插件直接使用outputDir，不用再拼接prefix
    options.outputDir = outputDirRoot;

    fs.emptyDirSync(outputDirRoot);

    const modules = this.moduleResolver.list();
    debug('module resolved: ', modules.map(info => info.name));
    for (const info of modules) {
      const outputDir = pathUtil.join(outputDirRoot, info.name);
      yield* buildModule(this, info, { outputDir: outputDir });
    }

    yield* runActions(this, this.actionList, options);

    writeAssetsStamp(outputDirRoot);
  }


  * buildModule(root, options) {
    const info = getModuleInfo(root);
    yield* buildModule(this, info, options);
  }


  build(fn, options) {
    this.actionList.push({
      fn: fn,
      options: options || {}
    });
  }
}


module.exports = Builder;


/*
 * 按装构建插件
 * package.json中具有plover.buildPlugin属性的为构建插件
 */
function installPlugins(app) {
  const modules = app.moduleResolver.list();
  for (const info of modules) {
    if (info.buildPlugin) {
      const path = pathUtil.join(info.path, info.buildPlugin);
      const plugin = require(path);
      console.log('install plugin: ' + info.name);
      plugin(app);
    }
  }
}


function* runActions(app, actionList, options) {
  actionList = sortBy(actionList, o => {
    const order = o.options.order;
    return typeof order === 'number' ? order : 3;
  });

  for (const action of actionList) {
    const fn = action.fn;
    is.generatorFunction(fn) ?
        yield* fn(app, options) : fn(app, options);
  }
}


function writeAssetsStamp(root) {
  const stamp = assetsUtil.hashDir(root, { salt: '100' }).substr(0, 15);
  const path = pathUtil.join(root, 'assetsStamp');
  console.log('assets stamp: %s', stamp);
  fs.writeFileSync(path, stamp);
}
