export class ApiError extends Error {
 status:number
 fields:Record<string,string>
 constructor(message:string,status=0,fields:Record<string,string>={}) {super(message);this.status=status;this.fields=fields}
}
export async function api<T>(path:string,init:RequestInit={}):Promise<T> {
 let response:Response
 try { response=await fetch(path,{...init,headers:{...init.body?{'Content-Type':'application/json'}:{},...init.headers},signal:AbortSignal.timeout(15000)}) }
 catch {throw new ApiError('Brak odpowiedzi serwera. Sprawdź połączenie i ponów próbę.')}
 let data
 try {data=await response.json()} catch {throw new ApiError('Serwer zwrócił nieprawidłową odpowiedź. Ponów próbę.',response.ok?0:response.status)}
 if(!response.ok) throw new ApiError(data.error||'Nie udało się zapisać danych.',response.status,data.fields||{})
 if(!data || typeof data!=='object') throw new ApiError('Nieprawidłowa odpowiedź serwera.')
 return data as T
}
export const post=<T,>(path:string,body:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(body)})
export interface Quote {lines:{slug:string;name:string;size:string;variant:string;quantity:number;price:number;leadTime:string}[];shipping:{id:string;label:string;price:number;description:string};subtotal:number;total:number;currency:string;fingerprint:string}
export interface Customer {name:string;email:string;street:string;postalCode:string;city:string;country:string;notes:string}
export interface Receipt {id:string;createdAt:string;status:string;paymentStatus:string;demo:boolean;quote:Quote;customer:Customer}
