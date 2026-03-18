import * as XLSX from "xlsx";

export type StatusBaixa = "OK" | "ATRASADO" | "PARCIAL" | "DUPLICADO" | "NAO_ALUGUEL" | "PENDENTE_IA";
export type Prioridade = "NORMAL" | "ATENCAO" | "CRITICO";

export interface LinhaParsed {
  id: string;
  data_banco: string;
  lancamento: string;
  nome: string;
  nome_limpo: string;
  data_pix: string;
  dcto: string;
  credito: number | null;
  debito: number | null;
  saldo: number | null;
  status: StatusBaixa;
  dias_atraso: number;
  multa_devida: number;
  observacao: string;
  acao_recomendada: string;
  prioridade: Prioridade;
  baixa_realizada: boolean;
  responsavel: string;
  contrato_id: string | null;
  fatura_id: string | null;
  inquilino_matched: string | null;
}

export interface RespostaIA {
  id: string;
  status: StatusBaixa;
  dias_atraso: number;
  multa_devida: number;
  observacao: string;
  acao_recomendada: string;
  prioridade: Prioridade;
  contrato_id?: string | null;
  fatura_id?: string | null;
  inquilino_matched?: string | null;
}

function parseBRL(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number") return isNaN(valor) ? null : valor;
  const str = String(valor).trim().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseData(valor: unknown): string {
  if (!valor) return "";
  if (valor instanceof Date) return valor.toISOString().split("T")[0];
  if (typeof valor === "number") {
    const date = XLSX.SSF.parse_date_code(valor);
    if (date) return `${date.y}-${String(date.m).padStart(2,"0")}-${String(date.d).padStart(2,"0")}`;
  }
  if (typeof valor === "string") {
    const m = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10);
  }
  return String(valor);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const COLUNAS = {
  data_banco: ["Data"],
  lancamento: ["Lançamento", "Lancamento"],
  nome:       ["Nome"],
  data_pix:   ["Data.1", "Data PIX"],
  dcto:       ["Dcto.", "Dcto"],
  credito:    ["Crédito (R$)", "Credito (R$)"],
  debito:     ["Débito (R$)", "Debito (R$)"],
  saldo:      ["Saldo (R$)", "Saldo"],
};

function col(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (k in row) return row[k];
  return undefined;
}

export async function parseExtrato(file: File): Promise<LinhaParsed[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: false, raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("Arquivo sem planilhas.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
  if (!rows.length) throw new Error("Planilha vazia.");

  return rows
    .map((row) => {
      const credito = parseBRL(col(row, COLUNAS.credito));
      if (!credito || credito <= 0) return null;
      const nome = String(col(row, COLUNAS.nome) ?? "").trim();
      return {
        id: uid(),
        data_banco: String(col(row, COLUNAS.data_banco) ?? ""),
        lancamento: String(col(row, COLUNAS.lancamento) ?? ""),
        nome, nome_limpo: nome,
        data_pix: parseData(col(row, COLUNAS.data_pix)),
        dcto: String(col(row, COLUNAS.dcto) ?? ""),
        credito,
        debito: parseBRL(col(row, COLUNAS.debito)),
        saldo: parseBRL(col(row, COLUNAS.saldo)),
        status: "PENDENTE_IA" as StatusBaixa,
        dias_atraso: 0, multa_devida: 0,
        observacao: "", acao_recomendada: "",
        prioridade: "NORMAL" as Prioridade,
        baixa_realizada: false, responsavel: "",
        contrato_id: null, fatura_id: null, inquilino_matched: null,
      } satisfies LinhaParsed;
    })
    .filter(Boolean) as LinhaParsed[];
}

export function prepararPayloadIA(linhas: LinhaParsed[]): string {
  return JSON.stringify(linhas.map((l) => ({
    id: l.id, nome: l.nome_limpo,
    data_pagamento: l.data_pix, valor: l.credito,
    lancamento: l.lancamento.slice(0, 60),
  })));
}

export function aplicarRespostaIA(linhas: LinhaParsed[], respostas: RespostaIA[]): LinhaParsed[] {
  const mapa = new Map(respostas.map((r) => [r.id, r]));
  return linhas.map((l) => {
    const r = mapa.get(l.id);
    return r ? { ...l, ...r } : l;
  });
}
