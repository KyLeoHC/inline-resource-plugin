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

        //Insert this html file into the Webpack build as a new file asset
        //And webpack will help us generate the new file rather than use fs module to do this by us
        compilation.assets[name] = {
            source: function () {
                //This is the content of file
                return html;
            },
            size: function () {
                //This is the length or size of file
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