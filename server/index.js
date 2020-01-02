const tcp = require('net');
const Connection = require('./connection');
/**
 * SMTP Server
 * @docs https://tools.ietf.org/html/rfc5321
 */
class SMTPServer extends tcp.Server {
  constructor(options) {
    super(options, socket => {
      const client = new Connection(socket);
      this.emit('client', client);
    });
    this.name = 'Mail Server';
    this.on('client', client => {
      client.response(220, this.name);
      client.on('message', message => {
        this.emit('message', message, client);
      });
    });
    return Object.assign(this, options);
  }
}

module.exports = SMTPServer;