/**
 * compiler
 */
var _ = require('lodash');
var config = require('config');
var NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
var NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
var LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin');
var LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
var SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');

module.exports = {
    create: function (template, context, outputOptions, compilation) {
        var childCompiler = compilation.createChildCompiler(config.pluginName, outputOptions);
        var compilerName = this.getCompilerName(template);
        childCompiler.context = context;
        childCompiler.apply(
            new NodeTemplatePlugin(outputOptions),
            new NodeTargetPlugin(),
            new LibraryTemplatePlugin(config.variableName, 'var'),
            new SingleEntryPlugin(this.context, template),
            new LoaderTargetPlugin('node')
        );

        childCompiler.plugin('compilation', function (compilation) {
            if (compilation.cache) {
                if (!compilation.cache[compilerName]) {
                    compilation.cache[compilerName] = {};
                }
                compilation.cache = compilation.cache[compilerName];
            }
        });

        return {
            runAsChild: function (callback) {
                childCompiler.runAsChild(function (err, entries, childCompilation) {
                    var outputName = outputOptions.filename;
                    if (compilation.assets[outputName] && childCompilation.assets[outputName]) {
                        delete childCompilation.assets[outputName];
                    }
                    callback && callback();
                });
            }
        }
    },
    getCompilerName: function (template) {
        return config.pluginName + ' is compiling \'' + template + '\'';
    }
};
