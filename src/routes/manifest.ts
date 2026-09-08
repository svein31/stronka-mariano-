export const ROUTES = [{to:'/shop',label:'Sklep'},{to:'/collections',label:'Kolekcje'},{to:'/process',label:'Studio'}].map((r,i)=>({...r,index:String(i+1).padStart(2,'0'),match:r.to}))
export const HELP_ROUTES = [{to:'/track',label:'Realizacja zamówienia'},{to:'/size-guide',label:'Rozmiary'},{to:'/faq',label:'Pytania i odpowiedzi'},{to:'/contact',label:'Kontakt'}]
export const LEGAL_ROUTES = [{to:'/terms',label:'Regulamin'},{to:'/privacy',label:'Prywatność'},{to:'/shipping-returns',label:'Dostawa i zwroty'}]

export const EXPLORE_ROUTES=[{to:'/lookbook',label:'Lookbook'},{to:'/archive',label:'Archiwum'},{to:'/journal',label:'Notatki'},{to:'/personalize',label:'Twój projekt'},{to:'/help',label:'Pomoc'}]
