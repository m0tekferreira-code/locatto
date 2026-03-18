import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

interface GenerateInvoicesRequest {
  mode: 'all' | 'single';
  contract_id?: string;
  reference_month: string;
  auto_billing?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { mode, contract_id, reference_month, auto_billing } = await req.json() as GenerateInvoicesRequest;

    // Validate reference_month
    const refMonth = new Date(reference_month);
    if (isNaN(refMonth.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid reference_month format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating invoices - Mode: ${mode}, User: ${user.id}, Reference: ${reference_month}`);

    // Get contracts
    let contractsQuery = supabase
      .from('contracts')
      .select(`
        *,
        properties (
          id,
          name,
          owner_name
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (mode === 'single' && contract_id) {
      contractsQuery = contractsQuery.eq('id', contract_id);
    }

    const { data: contracts, error: contractsError } = await contractsQuery;

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contracts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contracts || contracts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active contracts found',
          created: 0,
          skipped: 0,
          errors: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as Array<{ contract_id: string; error: string }>
    };

    // Generate invoice number prefix
    const year = refMonth.getFullYear();
    const month = String(refMonth.getMonth() + 1).padStart(2, '0');
    const prefix = `FAT-${year}${month}`;

    // Get existing invoice count for numbering
    const { count: existingCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .like('invoice_number', `${prefix}%`);

    let invoiceCounter = (existingCount || 0) + 1;

    for (const contract of contracts) {
      try {
        // Check if invoice already exists for this contract and reference month
        const { data: existingInvoice } = await supabase
          .from('invoices')
          .select('id')
          .eq('contract_id', contract.id)
          .eq('reference_month', reference_month)
          .single();

        if (existingInvoice) {
          console.log(`Invoice already exists for contract ${contract.id} and month ${reference_month}`);
          results.skipped++;
          continue;
        }

        // Calculate due date based on payment_day
        const paymentDay = contract.payment_day || 5;
        let dueDate = new Date(refMonth);
        
        // If pre_paid, add one month
        if (contract.pre_paid) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        
        dueDate.setDate(paymentDay);

        // Calculate guarantee installment if applicable
        let guaranteeInstallment = 0;
        let guaranteeInstallmentNumber = null;

        if (contract.guarantee_type && contract.guarantee_value && Number(contract.guarantee_value) > 0) {
          // Assuming 12 installments for guarantee
          guaranteeInstallment = Number(contract.guarantee_value) / 12;
          
          // Calculate installment number based on contract start date
          const startDate = new Date(contract.start_date);
          const monthsDiff = (refMonth.getFullYear() - startDate.getFullYear()) * 12 + 
                           (refMonth.getMonth() - startDate.getMonth());
          guaranteeInstallmentNumber = monthsDiff + 1;
          
          // Only add if within 12 months
          if (guaranteeInstallmentNumber > 12) {
            guaranteeInstallment = 0;
            guaranteeInstallmentNumber = null;
          }
        }

        // Calculate extra charges for this month
        const extraCharges = [];
        let extraChargesTotal = 0;

        if (contract.extra_charges && Array.isArray(contract.extra_charges)) {
          const startDate = new Date(contract.start_date);
          
          for (const charge of contract.extra_charges) {
            // Skip if not active
            if (charge.status !== 'active') continue;

            const chargeStartDate = new Date(charge.start_date);
            
            // Skip if charge hasn't started yet
            if (refMonth < chargeStartDate) continue;

            // Calculate months difference
            const monthsDiff = 
              (refMonth.getFullYear() - chargeStartDate.getFullYear()) * 12 + 
              (refMonth.getMonth() - chargeStartDate.getMonth());

            let shouldApplyCharge = false;

            if (charge.charge_until_end) {
              // Apply until contract end
              if (contract.end_date) {
                const contractEndDate = new Date(contract.end_date);
                if (refMonth <= contractEndDate) {
                  shouldApplyCharge = true;
                }
              } else {
                // No end date, apply indefinitely
                shouldApplyCharge = true;
              }
            } else if (charge.installments && monthsDiff < charge.installments) {
              // Apply if within installments period
              shouldApplyCharge = true;
            }

            if (shouldApplyCharge) {
              extraCharges.push({
                id: charge.id,
                description: charge.description,
                charge_type: charge.charge_type,
                value_per_installment: charge.value_per_installment,
                installment_number: monthsDiff + 1,
              });
              extraChargesTotal += Number(charge.value_per_installment);
            }
          }
        }

        const rentalAmount = Number(contract.rental_value);
        const totalAmount = rentalAmount + guaranteeInstallment + extraChargesTotal;

        // Generate invoice number
        const invoiceNumber = `${prefix}-${String(invoiceCounter).padStart(4, '0')}`;
        invoiceCounter++;

        // Create invoice
        const { error: insertError } = await supabase
          .from('invoices')
          .insert({
            user_id: user.id,
            account_id: contract.account_id,
            contract_id: contract.id,
            property_id: contract.property_id,
            reference_month: reference_month,
            due_date: dueDate.toISOString().split('T')[0],
            issue_date: new Date().toISOString().split('T')[0],
            invoice_number: invoiceNumber,
            rental_amount: rentalAmount,
            guarantee_installment: guaranteeInstallment || 0,
            guarantee_installment_number: guaranteeInstallmentNumber,
            total_amount: totalAmount,
            payment_method: contract.payment_method || 'bank_transfer',
            status: 'pending',
            water_amount: 0,
            electricity_amount: 0,
            gas_amount: 0,
            internet_amount: 0,
            condo_fee: 0,
            extra_charges: extraCharges,
            history: [{
              action: 'created',
              timestamp: new Date().toISOString(),
              user_id: user.id,
              auto_generated: auto_billing || false
            }]
          });

        if (insertError) {
          console.error(`Error creating invoice for contract ${contract.id}:`, insertError);
          results.errors.push({
            contract_id: contract.id,
            error: insertError.message
          });
        } else {
          console.log(`Invoice created for contract ${contract.id}`);
          results.created++;

          // Create linked lancamento_financeiro for dashboard sync
          const { data: insertedInvoice } = await supabase
            .from('invoices')
            .select('id')
            .eq('contract_id', contract.id)
            .eq('reference_month', reference_month)
            .single();

          if (insertedInvoice) {
            const refDate = new Date(reference_month);
            const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
              'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const descricao = `Aluguel referente a ${monthNames[refDate.getMonth()]} de ${refDate.getFullYear()}`;

            await supabase
              .from('lancamentos_financeiros')
              .insert({
                user_id: user.id,
                account_id: contract.account_id,
                id_contrato: contract.id,
                id_imovel: contract.property_id,
                invoice_id: insertedInvoice.id,
                tipo: 'receita',
                categoria: 'Aluguel',
                descricao: descricao,
                valor: totalAmount,
                data_vencimento: dueDate.toISOString().split('T')[0],
                status: 'pendente',
              });
          }
        }
      } catch (error) {
        console.error(`Exception processing contract ${contract.id}:`, error);
        results.errors.push({
          contract_id: contract.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${results.created} invoices`,
        ...results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-invoices function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
