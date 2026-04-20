import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (val: number | string) =>
  Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getReferenceMonth = (refMonthStr: string) => {
  try {
    const year = Number(refMonthStr.slice(0, 4));
    const month = Number(refMonthStr.slice(5, 7)) - 1;
    return format(new Date(year, month, 1), "MMMM/yyyy", { locale: ptBR });
  } catch {
    return refMonthStr;
  }
};

const esc = (str: string | null | undefined) => {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
};

export function buildInvoiceHTML(invoice: any): string {
  const contract = invoice.contracts;
  const prop = invoice.resolvedProperty;

  const propertyAddress = prop?.address
    ? `${prop.address}, ${prop.number || "S/N"}${prop.complement ? ` - ${prop.complement}` : ""}`
    : "Endereço não informado";

  const cityLine = [
    prop?.neighborhood,
    `${prop?.city || "Cidade"}/${prop?.state || "Estado"}`,
    prop?.postal_code ? `CEP: ${prop.postal_code}` : "",
  ]
    .filter(Boolean)
    .join(" - ");

  // Build line items
  const lines: { description: string; value: string; isDiscount?: boolean }[] = [];

  if (Number(invoice.rental_amount) > 0)
    lines.push({ description: "Aluguel", value: formatCurrency(invoice.rental_amount) });
  if (Number(invoice.condo_fee) > 0)
    lines.push({ description: "Taxa de Condomínio", value: formatCurrency(invoice.condo_fee) });
  if (Number(invoice.water_amount) > 0)
    lines.push({ description: "Água", value: formatCurrency(invoice.water_amount) });
  if (Number(invoice.electricity_amount) > 0)
    lines.push({ description: "Energia Elétrica", value: formatCurrency(invoice.electricity_amount) });
  if (Number(invoice.gas_amount) > 0)
    lines.push({ description: "Gás", value: formatCurrency(invoice.gas_amount) });
  if (Number(invoice.internet_amount) > 0)
    lines.push({ description: "Internet", value: formatCurrency(invoice.internet_amount) });
  if (Number(invoice.cleaning_fee) > 0)
    lines.push({ description: "Taxa de Limpeza/Adicional", value: formatCurrency(invoice.cleaning_fee) });

  if (Number(invoice.guarantee_installment) > 0) {
    let label = "Parcela de Garantia";
    if (invoice.guarantee_installment_number && invoice.guarantee_installment_number > 0) {
      const total = invoice.guarantee_total_installments || contract?.guarantee_installments || invoice.guarantee_installment_number;
      label += ` (${invoice.guarantee_installment_number}/${total})`;
    }
    lines.push({ description: label, value: formatCurrency(invoice.guarantee_installment) });
  }

  if (invoice.extra_charges && Array.isArray(invoice.extra_charges)) {
    for (const charge of invoice.extra_charges) {
      lines.push({
        description: charge.description || "Cobrança Adicional",
        value: formatCurrency(charge.value_per_installment || charge.value || charge.amount || 0),
      });
    }
  }

  if (Number(invoice.discount_amount) > 0) {
    lines.push({
      description: "Descontos / Abatimentos",
      value: `- ${formatCurrency(invoice.discount_amount)}`,
      isDiscount: true,
    });
  }

  const rowsHTML = lines
    .map(
      (l) => `
      <tr style="${l.isDiscount ? "background:#f0fdf4;" : ""}">
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:500;color:${l.isDiscount ? "#15803d" : "#334155"};">
          ${esc(l.description)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:${l.isDiscount ? "600" : "500"};color:${l.isDiscount ? "#15803d" : "#334155"};">
          ${esc(l.value)}
        </td>
      </tr>`
    )
    .join("");

  const paidStamp =
    invoice.status === "paid"
      ? `<div style="margin-top:20px;display:inline-block;padding:10px 40px;border:4px double #22c55e;color:#16a34a;border-radius:12px;font-weight:bold;text-transform:uppercase;letter-spacing:4px;font-size:24px;transform:rotate(-2deg);opacity:0.8;">Pago</div>`
      : "";

  const dueDateFormatted = invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : "-";
  const issueDateFormatted = invoice.issue_date ? format(new Date(invoice.issue_date), "dd/MM/yyyy") : "-";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Fatura ${esc(invoice.invoice_number)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #fff;
      padding: 0;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 32px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 26px;
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .header .subtitle { color: #64748b; margin-top: 4px; font-weight: 500; }
    .due-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 16px;
      text-align: center;
    }
    .due-box .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .due-box .value { font-size: 20px; font-weight: 700; color: #1e293b; }
    .two-cols {
      display: flex;
      gap: 32px;
      margin-bottom: 32px;
    }
    .two-cols > div { flex: 1; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .name { font-size: 17px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
    .detail { font-size: 13px; color: #475569; line-height: 1.6; }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 32px;
    }
    .meta-bar .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .meta-bar .value { font-weight: 700; color: #1e293b; font-size: 14px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    table thead tr {
      background: #f1f5f9;
    }
    table th {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      text-align: left;
    }
    table th:last-child { text-align: right; }
    .total-row td {
      padding: 14px 12px;
      font-weight: 700;
      border-top: 2px solid #cbd5e1;
    }
    .total-label { text-align: right; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #1e293b; }
    .total-value { text-align: right; font-size: 20px; color: #2563eb; background: #f1f5f9; border-radius: 0 0 6px 0; }
    .footer {
      margin-top: 32px;
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
      line-height: 1.7;
    }
    @media print {
      body { padding: 0; }
      .page { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <div class="header">
        <div>
          <h1>Recibo de Locação</h1>
          <p class="subtitle">Boleto / Demonstrativo de Despesas</p>
        </div>
        <div class="due-box">
          <p class="label">Vencimento</p>
          <p class="value">${esc(dueDateFormatted)}</p>
        </div>
      </div>

      <div class="two-cols">
        <div>
          <p class="section-title">Dados do Imóvel / Locador</p>
          <p class="name">${esc(prop?.owner_name || "Proprietário não informado")}</p>
          <p class="detail">${esc(prop?.name || "Imóvel")}</p>
          <p class="detail">${esc(propertyAddress)}</p>
          <p class="detail">${esc(cityLine)}</p>
        </div>
        <div>
          <p class="section-title">Dados do Locatário</p>
          <p class="name">${esc(contract?.tenant_name || "Locatário não informado")}</p>
          <p class="detail">CPF/CNPJ: ${esc(contract?.tenant_document || "Não informado")}</p>
          <p class="detail">E-mail: ${esc(contract?.tenant_email || "-")}</p>
          <p class="detail">Tel: ${esc(contract?.tenant_phone || "-")}</p>
        </div>
      </div>

      <div class="meta-bar">
        <div>
          <p class="label">Fatura Nº</p>
          <p class="value">${esc(invoice.invoice_number)}</p>
        </div>
        <div>
          <p class="label">Competência</p>
          <p class="value" style="text-transform:capitalize;">${esc(getReferenceMonth(invoice.reference_month))}</p>
        </div>
        <div>
          <p class="label">Emissão</p>
          <p class="value">${esc(issueDateFormatted)}</p>
        </div>
        <div>
          <p class="label">Vencimento</p>
          <p class="value">${esc(dueDateFormatted)}</p>
        </div>
        <div>
          <p class="label">Contrato Nº</p>
          <p class="value">${esc(contract?.contract_number || "-")}</p>
        </div>
      </div>

      <p class="section-title">Demonstrativo de Valores</p>
      <table>
        <thead>
          <tr>
            <th style="width:70%;">Descrição</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td class="total-label">Total a Pagar</td>
            <td class="total-value">${esc(formatCurrency(invoice.total_amount))}</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        <p>Este documento é um demonstrativo das parcelas devidas referente ao contrato de locação.</p>
        <p>O pagamento deve ser realizado até a data de vencimento para evitar multas, juros e encargos.</p>
        ${paidStamp}
      </div>
    </div>
  </div>
</body>
</html>`;
}
