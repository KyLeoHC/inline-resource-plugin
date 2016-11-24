'use strict';

var inline = require('inline-source').sync,
    colors = require("colors"),
    glob = require('glob'),
    path = require('path'),
    fs = require('fs');
var vm = require('vm');
var _ = require('lodash');
var NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
var NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
var LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin');
var LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
var SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');
var debug = false;

var log = function (info) {
    //debug && console.log(info.blue);
};

function InlineResourcePlugin(options) {
    this.options = options || {};
    this.options.list = this.options.list || [];
    this.options.list = !Array.isArray(this.options.list) ? [this.options.list] : this.options.list;
    this.include = options.include || /\.html$|\.ejs$/i;
    this.compilation = null;

    this.dependency = {};
    this.cacheFile = {};
    this.prevTimestamps = {};
    this.startTime = Date.now();
}


var target = './src/hello.html';
InlineResourcePlugin.prototype.apply = function (compiler) {
    var self = this;
    //set global debug flag
    debug = true;
    compiler.plugin('make', function (compilation, callback) {
        var outputOptions = {
            filename: 'compile.html',
            publicPath: compilation.outputOptions.publicPath
        };
        var childCompiler = compilation.createChildCompiler('inline-resource-plugin', outputOptions);
        childCompiler.context = compiler.context;
        childCompiler.apply(
            new NodeTemplatePlugin(outputOptions),
            new NodeTargetPlugin(),
            new LibraryTemplatePlugin('INLINE_RESOURCE_PLUGIN_RESULT', 'var'),
            new SingleEntryPlugin(this.context, 'raw-loader!' + target),
            new LoaderTargetPlugin('node')
        );
        childCompiler.runAsChild(function (err, entries, childCompilation) {
        });
        compilation.plugin('seal', function () {
            console.log(Object.keys(compilation.assets));
            //console.log(compilation.assets['compile.html'].source());
            evaluateCompilationResult(compilation.assets['compile.html'].source());
            callback && callback();
        });
        callback();
    });
};

function evaluateCompilationResult(source) {
    source = source.replace('var INLINE_RESOURCE_PLUGIN_RESULT =', '');
    var template = target;
    var vmContext = vm.createContext(_.extend({HTML_WEBPACK_PLUGIN: true, require: require}, global));
    var vmScript = new vm.Script(source, {filename: template});
    // Evaluate code and cast to string
    var newSource = vmScript.runInContext(vmContext);
    console.log(newSource);
}

module.exports = InlineResourcePlugin;