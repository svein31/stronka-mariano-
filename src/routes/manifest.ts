export const ROUTES = [{to:'/shop',label:'Spodnie'},{to:'/process',label:'Jak powstają'},{to:'/journal',label:'Notatki'}].map((r,i)=>({...r,index:String(i+1).padStart(2,'0'),match:r.to}))
export const HELP_ROUTES = [{to:'/size-guide',label:'Rozmiary'},{to:'/faq',label:'Pytania i odpowiedzi'},{to:'/contact',label:'Kontakt'}]
export const LEGAL_ROUTES = [{to:'/terms',label:'Regulamin'},{to:'/privacy',label:'Prywatność'},{to:'/shipping-returns',label:'Dostawa i zwroty'}]
