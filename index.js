'use strict';

var inline = require('inline-source').sync;
var vm = require('vm');
var _ = require('lodash');
var ChildCompiler = require('./lib/childCompiler');
var config = require('./lib/config');
var count = 0;

function InlineResourcePlugin(options) {
    this.templateLoader = null;
    this.assetMap = {};
    this.options = _.extend({
        compress: false
    }, options);
}

InlineResourcePlugin.prototype.apply = function (compiler) {
    this.doInlineWithTemplate(compiler);
};

InlineResourcePlugin.prototype.doInlineWithTemplate = function (compiler) {
    var self = this;
    var fullTemplate = self.initLoader(self.options.template, compiler);
    compiler.plugin('make', function (compilation, callback) {
        var outputOptions = {
            filename: self.options.filename
        };
        var childHTMLCompiler = ChildCompiler.create(fullTemplate, compiler.context, outputOptions, compilation);
        childHTMLCompiler.runAsChild();

        inline(self.options.template, {
            compress: false,
            rootpath: './src',
            handlers: function (source) {
                if (source.type == 'js') {
                    var outputOptions = {
                        filename: 'inline_{{count}}.js'.replace('{{count}}', count++)
                    };
                    var childJSCompiler = ChildCompiler.create(source.filepath, compiler.context, outputOptions, compilation);
                    childJSCompiler.runAsChild();
                    self.assetMap[source.filepath] = outputOptions.filename;
                }
            }
        });

        callback && callback();
    });

    compiler.plugin('emit', function (compilation, callback) {
        var asset = compilation.assets[self.options.filename];
        if (asset) {
            var buildContent = asset.source();
            buildContent = self.getTemplateCompileResult(buildContent);
            buildContent = inline(buildContent, {
                compress: false,
                rootpath: './src',
                handlers: function (source) {
                    if (source.type == 'js') {
                        var key = self.assetMap[source.filepath],
                            asset = compilation.assets[key];
                        source.fileContent = asset ? asset.source() : source.fileContent;
                        asset && delete compilation.assets[key];
                    }
                }
            });
            compilation.assets[self.options.filename] = {
                source: function () {
                    return buildContent;
                },
                size: function () {
                    return buildContent.length;
                }
            };
        }
        callback && callback();
    });
};

InlineResourcePlugin.prototype.initLoader = function (template, compiler) {
    var moduleConfig = _.extend({preLoaders: [], loaders: [], postLoaders: []}, compiler.options.module);
    var loaders = moduleConfig.preLoaders.concat(moduleConfig.loaders).concat(moduleConfig.postLoaders);
    loaders.forEach(function (loader) {
        if (loader.test.test(template)) {
            //if there exist a load for evaluate template
            //don't need our loader
            this.templateLoader = '';
        }
    }.bind(this));
    this.templateLoader = this.templateLoader === null ? 'raw-loader!' : this.templateLoader;
    return this.templateLoader + template;
};

InlineResourcePlugin.prototype.getTemplateCompileResult = function (source) {
    var vmContext = vm.createContext(global);
    var vmScript = new vm.Script(source, {filename: this.options.template});
    return vmScript.runInContext(vmContext);
};

module.exports = InlineResourcePlugin;