function Person() {
}

Person.prototype.sayHello = function () {
    var word = 'hello';
    console.log(word);
};

new Person().sayHello();