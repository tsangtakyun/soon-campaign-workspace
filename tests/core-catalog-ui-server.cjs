const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const bundle=fs.readFileSync('/private/tmp/soon-core-catalog-ui.js');
 http.createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','application/javascript');return res.end(bundle);}
  const file=path.resolve('public','.'+req.url);
  if(file.startsWith(path.resolve('public')+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return res.end(fs.readFileSync(file));
  res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html><title>Core catalog verification</title><body><div id="root"></div><script src="/app.js"></script></body></html>');
 }).listen(4218,'127.0.0.1',()=>console.log('Core catalog fixture http://127.0.0.1:4218'));
})();
