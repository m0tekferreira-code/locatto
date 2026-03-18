import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPT_IA = `Você é um analista financeiro especialista em conciliação bancária de imobiliária. Sua tarefa é conciliar pagamentos recebidos no extrato bancário com a lista de inquilinos ativos e suas faturas em aberto.

Você receberá dois blocos de dados:
1. "pagamentos": array de créditos do extrato bancário (id, nome, data_pagamento, valor, lancamento)
2. "contexto": objeto com:
   - "contratos": array de contratos ativos (id, inquilino, documento, valor_aluguel, dia_vencimento)
   - "faturas_abertas": array de faturas pendentes/vencidas (id, contrato_id, mes_referencia, vencimento, valor, status, numero)

REGRAS DE MATCHING DE NOMES (MUITO IMPORTANTE):
- Faça matching FUZZY: ignore acentos, capitalização, abreviações e nomes truncados.
- Nomes no extrato bancário frequentemente aparecem TRUNCADOS (ex: "LARISSA GABRIELA NICH" = "Larissa Gabriela Nichetti").
- Compare os PRIMEIROS CARACTERES do sobrenome quando o nome do extrato parece cortado.
- Se o primeiro nome E pelo menos parte do segundo nome coincidem, considere um match.
- Nomes compostos podem aparecer parcialmente (ex: "MARIA SILVA" pode ser "Maria da Silva Santos").
- PIX frequentemente mostra apenas o primeiro nome ou nome abreviado.
- Se o campo "lancamento" contém "PIX" ou "TED" e o nome é parcialmente similar a um inquilino, PRIORIZE o match.
- Em caso de dúvida entre match ou não-match, PREFIRA fazer o match e indique na observação que é um match parcial.

REGRAS DE CONCILIAÇÃO:
1. Para cada pagamento, tente encontrar o inquilino correspondente usando as regras de matching acima.
2. Se encontrar o inquilino, busque a fatura aberta mais antiga dele para fazer o match.
3. Compare o valor pago com o valor da fatura:
   - Se valor pago >= valor fatura: status "OK"
   - Se valor pago < valor fatura: status "PARCIAL" (informar diferença)
   - Se mesmo nome aparece mais de uma vez: status "DUPLICADO"
4. Se o pagamento foi feito após o vencimento da fatura: status "ATRASADO", calcular dias_atraso e multa (10% do valor da fatura).
5. Se não encontrar nenhum inquilino correspondente após todas as tentativas: status "NAO_ALUGUEL"
6. Prioridade: CRITICO para PARCIAL ou DUPLICADO, ATENCAO para ATRASADO, NORMAL para OK e NAO_ALUGUEL.

Para cada pagamento retorne:
- id (mesmo id recebido)
- status: OK | ATRASADO | PARCIAL | DUPLICADO | NAO_ALUGUEL
- dias_atraso: número
- multa_devida: valor em reais
- observacao: texto curto explicando o match (ex: "Match com João Silva - Fatura #INV-001 ref. 2025-01" ou "Match parcial: nome truncado 'JOAO SIL' ~ 'João Silva'")
- acao_recomendada: texto curto (ex: "Dar baixa na fatura #INV-001", "Verificar pagamento duplicado", "Sem fatura correspondente")
- prioridade: NORMAL | ATENCAO | CRITICO
- contrato_id: id do contrato matched (ou null)
- fatura_id: id da fatura matched (ou null)
- inquilino_matched: nome do inquilino encontrado (ou null)

Retorne APENAS um array JSON. Nenhum texto fora do JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { pagamentos, contexto } = await req.json();
    if (!pagamentos?.length) throw new Error("Nenhum pagamento recebido.");

    const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!apiKey) throw new Error("AI_GATEWAY_API_KEY não configurada.");
    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL");
    if (!aiGatewayUrl) throw new Error("AI_GATEWAY_URL não configurada.");

    const userContent = JSON.stringify({ pagamentos, contexto: contexto || { contratos: [], faturas_abertas: [] } });

    const resp = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PROMPT_IA },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
        status: 429, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
        status: 402, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI Gateway error:", resp.status, errText);
      throw new Error(`AI Gateway error: ${resp.status}`);
    }

    const data = await resp.json();
    let texto = (data.choices?.[0]?.message?.content ?? "").trim();
    // Strip any markdown code fences or language tags
    texto = texto.replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();
    // Extract JSON array if wrapped in other text
    const arrayMatch = texto.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      console.error("AI response not valid JSON array:", texto.slice(0, 500));
      throw new Error("Resposta da IA não contém um array JSON válido.");
    }
    const resultado = JSON.parse(arrayMatch[0]);

    return new Response(JSON.stringify({ resultado }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analisar-extrato error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
