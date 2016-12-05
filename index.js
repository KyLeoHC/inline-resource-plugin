'use strict';

var vm = require('vm');
var _ = require('lodash');
var path = require('path');
var crypto = require('crypto');
var inline = require('inline-source').sync;
var config = require('./lib/config');
var ChildCompiler = require('./lib/childCompiler');

function InlineResourcePlugin(options) {
    this.count = 0;
    this._templateLoader = null;
    this._assetMap = {};
    this._nameMap = {};
    this._cacheTemplateFile = {};
    this.options = _.extend({
        compress: false,
        compile: true,
        test: /(\.html$)|(\.ejs$)/
    }, options);
}

/**
 * let every embed file has their own unique name
 * @param path
 * @returns {*}
 */
InlineResourcePlugin.prototype.generateUniqueFileName = function (path) {
    if (!this._nameMap[path]) {
        this._nameMap[path] = 'inline_temp_{{count}}.js'.replace('{{count}}', this.count++);
    }
    return this._nameMap[path];
};

/**
 * find a loader to load file
 * @param template
 * @param compiler
 * @returns {*}
 */
InlineResourcePlugin.prototype.initLoader = function (template, compiler) {
    var moduleConfig = _.extend({preLoaders: [], loaders: [], postLoaders: []}, compiler.options.module);
    var loaders = moduleConfig.preLoaders.concat(moduleConfig.loaders).concat(moduleConfig.postLoaders);
    loaders.forEach(function (loader) {
        if (loader.test.test(template)) {
            //if there exist a load for evaluating template
            //don't need another loader
            this._templateLoader = '';
        }
    }.bind(this));
    this._templateLoader = this._templateLoader === null ? 'raw-loader!' : this._templateLoader;
    return this._templateLoader + template;
};

/**
 * get template from compile result
 * @param source
 * @returns {*}
 */
InlineResourcePlugin.prototype.getTemplateCompileResult = function (source) {
    var vmContext = vm.createContext(global);
    var vmScript = new vm.Script(source, {filename: this.options.template});
    return vmScript.runInContext(vmContext);
};

/**
 * evaluate the template to get embed files which need to be compiled
 * @param template
 * @param compiler
 * @param compilation
 * @param callback
 */
InlineResourcePlugin.prototype.findAndCompileInlineFile = function (template, compiler, compilation, callback) {
    var self = this;
    inline(template, _.extend({
        handlers: function (source) {
            if (source.type == 'js') {
                //compile JS file
                var outputOptions = {
                    filename: self.generateUniqueFileName(source.filepath)
                };
                var childJSCompiler = ChildCompiler.create(source.filepath, compiler.context, outputOptions, compilation);
                self._assetMap[source.filepath] = outputOptions.filename;
                compiler.plugin(config.COMPILE_COMPLETE_EVENT, childJSCompiler.runAsChild);
            }
        }
    }, self.options, {
        compress: false
    }));
    //run callback until the all childCompiler is finished
    compiler.applyPluginsParallel(config.COMPILE_COMPLETE_EVENT, callback);
};

/**
 * compute and return the hash of a string
 * @param content
 * @returns {*}
 */
InlineResourcePlugin.prototype.computeHash = function (content) {
    var md5 = crypto.createHash('md5');
    md5.update(content);
    return md5.digest('hex');
};

/**
 * detect the content of embed file has changed or not.
 * @param compilation
 */
InlineResourcePlugin.prototype.detectChange = function (compilation) {
    var self = this, flag = false;
    Object.keys(compilation.assets).forEach(function (template) {
        if (self.options.test.test(template)) {
            //compare hash value
            if (self._cacheTemplateFile[template].contentHash !== compilation.assets[template].contentHash) {
                self._cacheTemplateFile[template].contentHash = compilation.assets[template].contentHash;
                flag = true;
            }
        }
    });
    return flag;
};

InlineResourcePlugin.prototype.apply = function (compiler) {
    var self = this;
    compiler.plugin('make', function (compilation, callback) {
        self._assetMap = {};
        if (self.options.filename) {
            //compile html
            var fullTemplate = self.initLoader(self.options.template, compiler);
            var outputOptions = {
                filename: self.options.filename
            };
            var childHTMLCompiler = ChildCompiler.create(fullTemplate, compiler.context, outputOptions, compilation, true);
            childHTMLCompiler.runAsChild();
        }

        if (self.options.compile) {
            self.findAndCompileInlineFile(self.options.template, compiler, compilation, callback);
        } else {
            callback();
        }
    });

    compiler.plugin('emit', function (compilation, callback) {
        compilation.assets = _.extend({}, self._cacheTemplateFile, compilation.assets);
        Object.keys(compilation.assets).forEach(function (template) {
            if (self.options.test.test(template)) {
                var asset = compilation.assets[template];
                var buildContent = asset.source();
                if (self.options.filename) {
                    //if the template is generated by other plugins
                    //don't evaluate the compile result
                    buildContent = self.getTemplateCompileResult(buildContent);
                    //only watch template file which are generated by us
                    compilation.fileDependencies.push(path.resolve(self.options.template));
                }
                if (!asset.isCache) {
                    self._cacheTemplateFile[template] = (function (content) {
                        return {
                            source: function () {
                                return content;
                            },
                            size: function () {
                                return content.length;
                            },
                            contentHash: '',
                            isCache: true
                        };
                    })(buildContent);
                }
                buildContent = inline(buildContent, _.extend({
                    handlers: function (source) {
                        if (source.type == 'js') {
                            var key = self._assetMap[source.filepath],
                                asset = compilation.assets[key];
                            source.fileContent = asset ? asset.source() : source.fileContent;
                            //don't generate the embed file
                            asset && delete compilation.assets[key];
                        }
                        //watch the embed file
                        compilation.fileDependencies.push(source.filepath);
                    }
                }, self.options));
                compilation.assets[template] = {
                    source: function () {
                        return buildContent;
                    },
                    size: function () {
                        return buildContent.length;
                    },
                    contentHash: self.computeHash(buildContent)
                };
            }
        });
        if (self.detectChange(compilation)) {
            //if content has been changed
            //just let other plugins know that we have already recompiled file
            compiler.applyPlugins(config.AFTER_EMIT_EVENT);
        }
        callback && callback();
    });
};

module.exports = InlineResourcePlugin;