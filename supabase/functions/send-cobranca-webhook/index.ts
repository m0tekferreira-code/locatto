import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Parse body
    const { bucketLabel, invoices } = await req.json();

    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma cobrança informada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookUrl = Deno.env.get("N8N_COBRANCA_WEBHOOK_URL");
    if (!webhookUrl) {
      console.error("N8N_COBRANCA_WEBHOOK_URL not configured");
      return new Response(
        JSON.stringify({ error: "Webhook de cobrança não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send to n8n
    const payload = {
      source: "accordous",
      sent_by: userId,
      sent_at: new Date().toISOString(),
      bucket: bucketLabel,
      total_invoices: invoices.length,
      total_amount: invoices.reduce((s: number, inv: any) => s + Number(inv.total_amount || 0), 0),
      invoices: invoices.map((inv: any) => ({
        invoice_id: inv.id,
        tenant_name: inv.contract?.tenant_name || "N/A",
        tenant_phone: inv.contract?.tenant_phone || "",
        tenant_email: inv.contract?.tenant_email || "",
        property_name: inv.property?.name || "",
        due_date: inv.due_date,
        days_overdue: inv.daysOverdue,
        total_amount: Number(inv.total_amount || 0),
      })),
    };

    console.log(`Sending ${invoices.length} invoices (bucket: ${bucketLabel}) to n8n webhook`);

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await webhookResponse.text();

    if (!webhookResponse.ok) {
      console.error(`n8n webhook failed [${webhookResponse.status}]: ${responseText}`);
      return new Response(
        JSON.stringify({
          error: "Falha ao enviar para o sistema de cobrança",
          status: webhookResponse.status,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Webhook sent successfully. Response: ${responseText}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${invoices.length} cobrança(s) enviada(s) para processamento`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-cobranca-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
