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
    this.options.list = !isArray(this.options.list) ? [this.options.list] : this.options.list;
    this.regx = options.regx || /\.(html)|(ejs)$/i;
    this.compilation = null;

    this.dependency = {};
    this.prevTimestamps = {};
    this.startTime = Date.now();
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

InlineResourcePlugin.prototype.testDependencyChanged = function () {
    return this.findChangedFiles().some(function (file) {
        return !!this.dependency[file];
    }.bind(this));
};

InlineResourcePlugin.prototype.findChangedFiles = function () {
    var compilation = this.compilation;
    var changedFiles = Object.keys(compilation.fileTimestamps)
        .filter(function (watchfile) {
            return (this.prevTimestamps[watchfile] || this.startTime) < (compilation.fileTimestamps[watchfile] || Infinity);
        }.bind(this));
    this.prevTimestamps = compilation.fileTimestamps;
    return changedFiles;
};

InlineResourcePlugin.prototype.dealWithFile = function (file) {
    log('+ assets: ' + file);
    var assets = this.compilation.assets,
        content = assets[file].source();
    log('+ assets: ' + file);
    content = inline(content, Object.assign(self.options, {
        handlers: function (source) {
            self.dependency[source.filepath] = file;
            self.compilation.fileDependencies.push(source.filepath);
        }
    }));
    self.generateAssets(file, content);
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
    var file, assets = this.compilation.assets;
    if (assets.length) {
        for (file in assets) {
            if (self.regx.test(file)) {
                this.dealWithFile(file);
            }
        }
    } else {

    }
};

InlineResourcePlugin.prototype.doInline = function (task, callback) {
    log('start inline resource:');
    task.apply(this);
    log('finish inline resource:');
    callback && callback();
};

InlineResourcePlugin.prototype.apply = function (compiler) {
    //set global debug flag
    debug = this.options.debug;
    if (this.options.list.length) {
        //if list option is passed
        //inline task will start during the done lifecycle
        compiler.plugin('done', function () {
            this.doInline(this.inlineByListOpt);
        }.bind(this));
    } else {
        compiler.plugin('emit', function (compilation, callback) {
            this.compilation = compilation;
            this.doInline(this.inlineByAssetsData, callback);
        }.bind(this));
    }
};

module.exports = InlineResourcePlugin;