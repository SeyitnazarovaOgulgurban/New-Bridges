const http = require('http');
const fs = require('fs');
const path = require('path');

const START_PORT = 4173;
const DIST = path.join(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

function handler(req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(DIST, url === '/' ? 'index.html' : url);

  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end();
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST, 'index.html'), (err2, data2) => {
        if (err2) { res.writeHead(500); res.end(); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function tryListen(port) {
  const server = http.createServer(handler);
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log('  端口 ' + port + ' 已被占用，尝试 ' + (port + 1) + ' ...');
      tryListen(port + 1);
    } else {
      throw e;
    }
  });
  server.listen(port, () => {
    const url = 'http://localhost:' + port + '/';
    console.log('\n  ✓ 服务已启动: ' + url + '\n');
    console.log('  按 Ctrl+C 停止服务器\n');
    require('child_process').exec('start ' + url);
  });
}

tryListen(START_PORT);
