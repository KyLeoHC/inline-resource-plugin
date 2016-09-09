# inline-resource-plugin
> A webpack plugin to make css/js resource inline in the html with inline-source.

## example

```html
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
function Person() {
}

Person.prototype.sayHello = function () {
    var word = 'hello';
    console.log(word);
};
```

```css
.container {
    border: 1px solid #000000;
}
```

Output:
```html
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
        filename: 'test.js'
    },
    plugins: [
        new InlineResource({
            compress: true,
            list: ['hello.html']
        })
    ]
};
```
