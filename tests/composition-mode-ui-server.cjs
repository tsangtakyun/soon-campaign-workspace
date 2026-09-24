const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
http.createServer((req,res)=>{
 if(req.url==='/app.js'){res.setHeader('Content-Type','application/javascript');return res.end(fs.readFileSync('/private/tmp/soon-composition-ui.js'));}
 const target=path.resolve('public','.'+req.url);
 if(target.startsWith(path.resolve('public')+path.sep)&&fs.existsSync(target)&&fs.statSync(target).isFile())return res.end(fs.readFileSync(target));
 res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html><title>Composition mode verification</title><style>body{margin:0;background:#f6f2eb;color:#252525;font-family:system-ui}main{max-width:1140px;margin:30px auto;padding:20px}button{background:#6b2c30;color:white;padding:15px;border:1px solid #d4c8be;border-radius:10px;cursor:pointer}button[aria-pressed=true]{outline:3px solid #c7e63a}.cards{display:flex;gap:20px;margin-top:30px}.cards article{width:calc((100% - 40px)/3);background:white;border-radius:15px;overflow:hidden}.cards h2{padding:10px 15px}small{font-size:12px}</style><div id="root"></div><script src="/app.js"></script></html>');
}).listen(4203,'127.0.0.1',()=>console.log('Composition fixture http://127.0.0.1:4203'));
