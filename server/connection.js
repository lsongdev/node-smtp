const Message = require('mime2');
const EventEmitter = require('events');
const createParser = require('../parser');

const createReader = done => {
  let buffer = '';
  const e = (c, dot) =>
    `${c}`.split(Message.CRLF).some(x => x === dot)
  return chunk => {
    buffer += chunk;
    e(buffer, '.') && done(buffer);
  }
}

class Connection extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.socket.on('error', err => {
      this.emit('error', err);
    });
    this.parser = createParser(line => {
      const m = line.match(/^(\S+)(?:\s+(.*))?$/);
      if (!m) return console.warn('Invalid message', line);
      const cmd = m[1].toUpperCase();
      const parameter = m[2];
      // console.log(cmd, parameter);
      this.exec(cmd, parameter);
      this.emit(cmd, parameter);
      this.emit('command', cmd, parameter);
    });
    this.message = {};
    this.socket.on('data', this.parser);
  }
  write(buffer) {
    this.socket.write(buffer);
    return this;
  }
  response(code, message) {
    return this.write(`${code} ${message}\r\n`);
  }
  close() {
    this.socket.end();
    return this;
  }
  exec(cmd, parameter) {
    switch (cmd) {
      case 'HELO':
      case 'EHLO':
        this.message = {};
        this.message.hostname = parameter;
        this.response(250, 'OK');
        break;
      case 'MAIL':
        const i = parameter.indexOf(':');
        this.message.from = Message.parseAddress(
          parameter.substr(i + 1));
        this.response(250, 'OK');
        break;
      case 'RCPT':
        const j = parameter.indexOf(':');
        (this.message['recipients'] ||
          (this.message['recipients'] = [])).push(
            Message.parseAddress(parameter.substr(j + 1)));
        this.response(250, 'OK');
        break;
      case 'DATA':
        const reader = createReader(content => {
          // console.log(content);
          this.socket.on('data', this.parser);
          this.socket.removeListener('data', reader);
          const size = Buffer.byteLength(content);
          this.response(250, `OK ${size} bytes received`);
          this.message.content = Message.parse(content);
          this.emit('message', this.message);
        });
        this.socket.on('data', reader);
        this.socket.removeListener('data', this.parser);
        this.response(354, 'start input end with . (dot)');
        break;
      case 'QUIT':
        this.response(221, 'Bye');
        this.close();
        break;
      default:
        break;
    }
  }
}

module.exports = Connection;