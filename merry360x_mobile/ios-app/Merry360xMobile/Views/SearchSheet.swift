import SwiftUI

enum SearchStep: Int, CaseIterable {
    case where_ = 0
    case when_ = 1
    case who = 2
    
    var title: String {
        switch self {
        case .where_: return "Where"
        case .when_: return "When"
        case .who: return "Who"
        }
    }
}

struct SearchSheet: View {
    @Binding var isPresented: Bool
    @State private var currentStep: SearchStep = .where_
    @State private var destination: String = ""
    @State private var checkInDate: Date? = nil
    @State private var checkOutDate: Date? = nil
    @State private var adults: Int = 1
    @State private var children: Int = 0
    @State private var infants: Int = 0
    
    private let destinations = [
        ("Kigali", "Rwanda's capital city"),
        ("Musanze", "Gateway to the gorillas"),
        ("Rubavu", "Lake Kivu beaches"),
        ("Huye", "Cultural heritage center"),
        ("Nyungwe", "Rainforest & wildlife"),
        ("Akagera", "Safari national park")
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button(action: { isPresented = false }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.black)
                        .frame(width: 32, height: 32)
                        .background(Color.gray.opacity(0.1))
                        .clipShape(Circle())
                }
                
                Spacer()
                
                // Step indicators
                HStack(spacing: 20) {
                    ForEach(SearchStep.allCases, id: \.rawValue) { step in
                        VStack(spacing: 4) {
                            Text(step.title)
                                .font(.system(size: 14, weight: currentStep == step ? .semibold : .regular))
                                .foregroundColor(currentStep == step ? .black : .gray)
                            
                            if currentStep == step {
                                Rectangle()
                                    .fill(Color.black)
                                    .frame(width: 30, height: 2)
                            }
                        }
                        .onTapGesture {
                            withAnimation { currentStep = step }
                        }
                    }
                }
                
                Spacer()
                
