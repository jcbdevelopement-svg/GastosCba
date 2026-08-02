-- Compact repeated strings to four-byte enum values.
create type public.payment_method as enum ('Mercado Pago','Transferencia','Efectivo','Tarjeta','Otro');
create type public.expense_category as enum (
  '📢 Publicidad y Marketing','🖥️ Hosting','🌐 Dominios','🧩 Software y Herramientas',
  '📦 Productos / Mercadería','🚚 Envíos y Logística','🏭 Proveedores','💳 Comisiones de Pago',
  '🛍️ Comisiones de Marketplace','💼 Servicios Profesionales','👥 Sueldos y Personal','🏢 Alquiler',
  '💡 Servicios e Infraestructura','📞 Telefonía e Internet','🎨 Diseño y Contenido','📸 Fotografía / Video',
  '🔄 Devoluciones y Reembolsos','🧾 Impuestos','🏦 Gastos Bancarios','💸 Otros'
);
alter table public.sales alter column payment_method type public.payment_method using payment_method::public.payment_method;
alter table public.payments alter column payment_method type public.payment_method using payment_method::public.payment_method;
alter table public.expenses alter column category type public.expense_category using category::public.expense_category;

-- These values are derived from prices and costs, so avoid storing duplicates.
alter table public.sale_items drop column subtotal, drop column profit;
alter table public.sales drop column profit;

-- Cover both foreign keys used in product performance queries.
create index sale_items_product_idx on public.sale_items(product_id);

-- Evaluate auth.uid() once per statement instead of once per row.
drop policy profiles_owner on public.profiles;
create policy profiles_owner on public.profiles for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy products_owner on public.products;
create policy products_owner on public.products for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy sales_owner on public.sales;
create policy sales_owner on public.sales for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy expenses_owner on public.expenses;
create policy expenses_owner on public.expenses for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy payments_owner on public.payments;
create policy payments_owner on public.payments for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
drop policy sale_items_owner on public.sale_items;
create policy sale_items_owner on public.sale_items for all to authenticated
using(exists(select 1 from public.sales s where s.id=sale_id and s.user_id=(select auth.uid())))
with check(exists(select 1 from public.sales s where s.id=sale_id and s.user_id=(select auth.uid())));

drop function public.create_sale(jsonb,text,public.sale_status,text,timestamptz);
create function public.create_sale(p_items jsonb,p_payment_method public.payment_method,p_status public.sale_status default 'completed',p_notes text default null,p_sold_at timestamptz default now()) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_sale uuid;v_total numeric:=0;v_cost numeric:=0;r jsonb;p public.products%rowtype;q integer;
begin
 if jsonb_array_length(p_items)=0 then raise exception 'La venta requiere productos';end if;
 for r in select * from jsonb_array_elements(p_items) loop q=(r->>'quantity')::int;select * into p from public.products where id=(r->>'product_id')::uuid and user_id=(select auth.uid());if not found then raise exception 'Producto no encontrado';end if;v_total:=v_total+p.sale_price*q;v_cost:=v_cost+p.cost_price*q;end loop;
 insert into public.sales(user_id,total,total_cost,payment_method,status,notes,sold_at) values((select auth.uid()),v_total,v_cost,p_payment_method,p_status,p_notes,p_sold_at) returning id into v_sale;
 for r in select * from jsonb_array_elements(p_items) loop q=(r->>'quantity')::int;select * into p from public.products where id=(r->>'product_id')::uuid;insert into public.sale_items(sale_id,product_id,quantity,unit_price,unit_cost) values(v_sale,p.id,q,p.sale_price,p.cost_price);end loop;
 return v_sale;
end$$;
grant execute on function public.create_sale(jsonb,public.payment_method,public.sale_status,text,timestamptz) to authenticated;
