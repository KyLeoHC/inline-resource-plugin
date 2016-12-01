'use strict';

var inline = require('inline-source').sync;
var vm = require('vm');
var _ = require('lodash');
var path = require('path');
var ChildCompiler = require('./lib/childCompiler');
var config = require('./lib/config');
var count = 0;

function InlineResourcePlugin(options) {
    this._templateLoader = null;
    this._assetMap = {};
    this._nameMap = {};
    this._cacheTemplateFile = {};
    this._cacheEmbedFile = {};
    this.options = _.extend({
        compress: false,
        include: /(.html$)|(.ejs$)/
    }, options);
}

InlineResourcePlugin.prototype.apply = function (compiler) {
    var self = this;
    compiler.plugin('make', function (compilation, callback) {
        if (self.options.filename) {
            var fullTemplate = self.initLoader(self.options.template, compiler);
            var outputOptions = {
                filename: self.options.filename
            };
            var childHTMLCompiler = ChildCompiler.create(fullTemplate, compiler.context, outputOptions, compilation, true);
            childHTMLCompiler.runAsChild();
        }
        self.findAndCompileInlineFile(self.options.template, compiler, compilation);
        callback && callback();
    });

    compiler.plugin('emit', function (compilation, callback) {
        console.log(Object.keys(compilation.assets));
        Object.keys(compilation.assets).forEach(function (template) {
            if (self.options.include.test(template)) {
                var asset = compilation.assets[template];
                var buildContent = asset.source();
                if (self.options.filename) {
                    //if the template is generated by other plugins
                    //don't evaluate the compile result
                    buildContent = self.getTemplateCompileResult(buildContent);
                    //only watch template file which are generated by us
                    compilation.fileDependencies.push(path.resolve(self.options.template));
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
                        //watch the embed content
                        compilation.fileDependencies.push(source.filepath);
                    }
                }, self.options));
                compilation.assets[template] = {
                    source: function () {
                        return buildContent;
                    },
                    size: function () {
                        return buildContent.length;
                    }
                };
            }
        });
        callback && callback();
    });
};

InlineResourcePlugin.prototype.findAndCompileInlineFile = function (template, compiler, compilation) {
    var self = this;
    inline(template, _.extend({
        handlers: function (source) {
            if (source.type == 'js') {
                var outputOptions = {
                    filename: self.generateUniqueFileName(source.filepath)
                };
                var childJSCompiler = ChildCompiler.create(source.filepath, compiler.context, outputOptions, compilation);
                self._assetMap[source.filepath] = outputOptions.filename;
                childJSCompiler.runAsChild();
            }
        }
    }, self.options, {
        compress: false
    }));
};

InlineResourcePlugin.prototype.generateUniqueFileName = function (path) {
    if (!this._nameMap[path]) {
        this._nameMap[path] = 'inline_temp_{{count}}.js'.replace('{{count}}', count++);
    }
    return this._nameMap[path];
};

InlineResourcePlugin.prototype.initLoader = function (template, compiler) {
    var moduleConfig = _.extend({preLoaders: [], loaders: [], postLoaders: []}, compiler.options.module);
    var loaders = moduleConfig.preLoaders.concat(moduleConfig.loaders).concat(moduleConfig.postLoaders);
    loaders.forEach(function (loader) {
        if (loader.test.test(template)) {
            //if there exist a load for evaluating template
            //don't need our loader
            this._templateLoader = '';
        }
    }.bind(this));
    this._templateLoader = this._templateLoader === null ? 'raw-loader!' : this._templateLoader;
    return this._templateLoader + template;
};

InlineResourcePlugin.prototype.getTemplateCompileResult = function (source) {
    var vmContext = vm.createContext(global);
    var vmScript = new vm.Script(source, {filename: this.options.template});
    return vmScript.runInContext(vmContext);
};

module.exports = InlineResourcePlugin;