import type {Garment} from '../data/collection'
export function recommendSize(product:Garment,input:{waist:number;hips:number;inseam:number;fit:string}){
 if(!product.measurementsVerified||!product.measurements?.length)return {size:null,message:'Brak zatwierdzonych wymiarów tego kroju.'}
 if([input.waist,input.hips,input.inseam].some(v=>!Number.isFinite(v)||v<20||v>250))return {size:null,message:'Podaj prawidłowe wymiary w centymetrach.'}
 const ease=input.fit==='relaxed'?10:4
 const candidates=product.measurements.filter(m=>product.sizes.includes(m.size)&&m.waist>=input.waist+2&&m.waist<=input.waist+10&&m.hips>=input.hips+ease&&m.hips<=input.hips+ease+12&&Math.abs(m.inseam-input.inseam)<=4)
 candidates.sort((a,b)=>(a.waist-input.waist)+(a.hips-input.hips)+Math.abs(a.inseam-input.inseam)*2-((b.waist-input.waist)+(b.hips-input.hips)+Math.abs(b.inseam-input.inseam)*2))
 const best=candidates[0]
 return best?{size:best.size,message:'Proponujemy '+best.size+': '+(best.waist-input.waist)+' cm zapasu w pasie, '+(best.hips-input.hips)+' cm w biodrach. Nogawka ma '+best.inseam+' cm. Sprawdź tabelę przed wyborem.'}:{size:null,message:'Nie znajdujemy dopasowania w zatwierdzonej tabeli. Zapytaj pracownię o zmianę wymiarów.'}
}

