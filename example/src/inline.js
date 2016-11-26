function Person() {
}

Person.prototype.sayHello = function () {
    var word = 'hello world!!!';
    console.log(word);
};

new Person().sayHello();