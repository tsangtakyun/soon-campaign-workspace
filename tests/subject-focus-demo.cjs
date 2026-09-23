const http=require('node:http'),fs=require('node:fs');
http.createServer((req,res)=>{
  if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(process.argv[2]));return;}
  if(req.url==='/photo.png'){res.setHeader('content-type','image/png');res.end(fs.readFileSync('public/templates/clear-magazine-carousel-v3/longform-bear-clean.png'));return;}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<html><head><title>Subject focus isolated test</title></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
}).listen(4190,'127.0.0.1');
