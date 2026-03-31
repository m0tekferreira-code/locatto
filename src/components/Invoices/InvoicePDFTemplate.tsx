import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InvoicePDFTemplateProps {
  invoice: any;
}

export const InvoicePDFTemplate = React.forwardRef<HTMLDivElement, InvoicePDFTemplateProps>(({ invoice }, ref) => {
  if (!invoice) return null;

  const resolvedProperty = invoice.resolvedProperty;
  const contract = invoice.contracts;

  const propertyAddress = resolvedProperty?.address 
    ? `${resolvedProperty.address}, ${resolvedProperty.number || 'S/N'}${resolvedProperty.complement ? ` - ${resolvedProperty.complement}` : ''}`
    : "Endereço não informado";

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

  return (
    <div ref={ref} className="bg-white text-slate-900 p-8 w-[800px] min-h-[1050px] mx-auto hidden-print" style={{ display: 'none' }}>
      <div id="pdf-content" className="border border-slate-300 rounded-lg p-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-wider">Recibo de Locação</h1>
            <p className="text-slate-500 mt-1 font-medium">Boleto / Demonstrativo de Despesas</p>
          </div>
          <div className="text-right">
            <div className="bg-slate-100 px-4 py-2 rounded-md inline-block border border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-semibold">Vencimento</p>
              <p className="text-xl font-bold text-slate-800">{format(new Date(invoice.due_date), "dd/MM/yyyy")}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Locador / Imóvel Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-200 pb-1">Dados do Imóvel / Locador</h3>
              <p className="font-semibold text-slate-800 text-lg">{resolvedProperty?.owner_name || "Proprietário não informado"}</p>
              <p className="text-sm text-slate-600">{resolvedProperty?.name || "Imóvel"}</p>
              <p className="text-sm text-slate-600">{propertyAddress}</p>
              <p className="text-sm text-slate-600">
                {resolvedProperty?.neighborhood ? `${resolvedProperty.neighborhood} - ` : ''}
                {resolvedProperty?.city || "Cidade"}/{resolvedProperty?.state || "Estado"} 
                {resolvedProperty?.postal_code ? ` - CEP: ${resolvedProperty.postal_code}` : ''}
              </p>
            </div>
          </div>

          {/* Locatário Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-200 pb-1">Dados do Locatário</h3>
              <p className="font-semibold text-slate-800 text-lg">{contract?.tenant_name || "Locatário não informado"}</p>
              <p className="text-sm text-slate-600">CPF/CNPJ: {contract?.tenant_document || "Não informado"}</p>
              <p className="text-sm text-slate-600">E-mail: {contract?.tenant_email || "-"}</p>
              <p className="text-sm text-slate-600">Tel: {contract?.tenant_phone || "-"}</p>
            </div>
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="flex bg-slate-50 border border-slate-200 rounded-md p-4 mb-8 justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Fatura Nº</p>
            <p className="font-bold text-slate-800">{invoice.invoice_number}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Competência</p>
            <p className="font-bold text-slate-800 capitalize">{getReferenceMonth(invoice.reference_month)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Emissão</p>
            <p className="font-bold text-slate-800">{format(new Date(invoice.issue_date), "dd/MM/yyyy")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Contrato Nº</p>
            <p className="font-bold text-slate-800">{contract?.contract_number || "-"}</p>
          </div>
        </div>

        {/* Breakdown of Charges */}
        <div className="flex-grow">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">Demonstrativo de Valores</h3>
          
          <table className="w-full text-left mb-6 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm">
                <th className="py-2 px-3 border border-slate-200 rounded-tl-md font-semibold font-sans w-[70%]">Descrição</th>
                <th className="py-2 px-3 border border-slate-200 rounded-tr-md font-semibold font-sans text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="text-sm align-top">
              {Number(invoice.rental_amount) > 0 && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-700">Aluguel</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(invoice.rental_amount)}</td>
                </tr>
              )}
              {Number(invoice.condo_fee) > 0 && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-700">Taxa de Condomínio</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(invoice.condo_fee)}</td>
                </tr>
              )}
              {Number(invoice.water_amount) > 0 && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-700">Água</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(invoice.water_amount)}</td>
                </tr>
              )}
              {Number(invoice.electricity_amount) > 0 && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-700">Energia Elétrica</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(invoice.electricity_amount)}</td>
                </tr>
              )}
              {Number(invoice.gas_amount) > 0 && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-700">Gás</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(invoice.gas_amount)}</td>
                </tr>
              )}
              {Number(invoice.internet_amount) > 0 && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-700">Internet</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(invoice.internet_amount)}</td>
                </tr>
              )}
              {Number(invoice.cleaning_fee) > 0 && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-700">Taxa de Limpeza/Adicional</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(invoice.cleaning_fee)}</td>
                </tr>
              )}
              {Number(invoice.guarantee_installment) > 0 && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-700">
                    Parcela de Garantia {(invoice.guarantee_installment_number && invoice.guarantee_installment_number > 0) ? `(${invoice.guarantee_installment_number}/12)` : ''}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(invoice.guarantee_installment)}</td>
                </tr>
              )}
              
              {/* Extra Charges */}
              {invoice.extra_charges && Array.isArray(invoice.extra_charges) && invoice.extra_charges.length > 0 && invoice.extra_charges.map((charge: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-700">{charge.description || "Cobrança Adicional"}</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(charge.amount || 0)}</td>
                </tr>
              ))}
              
              {/* Discounts */}
              {Number(invoice.discount_amount) > 0 && (
                <tr className="border-b border-slate-200 bg-green-50/50">
                  <td className="py-3 px-3 font-medium text-green-700">Descontos / Abatimentos</td>
                  <td className="py-3 px-3 text-right text-green-700 font-semibold">- {formatCurrency(invoice.discount_amount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-4 px-3 text-right font-bold text-lg text-slate-800 uppercase tracking-wider">Total a Pagar</td>
                <td className="py-4 px-3 text-right font-bold text-xl text-primary bg-slate-100 rounded-br-md border-t-2 border-slate-300">
                  {formatCurrency(invoice.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
          <p>Este documento é um demonstrativo das parcelas devidas referente ao contrato de locação.</p>
          <p>O pagamento deve ser realizado até a data de vencimento para evitar multas, juros e encargos.</p>
          {invoice.status === "paid" && (
            <div className="mt-4 inline-block px-8 py-3 border-4 border-double border-green-500 text-green-600 rounded-xl font-bold uppercase tracking-widest transform -rotate-2 opacity-80 text-2xl">
              Pago
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

InvoicePDFTemplate.displayName = "InvoicePDFTemplate";
