-- Corrigir os 5 ex-moradores que estão como active: mudar para inactive e ex_inquilino
UPDATE contacts 
SET status = 'inactive', contact_type = 'ex_inquilino', updated_at = now()
WHERE document IN ('149.923.139-30', '131.983.129-06', '122.737.269-88', '649.893.489-15', '036.740.102-91');

-- Padronizar os 11 ex-moradores já inativos: mudar contact_type para ex_inquilino
UPDATE contacts 
SET contact_type = 'ex_inquilino', updated_at = now()
WHERE document IN ('09598306933', '08293734973', '07720695909', '05870717965', '10472105922', '14992313930', '13198312906', '46276942880', '12738497950', '60416820395', '12273726988', '70950974455', '61727183398', '04924131938')
AND status = 'inactive';