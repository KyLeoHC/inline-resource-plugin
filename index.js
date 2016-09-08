var fs = require('fs');
var inline = require('inline-source').sync;

var inlineRE = /<!--\s*inline\s*:\s*([\w/\.]+)\s*-->/;

function inline(list, compilation) {
    list = list || [];
    list.forEach(function (path) {
        var content = fs.readFileSync(path).toString('utf-8');
        content = content.replace(inlineRE, function (match, path) {
            var file = fs.readFileSync(path).toString('utf-8');
            file = '<script type="text/javascript">' + file + '</script>';
            return file;
        });

        compilation.assets['testTemplate.html'] = {
            source: function () {
                //此处返回的是文件内容
                return content;
            },
            size: function () {
                return content.length;
            }
        };
    });
}

var isArray = function (obj) {
    return ({}).toString.call(obj) === '[object Array]';
};

function InlineResourcePlugin(options) {
    this.options = options || {};
    this.options.list = this.options.list || [];
}

InlineResourcePlugin.prototype.doInline = function (compilation) {
    if (!isArray(this.options.list)) {
        this.options.list = [this.options.list];
    }
    this.options.list.forEach(function (path) {
        
    });
};

InlineResourcePlugin.prototype.apply = function (compiler) {
    var doInline = this.doInline;
    compiler.plugin('emit', function (compilation, callback) {
        doInline(compilation);
        callback();
    });
};

module.exports = InlineResourcePlugin;