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
    const [e, i, pa] = await Promise.all([
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
    const isMissing = (code?: string) => code === "PGRST205" || code === "42P01";
    const incomeTableMissing = i.error?.code === "PGRST205" || i.error?.code === "42P01";
    const err = (!isMissing(e.error?.code) && e.error) || (!incomeTableMissing && i.error) || (!isMissing(pa.error?.code) && pa.error);
    if (err) setError(err.message);
    setProducts([]);
    setSales([]);
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
