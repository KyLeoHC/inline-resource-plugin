function Person() {
}

Person.prototype.sayHello = function () {
    var word = 'hello world.';
    console.log(word);
    require('./compile')();
};

new Person().sayHello();