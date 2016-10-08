'use strict';

var inline = require('inline-source'),
    fs = require('fs');

var isArray = function (obj) {
    return ({}).toString.call(obj) === '[object Array]';
};

function InlineResourcePlugin(options) {
    this.options = options || {};
    this.options.list = this.options.list || [];
}

InlineResourcePlugin.prototype.doInline = function (options) {
    if (!isArray(options.list)) {
        options.list = [options.list];
    }
    options.list.forEach(function (path) {
        inline(path, options, function (error, html) {
            if (error) {
                throw error;
            }
            fs.writeFile(path, html);
        });
    });
};

InlineResourcePlugin.prototype.apply = function (compiler) {
    var doInline = this.doInline,
        options = this.options;
    //only execute after all things are done
    compiler.plugin('done', function () {
        doInline(options);
    });
};

module.exports = InlineResourcePlugin;