'use strict';

var inline = require('inline-source').sync,
    colors = require("colors"),
    glob = require("glob"),
    fs = require('fs');
var debug = false;

var log = function (info) {
    debug && console.log(info.blue);
};

function InlineResourcePlugin(options) {
    this.options = options || {};
    this.options.list = this.options.list || [];
    this.options.list = !Array.isArray(this.options.list) ? [this.options.list] : this.options.list;
    this.regx = options.regx || /\.(html)|(ejs)$/i;
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
        .filter(function (watchfile) {
            return (this.prevTimestamps[watchfile] || this.startTime) < (compilation.fileTimestamps[watchfile] || Infinity);
        }.bind(this));
    this.prevTimestamps = compilation.fileTimestamps;
    return changedFiles;
};

InlineResourcePlugin.prototype.dealWithFile = function (file) {
    var assets = this.compilation.assets,
        content = assets[file] ? assets[file].source() : this.cacheFile[file].source(),
        self = this;
    log('+ assets: ' + file);

    //if this is a new file
    //add it into cache
    if (!self.cacheFile[file]) {
        self.cacheFile[file] = (function (content) {
            return {
                source: function () {
                    return content;
                }
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
    self.compilation.assets[file] = {
        source: function () {
            return content;
        },
        size: function () {
            return content.length;
        }
    };
};

InlineResourcePlugin.prototype.inlineByAssetsData = function () {
    var assets = this.compilation.assets,
        assetsArray = Object.keys(assets),
        self = this;
    assetsArray = assetsArray.concat(self.findChangedFiles());
    assetsArray.forEach(function (file) {
        file = self.dependency[file] ? self.dependency[file] : file;
        self.regx.test(file) && self.dealWithFile(file);
    });
};

InlineResourcePlugin.prototype.inlineByListOpt = function () {
    var options = this.options, files, content;
    options.list.forEach(function (pattern) {
        files = glob.sync(pattern) || [];
        log('+ pattern[' + pattern + '] : ' + files.join(' '));
        files.forEach(function (file) {
            content = inline(file, options);
            fs.writeFileSync(file, content);
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
    debug = this.options.debug;
    if (this.options.list.length) {
        //if list option is passed
        //inline task will start during the done lifecycle
        //And read file without webpack
        compiler.plugin('done', function () {
            self.doInline(self.inlineByListOpt);
        });
    } else {
        //read file in the compilation assets
        //it is used for working with the other plugins
        //such as HtmlWebpackPlugin
        compiler.plugin('emit', function (compilation, callback) {
            self.compilation = compilation;
            self.doInline(self.inlineByAssetsData, callback);
        });
    }
};

module.exports = InlineResourcePlugin;