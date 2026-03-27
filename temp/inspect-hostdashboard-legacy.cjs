const fs = require('fs');
const path = '/Users/davy/merry-moments/src/pages/HostDashboard.tsx';
const text = fs.readFileSync(path, 'utf8');

const needles = [
  'Related Rooms',
  'related rooms',
  'save the hotel first',
  'Save the hotel first',
  'hotel_id',
  'showRoomWizard',
  'showPropertyWizard',
  'selectedHotelRoomIds',
  'roomWizardStep',
  'Create Room',
  'Hotel Room',
  'conference_room',
  'propertyWizardEditId'
];

for (const needle of needles) {
  const idx = text.indexOf(needle);
  console.log('NEEDLE:', needle, 'INDEX:', idx);
  if (idx >= 0) {
    const start = Math.max(0, idx - 400);
    const end = Math.min(text.length, idx + 800);
    console.log(text.slice(start, end));
    console.log('\n---\n');
  }
}
