/**
 * compiler
 */
var _ = require('lodash');
var config = require('./config');
var NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
var NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
var LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin');
var LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
var SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');

module.exports = {
    create: function (template, context, outputOptions, compilation, isTemplate) {
        var compilerName = this.getCompilerName(template);
        var childCompiler = compilation.createChildCompiler(compilerName, outputOptions);
        childCompiler.context = context;

        childCompiler.apply(
            new NodeTargetPlugin(),
            new SingleEntryPlugin(context, template),
            new LoaderTargetPlugin('node')
        );

        if (isTemplate) {
            childCompiler.apply(
                new NodeTemplatePlugin(outputOptions)
                //,new LibraryTemplatePlugin(config.variableName, 'var')
            );
        }

        childCompiler.plugin('compilation', function (compilation) {
            if (compilation.cache) {
                if (!compilation.cache[compilerName]) {
                    compilation.cache[compilerName] = {};
                }
                compilation.cache = compilation.cache[compilerName];
            }
        });

        //save the original runAsChild method and export a new runAsChild method
        childCompiler._runAsChildOriginal = childCompiler.runAsChild;
        childCompiler.runAsChild = function (callback) {
            childCompiler._runAsChildOriginal(function (error, entries, childCompilation) {
                var outputName = outputOptions.filename;
                if (compilation.assets[outputName] && childCompilation.assets[outputName]) {
                    delete childCompilation.assets[outputName];
                }
                callback && callback();
            });
        };

        return childCompiler;
    },
    getCompilerName: function (template) {
        return config.PLUGIN_NAME + ' is compiling \'' + template + '\'';
    }
};
