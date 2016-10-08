# inline-resource-plugin
> A webpack plugin to make css/js resource inline in the html with inline-source.

## Install

```bash
$ npm install inline-resource-plugin --save-dev
```

## example

```html
<!-- hello.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>test</title>
    <link href="hello.css" inline>
    <script src="hello.js" inline></script>
</head>
<body>
<div class="container">
    <h1>hello world!</h1>
</div>
</body>
</html>
```

```js
/* hello.js */
function Person() {
}

Person.prototype.sayHello = function () {
    var word = 'hello';
    console.log(word);
};
```

```css
/* hello.css */
.container {
    border: 1px solid #000000;
}
```

Output:
```html
<!-- hello.html -->
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
var InlineResource = require('inline-resource-plugin');

module.exports = {
    entry: {
        hello: './hello.js'
    },
    output: {
        path: './build',
        filename: '[name].js'
    },
    plugins: [
        new InlineResource({
            compress: true,
            //if you have only one html file,this list option can also be a character string.such as
            //list: 'hello.html'
            //it can also be a file path string or file path array.such as
            //list: ['./src/html/hello.html']
            list: ['hello.html']
        })
    ]
};
```