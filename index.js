'use strict';

var inline = require('inline-source'),
    colors = require("colors"),
    glob = require("glob"),
    fs = require('fs');
var debug = false;

var log = function (info) {
    debug && console.log(info.blue);
};

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
    log('start inline resource:');
    options.list.forEach(function (pattern) {
        var files = glob.sync(pattern) || [];
        log('+ pattern[' + pattern + '] : ' + files.join(' '));
        files.forEach(function (file) {
            inline(file, options, function (error, html) {
                if (error) {
                    throw error;
                }
                fs.writeFileSync(file, html);
            });
        });
    });
    log('finish inline resource:');
};

InlineResourcePlugin.prototype.apply = function (compiler) {
    var doInline = this.doInline,
        options = this.options;
    debug = options.debug;
    //only execute after all things are done
    compiler.plugin('done', function () {
        doInline(options);
    });
};

module.exports = InlineResourcePlugin;