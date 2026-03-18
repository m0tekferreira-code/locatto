import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get('account_id');

    if (!accountId) {
      return new Response(
        '<error>account_id parameter is required</error>',
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/xml' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch properties marked for portal publication
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('account_id', accountId)
      .eq('publish_to_portals', true);

    if (propError) {
      console.error('Error fetching properties:', propError);
      return new Response(
        `<error>${propError.message}</error>`,
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/xml' } }
      );
    }

    // Build VrSync XML
    const listings = (properties || []).map((p: any) => {
      const photos = (p.photos || []).map((photoPath: string, idx: number) => {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/property-photos/${photoPath}`;
        return `<Item caption="Foto ${idx + 1}" primary="${idx === 0 ? 'true' : 'false'}">
          <Url>${escapeXml(publicUrl)}</Url>
        </Item>`;
      }).join('\n');

      const coverPhoto = p.cover_photo
        ? `${supabaseUrl}/storage/v1/object/public/property-photos/${p.cover_photo}`
        : '';

      const transactionType = p.transaction_type || 'rent';
      const listingStatus = p.status === 'available' ? 'Active' : 'Inactive';

      // Map property_type to VrSync PropertyType
      const propertyTypeMap: Record<string, string> = {
        'apartment': 'Residential / Apartment',
        'house': 'Residential / Home',
        'commercial': 'Commercial / Building',
        'land': 'Residential / Land Lot',
        'kitnet': 'Residential / Kitnet',
        'sobrado': 'Residential / Sobrado',
        'flat': 'Residential / Flat',
        'rural': 'Residential / Farm Ranch',
        'cobertura': 'Residential / Penthouse',
        'sala_comercial': 'Commercial / Office',
        'loja': 'Commercial / Store',
        'galpao': 'Commercial / Warehouse',
      };

      const vrPropertyType = propertyTypeMap[p.property_type] || 'Residential / Home';

      return `<Listing>
      <ListingID>${escapeXml(p.id)}</ListingID>
      <Title>${escapeXml(p.name)}</Title>
      <TransactionType>${transactionType === 'sale' ? 'For Sale' : transactionType === 'both' ? 'Sale/Rent' : 'For Rent'}</TransactionType>
      <ListDate>${new Date(p.created_at).toISOString().split('T')[0]}</ListDate>
      <LastUpdateDate>${new Date(p.updated_at || p.created_at).toISOString().split('T')[0]}</LastUpdateDate>
      <ListingStatus>${listingStatus}</ListingStatus>
      <Details>
        <PropertyType>${escapeXml(vrPropertyType)}</PropertyType>
        <Description>${escapeXml(p.name + ' - ' + (p.address || ''))}</Description>
        ${p.total_area ? `<LivingArea unit="square metres">${p.total_area}</LivingArea>` : ''}
        ${p.useful_area ? `<UsableArea unit="square metres">${p.useful_area}</UsableArea>` : ''}
        ${p.land_area ? `<LotArea unit="square metres">${p.land_area}</LotArea>` : ''}
        ${p.built_area ? `<ConstructedArea unit="square metres">${p.built_area}</ConstructedArea>` : ''}
        ${p.construction_year ? `<YearBuilt>${p.construction_year}</YearBuilt>` : ''}
      </Details>
      <Location>
        <Country abbreviation="BR">Brasil</Country>
        <State>${escapeXml(p.state || '')}</State>
        <City>${escapeXml(p.city || '')}</City>
        <Neighborhood>${escapeXml(p.neighborhood || '')}</Neighborhood>
        <Address>${escapeXml(p.address || '')}</Address>
        <StreetNumber>${escapeXml(p.number || '')}</StreetNumber>
        <Complement>${escapeXml(p.complement || '')}</Complement>
        <PostalCode>${escapeXml(p.postal_code || '')}</PostalCode>
      </Location>
      <Media>
        ${photos}
      </Media>
    </Listing>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">
  <Header>
    <PublishDate>${new Date().toISOString()}</PublishDate>
    <Provider>Locatto</Provider>
    <SourceFeedUrl>${escapeXml(url.toString())}</SourceFeedUrl>
  </Header>
  <Listings>
    ${listings}
  </Listings>
</ListingDataFeed>`;

    // Log sync
    await supabase.from('portal_sync_logs').insert({
      account_id: accountId,
      portal: 'vrsync',
      action: 'feed_generated',
      status: 'success',
    });

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=900',
      },
    });
  } catch (error) {
    console.error('Error generating feed:', error);
    return new Response(
      `<error>Internal server error</error>`,
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/xml' } }
    );
  }
});

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
