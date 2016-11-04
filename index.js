'use strict';

var inline = require('inline-source').sync,
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
    this.regx = options.regx || /\.(html)|(ejs)$/i;
    this.compilation = null;
}

InlineResourcePlugin.prototype.generateAssets = function (file, content) {
    if (this.compilation) {
        this.compilation.assets[file] = {
            source: function () {
                return content;
            },
            size: function () {
                return content.length;
            }
        };
    }
};

InlineResourcePlugin.prototype.inlineByListOpt = function () {
    var options = this.options;
    options.list.forEach(function (pattern) {
        var files = glob.sync(pattern) || [];
        log('+ pattern[' + pattern + '] : ' + files.join(' '));
        files.forEach(function (file) {
            var content = inline(file, options);
            fs.writeFileSync(file, content);
        });
    });
};

InlineResourcePlugin.prototype.inlineByAssetsData = function () {
    var file, content, assets = this.compilation.assets, self = this;
    for (file in assets) {
        if (self.regx.test(file)) {
            log('+ assets: ' + file);
            content = assets[file].source();
            content = inline(content, self.options);
            self.generateAssets(file, content);
        }
    }
};

InlineResourcePlugin.prototype.doInline = function (compilation, callback) {
    if (!isArray(this.options.list)) {
        this.options.list = [this.options.list];
    }
    log('start inline resource:');
    if (this.options.list.length) {
        this.inlineByListOpt(compilation);
    } else {
        this.inlineByAssetsData();
    }
    log('finish inline resource:');
    callback();
};

InlineResourcePlugin.prototype.apply = function (compiler) {
    //set global debug flag
    debug = this.options.debug;
    compiler.plugin('emit', function (compilation, callback) {
        this.compilation = compilation;
        this.doInline(compilation, callback);
    }.bind(this));
};

module.exports = InlineResourcePlugin;