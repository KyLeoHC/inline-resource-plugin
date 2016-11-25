'use strict';

var inline = require('inline-source').sync;
var vm = require('vm');
var _ = require('lodash');
var ChildCompiler = require('./lib/childCompiler');
var config = require('./lib/config');

function InlineResourcePlugin(options) {
    this.options = _.extend({
        compress: false
    }, options);
}

InlineResourcePlugin.prototype.apply = function (compiler) {
    this.doInlineWithTemplate(compiler);
};

InlineResourcePlugin.prototype.doInlineWithTemplate = function (compiler) {
    var self = this;
    var fullTemplate = self.getFullTemplate(self.options.template);
    compiler.plugin('make', function (compilation, callback) {
        var outputOptions = {
            filename: self.options.filename
        };
        ChildCompiler
            .create(fullTemplate, compiler.context, outputOptions, compilation)
            .runAsChild();
        callback && callback();
    });

    compiler.plugin('emit', function (compilation, callback) {
        console.log(Object.keys(compilation.assets));
        callback && callback();
    });
};

InlineResourcePlugin.prototype.getFullTemplate = function (template) {
    return require.resolve('./lib/loader') + '!' + template;
};

InlineResourcePlugin.prototype.getCompilationTemplate = function (source) {
    source = source.replace('var ' + config.variableName + ' =', '');
    var template = target;
    var vmContext = vm.createContext(_.extend({HTML_WEBPACK_PLUGIN: true, require: require}, global));
    var vmScript = new vm.Script(source, {filename: template});
    // Evaluate code and cast to string
    var newSource = vmScript.runInContext(vmContext);
    return newSource;
};

module.exports = InlineResourcePlugin;