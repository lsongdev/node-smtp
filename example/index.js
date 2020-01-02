const smtp = require('..');

smtp.send({
  from: 'mail@lsong.org',
  to: 'hi@lsong.org',
  subject: 'hello world',
  body: 'This is a test message, do not reply.'
}, {
  // tls: true,
  // port: 2525,
  // host: 'localhost'
}).then(res => {
  console.log(res);
}, err => {
  console.error('smtp send error:', err);
});
