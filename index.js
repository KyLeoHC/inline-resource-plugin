var fs = require('fs');

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

function InlineResource(list) {
    this.list = list;
}

InlineResource.prototype.apply = function (compiler) {
    var list = this.list;
    console.log(this.list);
    compiler.plugin('emit', function (compilation, callback) {
        // Create a header string for the generated file:
        var filelist = 'In this build:\n\n';

        // Loop through all compiled assets,
        // adding a new line item for each filename.
        for (var filename in compilation.assets) {
            filelist += ('- ' + filename + '\n');
        }

        inline(list, compilation);
        // Insert this list into the Webpack build as a new file asset:
        compilation.assets['filelist.md'] = {
            source: function () {
                return filelist;
            },
            size: function () {
                return filelist.length;
            }
        };


        callback();
    });
};

module.exports = InlineResource;