const smtp = require('..');

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