export const propertyTypes = ["Hotel", "Apartment", "Room in Apartment", "Villa", "Guesthouse", "Resort", "Lodge", "Motel", "House", "Cabin"];

export const roomPropertyTypeOptions = propertyTypes.map((type) => ({
  value: type,
  label: type === "Hotel" ? "Hotel Room" : type,
}));

export const isHotelPropertyType = (propertyType: string): boolean => 
  String(propertyType || "").toLowerCase() === "hotel";

export const conferenceRoomEquipmentOptions = [
  { value: "tv", label: "TV" },
  { value: "monitor", label: "Monitor" },
  { value: "projector", label: "Projector" },
  { value: "whiteboard", label: "Whiteboard" },
  { value: "sound_system", label: "Sound System" },
  { value: "video_conferencing", label: "Video Conferencing" },
];

export const cancellationPolicies = [
  { value: "strict", label: "Strict - Less refunds" },
  { value: "fair", label: "Fair - Moderate refunds" },
  { value: "lenient", label: "Lenient - More refunds" },
];