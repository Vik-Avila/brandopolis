import { readFileSync } from 'node:fs';
import { connect } from '../persistence/database.js';
import { Engine } from '../application/engine.js';
import { createApp } from './http.js';
import { databaseUrl } from '../../scripts/local-db.js';
if(process.env.NODE_ENV==='production') throw new Error('M1 demo authentication is not enabled for production');
const {db,pool}=connect(databaseUrl());
const assets:Record<string,[string,string]>={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
const server=createApp(new Engine(db),path=>{
  const file=assets[path];if(!file) return;
  return {content:readFileSync(new URL(`./public/${file[0]}`,import.meta.url),'utf8'),type:file[1]};
});
server.listen(3000,'127.0.0.1',()=>console.log('Brandopolis M1 DEMO: http://127.0.0.1:3000'));
const stop=()=>server.close(()=>{void pool.end();});process.once('SIGINT',stop);process.once('SIGTERM',stop);
