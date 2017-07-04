<a href="https://www.npmjs.com/package/inline-resource-plugin">
    <img src="https://img.shields.io/npm/v/inline-resource-plugin.svg?style=flat" alt="NPM version">
</a>

# inline-resource-plugin
> A webpack plugin to embed css/js resource in the html with inline-source module.

## Install

```bash
$ npm install inline-resource-plugin --save-dev
```

## example

```html
<!-- ./build/hello.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>test</title>
    <link href="inline.css" inline>
    <script src="inline.js" inline></script>
</head>
<body>
<div class="container">
    <h1>hello world!</h1>
</div>
</body>
</html>
```

```js
/* ./src/inline.js */
function Person() {
}

Person.prototype.sayHello = function () {
    var word = 'hello';
    console.log(word);
};
```

```css
/* ./src/inline.css */
.container {
    border: 1px solid #000000;
}
```

Output:
```html
<!-- ./build/hello.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>test</title>
    <style>.container{border:1px solid #000}</style>
    <script>function Person(){}Person.prototype.sayHello=function(){var o="hello";console.log(o)};</script>
</head>
<body>
<div class="container">
    <h1>hello world!</h1>
</div>
</body>
</html>
```

## Usage
Available `options` include:
- `compile`: If the file that you want to embed need to be compiled(such as ES6 or require), you can pass 'true'.(default `false`)
- `compress`: enable/disable compression.(default `true`)
- `rootpath`: path used for resolving inlineable paths.
- `test`: the file which you want to execute embed task.If you have multiple templates,you'd better use regx to specify the template that you want to execute inline task.(non-required, default `/(\.html$)|(\.ejs$)/`)
- `template`: the path of your template file.This option is used for finding out the files which need to embed into the template.(required)
- `filename`: If you decide to use the other plugins such as HtmlWebpackPlugin to generate template file,you can ignore this option.Or you can pass the path and we will generate template file by ourselves.(non-required)

```javascript
//webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineResourcePlugin = require('inline-resource-plugin');

module.exports = {
    entry: {
        hello: './src/hello'
    },
    output: {
        path: './build',
        publicPath: '/inline-resource-plugin/example/build/',
        filename: '[name].js'
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'hello_result.html',
            template: './src/hello.html',
            inject: 'body'
        }),
        new InlineResourcePlugin({ // this InlineResourcePlugin is work with HtmlWebpackPlugin(As it has supplied 'test' option)
            compile: true,
            compress: true,
            rootpath: './src',
            template: './src/hello.html', // Just keep the same with the 'template' option of HtmlWebpackPlugin
            test: /^hello_result\.html$/ // A Regx that match the 'filename' option of HtmlWebpackPlugin
        }),
        new InlineResourcePlugin({ // this InlineResourcePlugin is work alone(As it has supplied 'filename' option)
            compile: false,
            compress: true,
            rootpath: './src',
            template: './src/world.html',
            filename: 'world_result.html' // If you use 'filename' option, you don't need to supply 'test' option
        })
    ]
};
```
note: You can find this demo in the example directory.

## Events
Available event include:
- `inline-resource-plugin-html-after-emit`: This event represent that the compile and embed task has been completed.You may need it when you use this plugin with hot module replacement feature.

example:
```javascript
compiler.plugin('inline-resource-plugin-html-after-emit', function (data, callback) {
  hotMiddleware.publish({action: 'reload'});
  callback();
});
```
