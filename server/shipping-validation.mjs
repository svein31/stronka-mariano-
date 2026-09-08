import {HttpError} from './commerce.mjs'
import {orderExists} from './service.mjs'
export {transaction,history,integer} from './service.mjs'
export function editableOrderForShipping(db,id){const order=orderExists(db,id);if(order.stage!=='ready')throw new HttpError(409,'Etykietę przygotuj dopiero dla gotowego zamówienia.');return order}
