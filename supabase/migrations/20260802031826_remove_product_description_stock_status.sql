alter table public.products drop column if exists description, drop column if exists stock, drop column if exists active;

create or replace function public.create_sale(p_items jsonb,p_payment_method text,p_status public.sale_status default 'completed',p_notes text default null,p_sold_at timestamptz default now()) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_sale uuid;v_total numeric:=0;v_cost numeric:=0;r jsonb;p public.products%rowtype;q integer;
begin
 if jsonb_array_length(p_items)=0 then raise exception 'La venta requiere productos';end if;
 for r in select * from jsonb_array_elements(p_items) loop q=(r->>'quantity')::int;select * into p from public.products where id=(r->>'product_id')::uuid and user_id=auth.uid();if not found then raise exception 'Producto no encontrado';end if;v_total:=v_total+p.sale_price*q;v_cost:=v_cost+p.cost_price*q;end loop;
 insert into public.sales(user_id,total,total_cost,payment_method,status,notes,sold_at) values(auth.uid(),v_total,v_cost,p_payment_method,p_status,p_notes,p_sold_at) returning id into v_sale;
 for r in select * from jsonb_array_elements(p_items) loop q=(r->>'quantity')::int;select * into p from public.products where id=(r->>'product_id')::uuid;insert into public.sale_items(sale_id,product_id,quantity,unit_price,unit_cost) values(v_sale,p.id,q,p.sale_price,p.cost_price);end loop;
 return v_sale;
end$$;
