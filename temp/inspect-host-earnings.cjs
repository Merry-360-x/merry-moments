const fs = require('fs');
const path = '/Users/davy/merry-moments/src/pages/HostDashboard.tsx';
const text = fs.readFileSync(path, 'utf8');
const needles = [
  'const filteredBookingsById = useMemo(() => {',
  'const filteredReportBookings = useMemo(() => {',
  'const confirmedBookings = (bookings || []).filter((b) => {',
  'const totalNetEarnings = confirmedBookings.reduce((sum, b) => {'
];
for (const needle of needles) {
  const idx = text.indexOf(needle);
  console.log('NEEDLE:', needle, 'INDEX:', idx);
  if (idx >= 0) {
    const start = Math.max(0, idx - 220);
    const end = Math.min(text.length, idx + 1600);
    console.log(text.slice(start, end));
    console.log('\n---\n');
  }
}
