import http from 'node:http';

// Simple Node server that returns the current unix timestamp as a plaintext integer

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const timestamp = Math.floor(Date.now() / 1000);
    process.stderr.write(`Incoming request: ${timestamp}\n`);
    const output = `${timestamp}`;
    res.writeHead(200, {
      'content-type': 'text/plain',
      'content-length': output.length,
    });
    res.end(output);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
