## smtp2

> simple smtp client and server for node.js

[![smtp2](https://img.shields.io/npm/v/smtp2.svg)](https://npmjs.org/smtp2)
[![Build Status](https://travis-ci.org/song940/smtp2.svg?branch=master)](https://travis-ci.org/song940/smtp2)

### Installation

```bash
$ npm install smtp2
```

### Example

smtp client:

```js
smtp.send({
  from: 'mail@lsong.org',
  to: 'hi@lsong.org',
  subject: 'hello world',
  body: 'This is a test message, do not reply.'
}).then(res => console.log(res));
```

smtp server:

```js
const smtp = require('smtp2');

const server = smtp.createServer();

server.on('client', client => {
  console.log('Client connected');
  client.on('QUIT', () => {
    console.log('Client disconnect');
  });
});

server.on('message', message => {
  console.log('Incoming Message:', message);
});

server.listen(2525);
```

### Contributing
- Fork this Repo first
- Clone your Repo
- Install dependencies by `$ npm install`
- Checkout a feature branch
- Feel free to add your features
- Make sure your features are fully tested
- Publish your local branch, Open a pull request
- Enjoy hacking <3

### MIT

This work is licensed under the [MIT license](./LICENSE).

---