export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const formatBRL = (n: number | null | undefined) => BRL.format(Number(n ?? 0));

export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const monthLabel = (m: number, y: number) => `${MONTHS_PT[m]} ${y}`;

export const formatDateBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const weekdayBR = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
};

export const PAYMENT_METHODS = [
  "Pix", "Débito", "Crédito", "Dinheiro", "A Receber", "Parceria",
] as const;

export const EXPENSE_PAYMENT_METHODS = [
  "Pix", "Dinheiro", "Débito", "Crédito", "Cartão", "A Pagar",
] as const;

export const DEFAULT_PROCEDURES = [
  "Design", "Design e Henna", "Henna", "Buço", "Tintura",
  "Nostril", "Tragus", "Helix", "Conch", "Daith", "Septo", "Umbigo",
  "Troca de Joia", "Argola Nariz",
];
