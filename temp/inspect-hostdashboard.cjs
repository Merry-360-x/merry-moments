const fs = require('fs');
const path = '/Users/davy/merry-moments/src/pages/HostDashboard.tsx';
const text = fs.readFileSync(path, 'utf8');

const needles = [
  'createHotelRoomDraft',
  'addHotelRoomDraft',
  'hotel_rooms',
  'Hotel created, room import incomplete',
  'Hotel Rooms',
  'Add Room'
];

for (const needle of needles) {
  const idx = text.indexOf(needle);
  console.log('NEEDLE:', needle, 'INDEX:', idx);
  if (idx >= 0) {
    const start = Math.max(0, idx - 250);
    const end = Math.min(text.length, idx + 500);
    console.log(text.slice(start, end));
    console.log('\n---\n');
  }
}
