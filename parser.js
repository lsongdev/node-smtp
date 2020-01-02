
module.exports = fn => {
  let buffer = '', parts;
  return chunk => {
    buffer += chunk;
    parts = buffer.split('\r\n');
    buffer = parts.pop();
    parts.forEach(fn);
  }
};