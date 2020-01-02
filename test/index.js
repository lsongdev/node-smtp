const smtp = require('..');
const test = require('./test');
const assert = require('assert');

test('smtp#send', async () => {
  const [ res ] = await smtp.send({
    from: 'mail@lsong.org',
    to: 'hi@lsong.org',
    subject: 'hello world',
    body: 'This is a test message, do not reply.'
  });
  assert.equal(res.code, 221, res.msg);
});