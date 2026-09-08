import { resolve } from 'node:path'
import { getConfig } from './config.mjs'
import { openDatabase } from './database.mjs'
import { createApp } from './app.mjs'
import {startWorker} from './worker.mjs'
const db=openDatabase(process.env.DB_PATH || resolve('var/store.sqlite'))
const app=createApp({db,config:getConfig()})
const port=Number(process.env.API_PORT || 3001)
app.listen(port,process.env.HOST || '127.0.0.1',()=>console.log('Store API: http://127.0.0.1:'+port))
const stopWorker=process.env.WORKER_MODE==='external'?async()=>{}:startWorker(db)
for(const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>app.close(async()=>{await stopWorker();db.close();process.exit(0)}))
