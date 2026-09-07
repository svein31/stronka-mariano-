import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {api} from '../lib/api'
interface Config {demo:boolean;paymentsEnabled:boolean;seller:{name:string;email:string;address:string;returnsAddress:string};policyVersion:string}
const Context=createContext<{config:Config|null;error:string;retry:()=>void}>({config:null,error:'',retry:()=>{}})
export function StoreProvider({children}:{children:ReactNode}) {
 const [config,setConfig]=useState<Config|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let active=true;setError('');api<Config>('/api/catalog').then(value=>{if(active)setConfig(value)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[attempt])
 return <Context.Provider value={{config,error,retry:()=>setAttempt(n=>n+1)}}>{children}</Context.Provider>
}
export const useStore=()=>useContext(Context)