                // Placeholder for symmetry
                Color.clear.frame(width: 32, height: 32)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)
            
            Divider()
            
            // Content
            ScrollView {
                VStack(spacing: 0) {
                    switch currentStep {
                    case .where_:
                        whereContent
                    case .when_:
                        whenContent
                    case .who:
                        whoContent
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
            }
            
            Spacer()
            
            // Footer
            VStack(spacing: 0) {
                Divider()
                
                HStack {
                    Button(action: clearAll) {
                        Text("Clear all")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.black)
                            .underline()
                    }
                    
                    Spacer()
                    
                    Button(action: search) {
                        HStack(spacing: 8) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 16, weight: .semibold))
                            Text("Search")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 14)
                        .background(AppTheme.coral)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
            }
            .background(Color.white)
        }
        .background(Color.white)
    }
    
    // MARK: - Where Content
    private var whereContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Where to?")
                .font(.system(size: 28, weight: .bold))
            
            // Search input
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("Search destinations", text: $destination)
                    .font(.system(size: 16))
                
                if !destination.isEmpty {
                    Button(action: { destination = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding(16)
            .background(Color.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            
            // Popular destinations
            Text("Popular destinations")
                .font(.system(size: 16, weight: .semibold))
                .padding(.top, 8)
            
            VStack(spacing: 0) {
                ForEach(filteredDestinations, id: \.0) { dest in
                    Button(action: {
                        destination = dest.0
                        withAnimation { currentStep = .when_ }
                    }) {
                        HStack(spacing: 16) {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.gray.opacity(0.2))
                                .frame(width: 48, height: 48)
                                .overlay(
                                    Image(systemName: "mappin.circle.fill")
                                        .foregroundColor(.gray)
                                        .font(.system(size: 20))
                                )
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(dest.0)
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.black)
                                Text(dest.1)
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            }
                            
                            Spacer()
                        }
                        .padding(.vertical, 12)
                    }
                    
                    if dest.0 != filteredDestinations.last?.0 {
                        Divider()
                    }
                }
            }
        }
    }
    
    private var filteredDestinations: [(String, String)] {
        if destination.isEmpty {
            return destinations
        }
        return destinations.filter { $0.0.lowercased().contains(destination.lowercased()) }
    }
    
    // MARK: - When Content
    private var whenContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("When's your trip?")
                .font(.system(size: 28, weight: .bold))
            
            // Date selection cards
            HStack(spacing: 12) {
                DateCard(
                    label: "Check-in",
                    date: checkInDate,
                    placeholder: "Add date"
                ) {
                    // Show date picker
                }
                
                DateCard(
                    label: "Check-out",
                    date: checkOutDate,
                    placeholder: "Add date"
                ) {
                    // Show date picker
                }
            }
            
            // Inline Calendar
            CalendarView(
                checkInDate: $checkInDate,
                checkOutDate: $checkOutDate
            )
            
            // Quick options
            Text("Flexible options")
                .font(.system(size: 16, weight: .semibold))
                .padding(.top, 8)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    FlexibleDateChip(label: "Weekend", isSelected: false) {
                        setWeekend()
                    }
                    FlexibleDateChip(label: "Week", isSelected: false) {
                        setWeek()
                    }
                    FlexibleDateChip(label: "Month", isSelected: false) {
                        setMonth()
                    }
                }
            }
            
            if checkInDate != nil && checkOutDate != nil {
                Button(action: {
                    withAnimation { currentStep = .who }
                }) {
                    Text("Next")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.black)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.top, 8)
            }
        }
    }
    
    // MARK: - Who Content
    private var whoContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Who's coming?")
                .font(.system(size: 28, weight: .bold))
            
            VStack(spacing: 0) {
                GuestRow(
                    title: "Adults",
                    subtitle: "Ages 13 or above",
                    count: $adults,
                    minCount: 1
                )
                
                Divider().padding(.vertical, 16)
                
                GuestRow(
                    title: "Children",
                    subtitle: "Ages 2-12",
                    count: $children,
                    minCount: 0
                )
                
                Divider().padding(.vertical, 16)
                
                GuestRow(
                    title: "Infants",
                    subtitle: "Under 2",
                    count: $infants,
                    minCount: 0
                )
            }
            .padding(20)
            .background(Color.gray.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            
            // Summary
            if !destination.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your trip")
                        .font(.system(size: 16, weight: .semibold))
                    
                    HStack {
                        Image(systemName: "mappin.circle")
                        Text(destination)
                    }
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
                    
                    if let checkIn = checkInDate, let checkOut = checkOutDate {
                        HStack {
                            Image(systemName: "calendar")
                            Text("\(formatDate(checkIn)) - \(formatDate(checkOut))")
                        }
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                    }
                    
                    HStack {
                        Image(systemName: "person.2")
                        Text("\(totalGuests) guest\(totalGuests == 1 ? "" : "s")")
                    }
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.gray.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
    
    // MARK: - Helper Properties & Methods
    private var totalGuests: Int {
        adults + children + infants
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
    
    private func clearAll() {
        destination = ""
        checkInDate = nil
        checkOutDate = nil
        adults = 1
        children = 0
        infants = 0
        currentStep = .where_
    }
    
    private func search() {
        // TODO: Implement search navigation
        isPresented = false
    }
    
    private func setWeekend() {
        let calendar = Calendar.current
        let today = Date()
        // Find next Saturday
        var components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)
        components.weekday = 7 // Saturday
        if let saturday = calendar.nextDate(after: today, matching: DateComponents(weekday: 7), matchingPolicy: .nextTime) {
            checkInDate = saturday
            checkOutDate = calendar.date(byAdding: .day, value: 2, to: saturday)
        }
    }
    
    private func setWeek() {
        let calendar = Calendar.current
        let today = Date()
        checkInDate = today
        checkOutDate = calendar.date(byAdding: .day, value: 7, to: today)
    }
    
    private func setMonth() {
        let calendar = Calendar.current
        let today = Date()
        checkInDate = today
        checkOutDate = calendar.date(byAdding: .month, value: 1, to: today)
    }
}

// MARK: - Supporting Views

struct DateCard: View {
    let label: String
    let date: Date?
    let placeholder: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.system(size: 12))
                    .foregroundColor(.gray)
                
                if let date = date {
                    Text(formatDate(date))
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.black)
                } else {
                    Text(placeholder)
                        .font(.system(size: 16))
                        .foregroundColor(.gray)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Color.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }
}

struct FlexibleDateChip: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(isSelected ? .white : .black)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(isSelected ? Color.black : Color.gray.opacity(0.1))
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(Color.gray.opacity(0.3), lineWidth: isSelected ? 0 : 1)
                )
        }
    }
}

