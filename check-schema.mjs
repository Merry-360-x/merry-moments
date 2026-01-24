import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://uwgiostcetoxotfnulfm.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

async function checkSchema() {
  // Check property_reviews table structure
  const { data: reviewsData, error: reviewsError } = await supabase
    .from('property_reviews')
    .select('*')
    .limit(1);
  
  console.log('property_reviews query result:', { reviewsData, reviewsError });
  
  // Check support_tickets table structure
  const { data: ticketsData, error: ticketsError } = await supabase
    .from('support_tickets')
    .select('*')
    .limit(1);
  
  console.log('support_tickets query result:', { ticketsData, ticketsError });
}

checkSchema();
