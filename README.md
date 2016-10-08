# inline-resource-plugin
> A webpack plugin to make css/js resource inline in the html with inline-source.

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

```javascript
//webpack.config.js
var HtmlWebpackPlugin = require('html-webpack-plugin');
var InlineResource = require('inline-resource-plugin');

module.exports = {
    entry: {
        hello: './src/hello.js'
    },
    output: {
        path: './build',
        filename: '[name].js'
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'hello.html',
            template: './src/hello.html',
            inject: 'body'
        }),
        new InlineResource({
            compress: true,
            rootpath: './src',
            //if you have only one html file,this list option can also be a character string.such as
            //list: 'hello.html'
            //it can also be a file path string or file path array.such as
            //list: ['./src/html/hello.html']
            list: ['./build/hello.html']
        })
    ]
};
```

note: You can find this demo in the example directory.