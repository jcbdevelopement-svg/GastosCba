alter table public.products add column if not exists tier_prices jsonb not null default '[]'::jsonb;
alter table public.products add constraint products_tier_prices_array check (jsonb_typeof(tier_prices) = 'array');

create or replace function public.create_sale(p_items jsonb,p_payment_method public.payment_method,p_status public.sale_status default 'completed',p_notes text default null,p_sold_at timestamptz default now()) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_sale uuid;v_total numeric:=0;v_cost numeric:=0;r jsonb;p public.products%rowtype;q integer;v_price numeric;
begin
 if jsonb_array_length(p_items)=0 then raise exception 'La venta requiere productos';end if;
 for r in select * from jsonb_array_elements(p_items) loop q=(r->>'quantity')::int;if q<1 then raise exception 'Cantidad inválida';end if;select * into p from public.products where id=(r->>'product_id')::uuid and user_id=(select auth.uid());if not found then raise exception 'Producto no encontrado';end if;select coalesce((select (t->>'unitPrice')::numeric from jsonb_array_elements(p.tier_prices)t where q>=(t->>'minQty')::int and(not(t?'maxQty')or nullif(t->>'maxQty','')is null or q<=(t->>'maxQty')::int)order by(t->>'minQty')::int desc limit 1),p.sale_price)into v_price;v_total:=v_total+v_price*q;v_cost:=v_cost+p.cost_price*q;end loop;
 insert into public.sales(user_id,total,total_cost,payment_method,status,notes,sold_at)values((select auth.uid()),v_total,v_cost,p_payment_method,p_status,p_notes,p_sold_at)returning id into v_sale;
 for r in select * from jsonb_array_elements(p_items) loop q=(r->>'quantity')::int;select * into p from public.products where id=(r->>'product_id')::uuid;select coalesce((select(t->>'unitPrice')::numeric from jsonb_array_elements(p.tier_prices)t where q>=(t->>'minQty')::int and(not(t?'maxQty')or nullif(t->>'maxQty','')is null or q<=(t->>'maxQty')::int)order by(t->>'minQty')::int desc limit 1),p.sale_price)into v_price;insert into public.sale_items(sale_id,product_id,quantity,unit_price,unit_cost)values(v_sale,p.id,q,v_price,p.cost_price);end loop;return v_sale;
end$$;
