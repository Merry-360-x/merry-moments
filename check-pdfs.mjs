import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mjcnrqwdmdfobsptfnzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qY25ycXdkbWRmb2JzcHRmbnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMDYxNDQsImV4cCI6MjA1ODU4MjE0NH0.JHah-EOfGFvvP2O3LhD9_ciPm0GRhn5FLzKMUxLNfTE'
);

const { data: packages, error } = await supabase
  .from('tour_packages')
  .select('id, title, itinerary_pdf_url')
  .limit(15);

console.log('Error:', error);
console.log('Tour packages count:', packages?.length);
packages?.forEach(p => console.log('-', p.title?.substring(0, 40), '| PDF:', p.itinerary_pdf_url ? 'YES' : 'NO'));
