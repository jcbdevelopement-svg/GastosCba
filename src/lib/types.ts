export type PriceTier={minQty:number;maxQty?:number;unitPrice:number}
export type Product={id:string;user_id:string;name:string;category:string;sale_price:number;cost_price:number;tier_prices:PriceTier[];created_at:string;updated_at:string}
export type Sale={id:string;user_id:string;total:number;total_cost:number;profit:number;payment_method:string;status:'completed'|'pending'|'cancelled';notes:string|null;sold_at:string;created_at:string;sale_items?:Array<{id:string;product_id:string;quantity:number;unit_price:number;unit_cost:number;subtotal:number;profit:number;products?:{name:string}}>} 
export type Expense={id:string;user_id:string;name:string;category:string;amount:number;description:string|null;expense_date:string;created_at:string}
export type Payment={id:string;user_id:string;concept:string;amount:number;payment_method:string;status:'paid'|'pending'|'cancelled';payment_date:string;notes:string|null;created_at:string}
