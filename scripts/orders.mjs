import { DatabaseSync } from 'node:sqlite'
const db=new DatabaseSync(process.env.DB_PATH || 'var/store.sqlite',{readOnly:true})
if(process.argv[2]) {
 const order=db.prepare('SELECT id,created_at,status,payment_status,amount,currency,customer,snapshot,demo FROM orders WHERE id=?').get(process.argv[2])
 console.log(order?{...order,customer:JSON.parse(order.customer),snapshot:JSON.parse(order.snapshot)}:'Order not found')
} else console.table(db.prepare('SELECT id,created_at,status,payment_status,amount,currency,demo FROM orders ORDER BY created_at DESC LIMIT 50').all())
db.close()
