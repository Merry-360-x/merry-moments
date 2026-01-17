const fs = require('fs');
const filePath = 'src/pages/HostApplication.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Service-specific fields that should use serviceData instead of formData
const fields = [
  'title', 'location', 'description', 'images', 'currency',
  'property_type', 'price_per_night', 'bedrooms', 'bathrooms', 'max_guests', 'amenities', 'beds',
  'category', 'difficulty', 'duration_days', 'price_per_person', 'max_group_size',
  'vehicle_type', 'seats', 'price_per_day', 'driver_included', 'provider_name'
];

fields.forEach(field => {
  // Replace value={formData.FIELD with value={serviceData.FIELD
  content = content.replace(
    new RegExp(`value=\\{formData\\.${field}([^a-zA-Z_])`, 'g'),
    `value={serviceData.${field}$1`
  );
  
  // Replace formData.FIELD in array operations
  content = content.replace(
    new RegExp(`formData\\.${field}\\.(includes|map|filter)`, 'g'),
    `serviceData.${field}.$1`
  );
  
  // Replace standalone formData.FIELD references
  content = content.replace(
    new RegExp(`([^a-zA-Z_])formData\\.${field}([^a-zA-Z_])`, 'g'),
    `$1serviceData.${field}$2`
  );
});

fs.writeFileSync(filePath, content);
console.log('✅ Updated all service-specific field references');