struct GuestRow: View {
    let title: String
    let subtitle: String
    @Binding var count: Int
    let minCount: Int
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16, weight: .medium))
                Text(subtitle)
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            HStack(spacing: 16) {
                Button(action: { if count > minCount { count -= 1 } }) {
                    Image(systemName: "minus")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(count > minCount ? .black : .gray.opacity(0.4))
                        .frame(width: 32, height: 32)
                        .overlay(
                            Circle()
                                .stroke(count > minCount ? Color.gray : Color.gray.opacity(0.3), lineWidth: 1)
                        )
                }
                .disabled(count <= minCount)
                
                Text("\(count)")
                    .font(.system(size: 16, weight: .medium))
                    .frame(width: 24)
                
                Button(action: { count += 1 }) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.black)
                        .frame(width: 32, height: 32)
                        .overlay(
                            Circle()
                                .stroke(Color.gray, lineWidth: 1)
                        )
                }
            }
        }
    }
}

struct CalendarView: View {
    @Binding var checkInDate: Date?
    @Binding var checkOutDate: Date?
    @State private var currentMonth: Date = Date()
    
    private let calendar = Calendar.current
    private let columns = Array(repeating: GridItem(.flexible()), count: 7)
    private let weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
    
    var body: some View {
        VStack(spacing: 16) {
            // Month navigation
            HStack {
                Button(action: previousMonth) {
                    Image(systemName: "chevron.left")
                        .foregroundColor(.black)
                }
                
                Spacer()
                
                Text(monthYearString)
                    .font(.system(size: 16, weight: .semibold))
                
                Spacer()
                
                Button(action: nextMonth) {
                    Image(systemName: "chevron.right")
                        .foregroundColor(.black)
                }
            }
            
            // Weekday headers
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(weekdays, id: \.self) { day in
                    Text(day)
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                        .frame(height: 20)
                }
            }
            
            // Days grid
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(daysInMonth, id: \.self) { date in
                    if let date = date {
                        DayCell(
                            date: date,
                            isSelected: isSelected(date),
                            isInRange: isInRange(date),
                            isToday: calendar.isDateInToday(date),
                            isPast: date < calendar.startOfDay(for: Date())
                        ) {
                            selectDate(date)
                        }
                    } else {
                        Text("")
                            .frame(height: 36)
                    }
                }
            }
        }
        .padding(16)
        .background(Color.gray.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
    
    private var monthYearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: currentMonth)
    }
    
    private var daysInMonth: [Date?] {
        let components = calendar.dateComponents([.year, .month], from: currentMonth)
        guard let firstDay = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: currentMonth) else {
            return []
        }
        
        let firstWeekday = calendar.component(.weekday, from: firstDay)
        var days: [Date?] = Array(repeating: nil, count: firstWeekday - 1)
        
        for day in range {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: firstDay) {
                days.append(date)
            }
        }
        
        return days
    }
    
    private func isSelected(_ date: Date) -> Bool {
        if let checkIn = checkInDate, calendar.isDate(date, inSameDayAs: checkIn) {
            return true
        }
        if let checkOut = checkOutDate, calendar.isDate(date, inSameDayAs: checkOut) {
            return true
        }
        return false
    }
    
    private func isInRange(_ date: Date) -> Bool {
        guard let checkIn = checkInDate, let checkOut = checkOutDate else { return false }
        return date > checkIn && date < checkOut
    }
    
    private func selectDate(_ date: Date) {
        if checkInDate == nil {
            checkInDate = date
        } else if checkOutDate == nil {
            if let checkIn = checkInDate, date > checkIn {
                checkOutDate = date
            } else {
                checkInDate = date
            }
        } else {
            checkInDate = date
            checkOutDate = nil
        }
    }
    
    private func previousMonth() {
        if let newMonth = calendar.date(byAdding: .month, value: -1, to: currentMonth) {
            currentMonth = newMonth
        }
    }
    
    private func nextMonth() {
        if let newMonth = calendar.date(byAdding: .month, value: 1, to: currentMonth) {
            currentMonth = newMonth
        }
    }
}

struct DayCell: View {
    let date: Date
    let isSelected: Bool
    let isInRange: Bool
    let isToday: Bool
    let isPast: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text("\(Calendar.current.component(.day, from: date))")
                .font(.system(size: 14, weight: isSelected ? .semibold : .regular))
                .foregroundColor(textColor)
                .frame(width: 36, height: 36)
                .background(backgroundColor)
                .clipShape(Circle())
        }
        .disabled(isPast)
    }
    
    private var textColor: Color {
        if isPast { return .gray.opacity(0.4) }
        if isSelected { return .white }
        return .black
    }
    
    private var backgroundColor: Color {
        if isSelected { return .black }
        if isInRange { return .gray.opacity(0.15) }
        if isToday { return .gray.opacity(0.1) }
        return .clear
    }
}

#Preview {
    SearchSheet(isPresented: .constant(true))
}
