'use strict';

var inline = require('inline-source').sync,
    colors = require("colors"),
    glob = require('glob'),
    path = require('path'),
    fs = require('fs');
var debug = false;

var log = function (info) {
    debug && console.log(info.blue);
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

/**
 * look for files which has changed
 * @returns {Array.<*>}
 */
InlineResourcePlugin.prototype.findChangedFiles = function () {
    var compilation = this.compilation;
    var changedFiles = Object.keys(compilation.fileTimestamps)
        .filter(function (watchFile) {
            return (this.prevTimestamps[watchFile] || this.startTime) < (compilation.fileTimestamps[watchFile] || Infinity);
        }.bind(this));
    this.prevTimestamps = compilation.fileTimestamps;
    return changedFiles;
};

InlineResourcePlugin.prototype.dealWithFile = function (file) {
    var assets = this.compilation.assets,
        fileObj = assets[file] ? assets[file] : this.cacheFile[file],
        content = '', self = this;
    if (!fileObj) {
        //ignore the non-existent path
        return;
    } else {
        content = fileObj.source();
    }
    log('+ assets: ' + file);

    //if this is a new file or rebuild by the other plugins(such as HtmlWebpackPlugin)
    //add it into cache
    if (!fileObj.isCache) {
        self.cacheFile[file] = (function (content) {
            return {
                source: function () {
                    return content;
                },
                isCache: true
            };
        })(content);
    }

    //do inline task
    content = inline(content, Object.assign(self.options, {
        handlers: function (source) {
            self.dependency[source.filepath] = file;
        }
    }));

    //push inline file into the compilation.fileDependencies array to add them to the watch
    Object.keys(self.dependency).forEach(function (filePath) {
        self.compilation.fileDependencies.push(filePath);
    });

    //add it into compilation.assets
    //generate file by webpack
    self.compilation.assets[path.parse(file).base] = {
        source: function () {
            return content;
        },
        size: function () {
            return content.length;
        }
    };
};

/**
 * read file from compilation.assets
 */
InlineResourcePlugin.prototype.inlineByAssetsData = function () {
    var assets = this.compilation.assets,
        assetsArray = Object.keys(assets),
        self = this;
    assetsArray = assetsArray.concat(self.findChangedFiles());
    assetsArray.forEach(function (file) {
        file = self.dependency[file] ? self.dependency[file] : file;
        self.include.test(file) && self.dealWithFile(file);
    });
};

/**
 * read file from local file system
 */
InlineResourcePlugin.prototype.inlineByListOpt = function () {
    var options = this.options, self = this, files;
    options.list.forEach(function (pattern) {
        files = glob.sync(pattern) || [];
        log('+ pattern[' + pattern + '] : ' + files.join(' '));
        files.forEach(function (file) {
            self.cacheFile[file] = (function (content) {
                return {
                    source: function () {
                        return content;
                    },
                    isCache: true
                };
            })(fs.readFileSync(file, {encoding: 'utf-8'}));
            self.dealWithFile(file);
        });
    });
};

/**
 * execute task
 * @param task
 * @param callback
 */
InlineResourcePlugin.prototype.doInline = function (task, callback) {
    log('start inline resource:');
    task.apply(this);
    log('finish inline resource:');
    callback && callback();
};

InlineResourcePlugin.prototype.apply = function (compiler) {
    var self = this;
    //set global debug flag
    debug = true;
    compiler.plugin('emit', function (compilation, callback) {
        self.compilation = compilation;
        if (self.options.list.length) {
            self.doInline(self.inlineByListOpt, callback);
        } else {
            self.doInline(self.inlineByAssetsData, callback);
        }
    });
};

module.exports = InlineResourcePlugin;