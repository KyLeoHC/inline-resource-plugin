'use strict';

var inline = require('inline-source').sync;

var isArray = function (obj) {
    return ({}).toString.call(obj) === '[object Array]';
};
var getFileName = function (path) {
    var start = path.lastIndexOf('/');
    start = start > -1 ? start : path.lastIndexOf('\\');
    return path.substr(start + 1);
};

function InlineResourcePlugin(options) {
    this.options = options || {};
    this.options.list = this.options.list || [];
}

InlineResourcePlugin.prototype.doInline = function (options, compilation) {
    if (!isArray(options.list)) {
        options.list = [options.list];
    }
    options.list.forEach(function (path) {
        var html = inline(path, options),
            name = getFileName(path);
        compilation.assets[name] = {
            source: function () {
                return html;
            },
            size: function () {
                return html.length;
            }
        };
    });
};

InlineResourcePlugin.prototype.apply = function (compiler) {
    var doInline = this.doInline,
        options = this.options;
    compiler.plugin('emit', function (compilation, callback) {
        doInline(options, compilation);
        callback();
    });
};

module.exports = InlineResourcePlugin;