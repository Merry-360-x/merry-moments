const fs = require('fs');
const path = '/Users/davy/merry-moments/src/pages/HostDashboard.tsx';
let text = fs.readFileSync(path, 'utf8');

const replacements = [
  {
    old: `  const addHotelRoomDraft = () => {
    setPropertyForm((form) => ({
      ...form,
      hotel_rooms: [...form.hotel_rooms, createHotelRoomDraft(form.hotel_rooms.length + 1, form.title)],
    }));
  };
`,
    neu: `  const addHotelRoomDrafts = (count = 1) => {
    setPropertyForm((form) => ({
      ...form,
      hotel_rooms: [
        ...form.hotel_rooms,
        ...Array.from({ length: Math.max(1, count) }, (_, index) =>
          createHotelRoomDraft(form.hotel_rooms.length + index + 1, form.title)
        ),
      ],
    }));
  };

  const addHotelRoomDraft = () => {
    addHotelRoomDrafts(1);
  };
`
  },
  {
    old: `  const hasValidHotelRoomDrafts = () => {
    if (!isHotelPropertyType(propertyForm.property_type)) return true;
    if (propertyForm.hotel_rooms.length === 0) return false;

    return propertyForm.hotel_rooms.every((room) => {
      if (!room.title.trim()) return false;
      if (Math.max(1, Number(room.max_guests || 0)) <= 0) return false;
      if (Math.max(1, Number(room.beds || 0)) <= 0) return false;
      if (room.listing_mode === "monthly_only") {
        return Number(room.price_per_month || 0) > 0;
      }
      if (Number(room.price_per_night || 0) <= 0) return false;
      if (room.available_for_monthly_rental && room.price_per_month !== null) {
        return Number(room.price_per_month || 0) >= 0;
      }
      return true;
    });
  };
`,
    neu: `  const hasValidHotelRoomDrafts = () => {
    if (!isHotelPropertyType(propertyForm.property_type)) return true;
    if (propertyForm.hotel_rooms.length === 0) return false;

    return propertyForm.hotel_rooms.every((room) => {
      if (!room.title.trim()) return false;
      if (Math.max(1, Number(room.max_guests || 0)) <= 0) return false;
      if (Math.max(1, Number(room.beds || 0)) <= 0) return false;
      if (room.listing_mode === "monthly_only") {
        return Number(room.price_per_month || 0) > 0;
      }
      if (Number(room.price_per_night || 0) <= 0) return false;
      if (room.available_for_monthly_rental && room.price_per_month !== null) {
        return Number(room.price_per_month || 0) >= 0;
      }
      return true;
    });
  };

  const createHotelRoomsForProperty = async (hotelId: string, hotelName: string) => {
    const hotelRoomDrafts = isHotelPropertyType(propertyForm.property_type) ? propertyForm.hotel_rooms : [];
    if (!hotelId || hotelRoomDrafts.length === 0) return { createdCount: 0, error: null as unknown };

    let createdCount = 0;

    for (const room of hotelRoomDrafts) {
      const roomIsMonthlyOnly = room.listing_mode === "monthly_only";
      const roomTitle = room.title.trim();
      const roomPayload: Record<string, unknown> = {
        hotel_id: hotelId,
        host_id: user!.id,
        is_published: true,
        name: roomTitle,
        title: roomTitle,
        location: propertyForm.location.trim(),
        address: propertyForm.address.trim() || null,
        property_type: room.property_type || "Hotel Room",
        description: room.description.trim() || propertyForm.description.trim() || \`Room at \${hotelName}\`,
        price_per_night: roomIsMonthlyOnly ? 0 : Number(room.price_per_night || 0),
        price_per_month: room.price_per_month ? Number(room.price_per_month) : null,
        available_for_monthly_rental: roomIsMonthlyOnly ? true : Boolean(room.available_for_monthly_rental),
        monthly_only_listing: roomIsMonthlyOnly,
        currency: propertyForm.currency || "RWF",
        max_guests: Math.max(1, Number(room.max_guests || 1)),
        bedrooms: 1,
        bathrooms: Math.max(0, Number(room.bathrooms || 0)),
        beds: Math.max(1, Number(room.beds || 1)),
        amenities: propertyForm.amenities?.length > 0 ? propertyForm.amenities : null,
        cancellation_policy: propertyForm.cancellation_policy || null,
        images: room.images.length > 0 ? room.images : (propertyForm.images.length > 0 ? propertyForm.images : null),
        main_image: room.images[0] ?? propertyForm.images[0] ?? null,
        weekly_discount: 0,
        monthly_discount: 0,
        check_in_time: propertyForm.check_in_time || "14:00",
        check_out_time: propertyForm.check_out_time || "11:00",
        smoking_allowed: Boolean(propertyForm.smoking_allowed),
        events_allowed: Boolean(propertyForm.events_allowed),
        pets_allowed: Boolean(propertyForm.pets_allowed),
        breakfast_available: Boolean(propertyForm.breakfast_available),
        breakfast_price_per_night: propertyForm.breakfast_available
          ? (propertyForm.breakfast_price_per_night ? Number(propertyForm.breakfast_price_per_night) : null)
          : null,
      };

      const { error: roomError } = await runPropertiesMutationWithFallback(
        async (payloadInput) => {
          const response = await supabase.from("properties").insert(payloadInput as never);
          return { error: response.error, data: response.data };
        },
        roomPayload
      );

      if (roomError) {
        return { createdCount, error: roomError };
      }

      createdCount += 1;
    }

    return { createdCount, error: null as unknown };
  };
`
  },
  {
    old: `      const hotelRoomDrafts = isHotelPropertyType(propertyForm.property_type) ? propertyForm.hotel_rooms : [];

      if (newProp?.id && hotelRoomDrafts.length > 0) {
        for (const room of hotelRoomDrafts) {
          const roomIsMonthlyOnly = room.listing_mode === "monthly_only";
          const roomTitle = room.title.trim();
          const roomPayload: Record<string, unknown> = {
            hotel_id: newProp.id,
            host_id: user!.id,
            is_published: true,
            name: roomTitle,
            title: roomTitle,
            location: propertyForm.location.trim(),
            address: propertyForm.address.trim() || null,
            property_type: room.property_type || "Hotel Room",
            description: room.description.trim() || propertyForm.description.trim() || \`Room at \${propertyName}\`,
            price_per_night: roomIsMonthlyOnly ? 0 : Number(room.price_per_night || 0),
            price_per_month: room.price_per_month ? Number(room.price_per_month) : null,
            available_for_monthly_rental: roomIsMonthlyOnly ? true : Boolean(room.available_for_monthly_rental),
            monthly_only_listing: roomIsMonthlyOnly,
            currency: propertyForm.currency || "RWF",
            max_guests: Math.max(1, Number(room.max_guests || 1)),
            bedrooms: 1,
            bathrooms: Math.max(0, Number(room.bathrooms || 0)),
            beds: Math.max(1, Number(room.beds || 1)),
            amenities: propertyForm.amenities?.length > 0 ? propertyForm.amenities : null,
            cancellation_policy: propertyForm.cancellation_policy || null,
            images: room.images.length > 0 ? room.images : (propertyForm.images.length > 0 ? propertyForm.images : null),
            main_image: room.images[0] ?? propertyForm.images[0] ?? null,
            weekly_discount: 0,
            monthly_discount: 0,
            check_in_time: propertyForm.check_in_time || "14:00",
            check_out_time: propertyForm.check_out_time || "11:00",
            smoking_allowed: Boolean(propertyForm.smoking_allowed),
            events_allowed: Boolean(propertyForm.events_allowed),
            pets_allowed: Boolean(propertyForm.pets_allowed),
            breakfast_available: Boolean(propertyForm.breakfast_available),
            breakfast_price_per_night: propertyForm.breakfast_available
              ? (propertyForm.breakfast_price_per_night ? Number(propertyForm.breakfast_price_per_night) : null)
              : null,
          };

          const { error: roomError } = await runPropertiesMutationWithFallback(
            async (payloadInput) => {
              const response = await supabase.from("properties").insert(payloadInput as never);
              return { error: response.error, data: response.data };
            },
            roomPayload
          );

          if (roomError) {
            logError("host.hotelRoom.create", roomError);
            toast({
              variant: "destructive",
              title: "Hotel created, room import incomplete",
              description: uiErrorMessage(roomError, "The hotel was created but one or more rooms could not be saved."),
            });
            break;
          }
        }

        await fetchData({ silent: true });
      } else {
`,
    neu: `      const hotelRoomDrafts = isHotelPropertyType(propertyForm.property_type) ? propertyForm.hotel_rooms : [];

      if (newProp?.id && hotelRoomDrafts.length > 0) {
        const { createdCount, error: roomError } = await createHotelRoomsForProperty(newProp.id, propertyName);

        if (roomError) {
          logError("host.hotelRoom.create", roomError);
          toast({
            variant: "destructive",
            title: "Hotel created, room import incomplete",
            description: uiErrorMessage(roomError, \`The hotel was created, but only \${createdCount} of \${hotelRoomDrafts.length} rooms were saved.\`),
          });
        }

        await fetchData({ silent: true });
      } else {
`
  },
  {
    old: `                        <Button type="button" variant="outline" size="sm" onClick={addHotelRoomDraft}>
                          <Plus className="w-4 h-4 mr-2" /> Add Room
                        </Button>
`,
    neu: `                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => addHotelRoomDrafts(3)}>
                            <Plus className="w-4 h-4 mr-2" /> Add 3 Rooms
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={addHotelRoomDraft}>
                            <Plus className="w-4 h-4 mr-2" /> Add Room
                          </Button>
                        </div>
`
  }
];

for (const { old, neu } of replacements) {
  if (!text.includes(old)) {
    throw new Error('Replacement target not found');
  }
  text = text.replace(old, neu);
}

fs.writeFileSync(path, text);
console.log('patched');
