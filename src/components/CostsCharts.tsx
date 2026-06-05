import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fetchExpenses, type Expense } from "@/lib/data";
import { formatBRL, MONTHS_PT } from "@/lib/format";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--secondary-foreground))",
  "hsl(var(--ring))",
];

function sumBy<T>(arr: T[], get: (x: T) => number) {
  return arr.reduce((s, x) => s + (Number(get(x)) || 0), 0);
}

function groupSum<T>(arr: T[], key: (x: T) => string, val: (x: T) => number) {
  const m = new Map<string, number>();
  for (const x of arr) {
    const k = key(x) || "—";
    m.set(k, (m.get(k) ?? 0) + (Number(val(x)) || 0));
  }
  return Array.from(m, ([name, value]) => ({ name, value }));
}

export function CostsCharts({ year, monthIdx, current }: {
  year: number;
  monthIdx: number;
  current: Expense[];
}) {
  const prevDate = new Date(year, monthIdx - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonthIdx = prevDate.getMonth();

  const prevQ = useQuery({
    queryKey: ["expenses", prevYear, prevMonthIdx],
    queryFn: () => fetchExpenses(prevYear, prevMonthIdx),
  });
  const previous = prevQ.data ?? [];

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const dailySeries = useMemo(() => {
    const cur = new Array(daysInMonth).fill(0);
    const prv = new Array(daysInMonth).fill(0);
    for (const e of current) {
      const d = Number(e.date.split("-")[2]) - 1;
      if (d >= 0 && d < daysInMonth) cur[d] += Number(e.total) || 0;
    }
    const prevDays = new Date(prevYear, prevMonthIdx + 1, 0).getDate();
    for (const e of previous) {
      const d = Number(e.date.split("-")[2]) - 1;
      if (d >= 0 && d < prevDays && d < daysInMonth) prv[d] += Number(e.total) || 0;
    }
    return cur.map((v, i) => ({ dia: String(i + 1).padStart(2, "0"), atual: v, anterior: prv[i] }));
  }, [current, previous, daysInMonth, prevYear, prevMonthIdx]);

  const byMethod = useMemo(
    () => groupSum(current, (e) => e.payment_method ?? "—", (e) => Number(e.total)),
    [current],
  );

  const byCategory = useMemo(() => {
    const cur = groupSum(current, (e) => e.description, (e) => Number(e.total));
    const prv = new Map(
      groupSum(previous, (e) => e.description, (e) => Number(e.total)).map((x) => [x.name, x.value]),
    );
    const all = new Set<string>([...cur.map((x) => x.name), ...prv.keys()]);
    return Array.from(all)
      .map((name) => {
        const atual = cur.find((x) => x.name === name)?.value ?? 0;
        const anterior = prv.get(name) ?? 0;
        const diff = atual - anterior;
        const pct = anterior === 0 ? (atual > 0 ? 100 : 0) : (diff / anterior) * 100;
        return { name, atual, anterior, diff, pct };
      })
      .sort((a, b) => b.atual - a.atual);
  }, [current, previous]);

  const totalAtual = sumBy(current, (e) => Number(e.total));
  const totalAnterior = sumBy(previous, (e) => Number(e.total));
  const diffTotal = totalAtual - totalAnterior;
  const pctTotal = totalAnterior === 0 ? (totalAtual > 0 ? 100 : 0) : (diffTotal / totalAnterior) * 100;

  const labelAtual = `${MONTHS_PT[monthIdx]}/${year}`;
  const labelAnterior = `${MONTHS_PT[prevMonthIdx]}/${prevYear}`;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-2xl">Gráficos e comparativos</h3>
        <p className="text-sm text-muted-foreground">
          Comparação entre {labelAtual} e {labelAnterior}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total {labelAtual}</div>
          <div className="text-xl font-semibold tabular-nums">{formatBRL(totalAtual)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total {labelAnterior}</div>
          <div className="text-xl font-semibold tabular-nums">{formatBRL(totalAnterior)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Variação</div>
          <div className={`text-xl font-semibold tabular-nums ${diffTotal > 0 ? "text-destructive" : "text-emerald-600"}`}>
            {diffTotal >= 0 ? "+" : ""}{formatBRL(diffTotal)}{" "}
            <span className="text-xs font-normal">({pctTotal.toFixed(1)}%)</span>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Custos por dia · {labelAtual} vs {labelAnterior}</div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailySeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="dia" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend />
              <Bar dataKey="anterior" name={labelAnterior} fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="atual" name={labelAtual} fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium">Acumulado no mês</div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailySeries.reduce<{ dia: string; atual: number; anterior: number }[]>(
                  (acc, d, i) => {
                    const prev = acc[i - 1];
                    acc.push({
                      dia: d.dia,
                      atual: (prev?.atual ?? 0) + d.atual,
                      anterior: (prev?.anterior ?? 0) + d.anterior,
                    });
                    return acc;
                  },
                  [],
                )}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="dia" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend />
                <Line type="monotone" dataKey="anterior" name={labelAnterior} stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="atual" name={labelAtual} stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-sm font-medium">Por forma de pagamento</div>
          <div className="h-56 w-full">
            {byMethod.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados no mês
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <Pie data={byMethod} dataKey="value" nameKey="name" outerRadius={80} label={(d) => d.name}>
                    {byMethod.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border/70 p-4">
          <div className="text-sm font-medium">Comparativo por descrição</div>
          <p className="text-xs text-muted-foreground">
            Soma agrupada por descrição do custo, comparando os dois meses.
          </p>
        </div>
        {byCategory.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Sem dados para comparar.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">{labelAnterior}</TableHead>
                <TableHead className="text-right">{labelAtual}</TableHead>
                <TableHead className="text-right">Variação</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCategory.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(r.anterior)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(r.atual)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${r.diff > 0 ? "text-destructive" : r.diff < 0 ? "text-emerald-600" : ""}`}>
                    {r.diff >= 0 ? "+" : ""}{formatBRL(r.diff)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${r.diff > 0 ? "text-destructive" : r.diff < 0 ? "text-emerald-600" : ""}`}>
                    {r.pct >= 0 ? "+" : ""}{r.pct.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(totalAnterior)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(totalAtual)}</TableCell>
                <TableCell className={`text-right tabular-nums ${diffTotal > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {diffTotal >= 0 ? "+" : ""}{formatBRL(diffTotal)}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${diffTotal > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {pctTotal >= 0 ? "+" : ""}{pctTotal.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  );
}
