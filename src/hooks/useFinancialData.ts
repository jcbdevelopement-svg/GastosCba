import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Expense, Income, Payment, Product, Sale } from "../lib/types";
export function useFinancialData() {
  const [products, setProducts] = useState<Product[]>([]),
    [sales, setSales] = useState<Sale[]>([]),
    [expenses, setExpenses] = useState<Expense[]>([]),
    [incomes, setIncomes] = useState<Income[]>([]),
    [payments, setPayments] = useState<Payment[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    const [p, s, e, i, pa] = await Promise.all([
      supabase
        .from("products")
        .select("id,user_id,name,category,sale_price,cost_price,tier_prices,created_at,updated_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("sales")
        .select("id,user_id,total,total_cost,payment_method,status,notes,sold_at,created_at,sale_items(id,product_id,quantity,unit_price,unit_cost,products(name))")
        .order("sold_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("id,user_id,name,category,amount,description,expense_date,created_at")
        .order("expense_date", { ascending: false }),
      supabase
        .from("incomes")
        .select("id,user_id,concept,amount,source,received_at,notes,created_at")
        .order("received_at", { ascending: false }),
      supabase
        .from("payments")
        .select("id,user_id,concept,amount,payment_method,status,payment_date,notes,created_at")
        .order("payment_date", { ascending: false }),
    ]);
    const incomeTableMissing = i.error?.code === "PGRST205" || i.error?.code === "42P01";
    const err = p.error || s.error || e.error || (!incomeTableMissing && i.error) || pa.error;
    if (err) setError(err.message);
    setProducts((p.data || []) as Product[]);
    setSales(
      ((s.data || []) as any[]).map((row) => ({
        ...row,
        profit: Number(row.total) - Number(row.total_cost),
        sale_items: (row.sale_items || []).map((item: any) => ({
          ...item,
          subtotal: Number(item.quantity) * Number(item.unit_price),
          profit:
            Number(item.quantity) *
            (Number(item.unit_price) - Number(item.unit_cost)),
        })),
      })) as Sale[],
    );
    setExpenses((e.data || []) as Expense[]);
    setIncomes((i.data || []) as Income[]);
    setPayments((pa.data || []) as Payment[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { products, sales, expenses, incomes, payments, loading, error, reload };
}
