const dns = require('dns');
const net = require('net');
const tls = require('tls');
const util = require('util');
const assert = require('assert');
const Message = require('mime2');
const EventEmitter = require('events');
const createParser = require('./parser');

const debug = util.debuglog('smtp2');

const createReader = fn => {
  const r1 = /^(\d+)-(.+)$/;
  const r2 = /^(\d+)\s(.+)$/;
  let results = [];
  return createParser(line => {
    if (r1.test(line)) {
      const m = line.match(r1);
      results.push(m[2]);
    }
    if (r2.test(line)) {
      const m = line.match(r2);
      results.push(m[2]);
      fn(m[1], results);
      results = [];
    }
  });
}

class SMTP extends EventEmitter {
  constructor(options) {
    super();
    Object.assign(this, {
      port: 25
    }, options);
  }
  resolve(domain) {
    const { host } = this;
    if (host) return Promise.resolve([host]);
    const resolveMx = util.promisify(dns.resolveMx);
    return resolveMx(domain)
      .catch(() => [])
      .then(records => {
        debug('MX records:', records);
        return records
          .sort((a, b) => a.priority - b.priority)
          .map(mx => mx.exchange)
          .concat([domain]);
      });
  }
  open(host, port) {
    port = port || this.port;
    if (~host.indexOf(':')) {
      [host, port] = host.split(':');
    }
    return new Promise((resolve, reject) => {
      const tcp = this.tls ? tls : net;
      const socket = tcp.connect(port, host, () => resolve(socket));
      socket.once('error', reject);
    });
  }
  connect(domain) {
    const tryConnect = async hosts => {
      for (const host of hosts) {
        try {
          const socket = await this.open(host);
          debug(`MX connection created: ${host}`);
          return socket;
        } catch (e) {
          debug(`Error on connectMx for: ${host}`, e);
        }
      }
      throw new Error('can not connect to any SMTP server');
    };
    return this
      .resolve(domain)
      .then(tryConnect);
  }
  post(host, from, recipients, body) {
    const expect = (code, res) => {
      assert.equal(res.code, code, res.msg.join('\r\n'));
    };
    function* process(sock) {
      let res = yield;
      expect(220, res);
      if (/ESMTP/.test(res.msg[0])) {
        res = yield `EHLO ${from.host}`;
      } else {
        res = yield `HELO ${from.host}`;
      }
      expect(250, res);
      res = yield `MAIL FROM: <${from.address}>`;
      expect(250, res);
      for (const rcpt of recipients) {
        res = yield `RCPT TO: <${rcpt.address}>`;
        expect(250, res);
      }
      res = yield 'DATA';
      expect(354, res);
      debug('send:==>\n' + body);
      sock.write(`${body}\r\n\r\n`);
      res = yield '.';
      expect(250, res);
      res = yield 'QUIT';
      expect(221, res);
      return res;
    }
    return this
      .connect(host)
      .then(socket => new Promise((resolve, reject) => {
        const gen = process(socket);
        gen.next();
        const reader = createReader((code, msg) => {
          debug('->', code, msg);
          const { done, value } = gen.next({ code, msg });
          if (done) return resolve(value);
          if (value) {
            debug('send:', value);
            socket.write(`${value}\r\n`);
          }
        });
        socket.on('error', reject);
        socket.on('data', reader);
      }));
  }
  send(headers, body) {
    const recipients = [];
    const message = new Message(headers, body);
    if (message.to) recipients.push(message.to);
    if (message.cc) recipients.push(message.cc);
    if (message.bcc) recipients.push(message.bcc);
    const groupByHost = recipients.reduce((groupByHost, addr) => {
      (groupByHost[addr.host] ||
        (groupByHost[addr.host] = [])).push(addr);
      return groupByHost;
    }, {});
    return Promise.all(Object.keys(groupByHost).map(domain =>
      this.post(domain, message.from, groupByHost[domain], message.toString())));
  }
}

SMTP.send = ({ body, ...headers }, options) => {
  const smtp = new SMTP(options);
  return smtp.send(headers, body);
};

SMTP.Server = require('./server');
SMTP.createServer = (options, handler) => {
  return new SMTP.Server(options, handler);
};

module.exports = SMTP;
