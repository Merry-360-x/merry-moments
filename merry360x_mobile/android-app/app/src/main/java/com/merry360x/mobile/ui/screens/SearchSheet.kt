package com.merry360x.mobile.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.theme.Coral
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

enum class SearchStep {
    WHERE, WHEN, WHO
}

data class Destination(val name: String, val description: String)

@Composable
fun SearchSheet(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    onSearch: (destination: String, checkIn: LocalDate?, checkOut: LocalDate?, guests: Int) -> Unit = { _, _, _, _ -> }
) {
    val destinations = listOf(
        Destination("Kigali", "Rwanda's capital city"),
        Destination("Musanze", "Gateway to the gorillas"),
        Destination("Rubavu", "Lake Kivu beaches"),
        Destination("Huye", "Cultural heritage center"),
        Destination("Nyungwe", "Rainforest & wildlife"),
        Destination("Akagera", "Safari national park")
    )

    var currentStep by remember { mutableStateOf(SearchStep.WHERE) }
    var destination by remember { mutableStateOf("") }
    var checkInDate by remember { mutableStateOf<LocalDate?>(null) }
    var checkOutDate by remember { mutableStateOf<LocalDate?>(null) }
    var adults by remember { mutableIntStateOf(1) }
    var children by remember { mutableIntStateOf(0) }
    var infants by remember { mutableIntStateOf(0) }

    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn() + slideInVertically { it },
        exit = fadeOut() + slideOutVertically { it }
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color.White
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .size(32.dp)
                            .background(Color.Gray.copy(alpha = 0.1f), CircleShape)
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Close",
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    // Step indicators
                    Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                        SearchStep.entries.forEach { step ->
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.clickable { currentStep = step }
                            ) {
                                Text(
                                    text = step.name.lowercase().replaceFirstChar { it.uppercase() },
                                    fontSize = 14.sp,
                                    fontWeight = if (currentStep == step) FontWeight.SemiBold else FontWeight.Normal,
                                    color = if (currentStep == step) Color.Black else Color.Gray
                                )
                                if (currentStep == step) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Box(
                                        modifier = Modifier
                                            .width(30.dp)
                                            .height(2.dp)
                                            .background(Color.Black)
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))
                    Spacer(modifier = Modifier.size(32.dp))
                }

                HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))

                // Content
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(20.dp)
                ) {
                    when (currentStep) {
                        SearchStep.WHERE -> WhereContent(
                            destination = destination,
                            onDestinationChange = { destination = it },
                            destinations = destinations,
                            onDestinationSelect = { dest ->
                                destination = dest
                                currentStep = SearchStep.WHEN
                            }
                        )
                        SearchStep.WHEN -> WhenContent(
                            checkInDate = checkInDate,
                            checkOutDate = checkOutDate,
                            onDateSelect = { checkIn, checkOut ->
                                checkInDate = checkIn
                                checkOutDate = checkOut
                            },
                            onNext = { currentStep = SearchStep.WHO }
                        )
                        SearchStep.WHO -> WhoContent(
                            adults = adults,
                            children = children,
                            infants = infants,
                            onAdultsChange = { adults = it },
                            onChildrenChange = { children = it },
                            onInfantsChange = { infants = it },
                            destination = destination,
                            checkInDate = checkInDate,
                            checkOutDate = checkOutDate
                        )
                    }
                }

                // Footer
                HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = {
                        destination = ""
                        checkInDate = null
                        checkOutDate = null
                        adults = 1
                        children = 0
                        infants = 0
                        currentStep = SearchStep.WHERE
                    }) {
                        Text(
                            "Clear all",
                            color = Color.Black,
                            fontWeight = FontWeight.Medium,
                            fontSize = 16.sp
                        )
                    }

                    Button(
                        onClick = {
                            onSearch(destination, checkInDate, checkOutDate, adults + children + infants)
                            onDismiss()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Coral),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Search", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun WhereContent(
    destination: String,
    onDestinationChange: (String) -> Unit,
    destinations: List<Destination>,
    onDestinationSelect: (String) -> Unit
) {
    Text(
        "Where to?",
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold
    )

    Spacer(modifier = Modifier.height(20.dp))

    OutlinedTextField(
        value = destination,
        onValueChange = onDestinationChange,
        placeholder = { Text("Search destinations", color = Color.Gray) },
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)
        },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Color.Black,
            unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
            focusedContainerColor = Color.Gray.copy(alpha = 0.05f),
            unfocusedContainerColor = Color.Gray.copy(alpha = 0.05f)
        ),
        singleLine = true
    )

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        "Popular destinations",
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold
    )

    Spacer(modifier = Modifier.height(12.dp))

    val filteredDestinations = if (destination.isEmpty()) {
        destinations
    } else {
        destinations.filter { it.name.contains(destination, ignoreCase = true) }
    }

    Column {
        filteredDestinations.forEachIndexed { index, dest ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onDestinationSelect(dest.name) }
                    .padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Gray.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(dest.name, fontSize = 16.sp, fontWeight = FontWeight.Medium)
                    Text(dest.description, fontSize = 14.sp, color = Color.Gray)
                }
            }

            if (index < filteredDestinations.lastIndex) {
                HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
            }
        }
    }
}

@Composable
private fun WhenContent(
    checkInDate: LocalDate?,
    checkOutDate: LocalDate?,
    onDateSelect: (LocalDate?, LocalDate?) -> Unit,
    onNext: () -> Unit
) {
    var currentMonth by remember { mutableStateOf(YearMonth.now()) }
    var tempCheckIn by remember { mutableStateOf(checkInDate) }
    var tempCheckOut by remember { mutableStateOf(checkOutDate) }

    Text(
        "When's your trip?",
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold
    )

    Spacer(modifier = Modifier.height(20.dp))

    // Date cards
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        DateCard(
            label = "Check-in",
            date = tempCheckIn,
            modifier = Modifier.weight(1f)
        )
        DateCard(
            label = "Check-out",
            date = tempCheckOut,
            modifier = Modifier.weight(1f)
        )
    }

    Spacer(modifier = Modifier.height(20.dp))

    // Calendar
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.Gray.copy(alpha = 0.05f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Month navigation
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { currentMonth = currentMonth.minusMonths(1) }) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Previous")
                }

                Text(
                    text = currentMonth.format(DateTimeFormatter.ofPattern("MMMM yyyy")),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )

                IconButton(onClick = { currentMonth = currentMonth.plusMonths(1) }) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Next")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Weekday headers
            Row(modifier = Modifier.fillMaxWidth()) {
                listOf("Su", "Mo", "Tu", "We", "Th", "Fr", "Sa").forEach { day ->
                    Text(
                        text = day,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center,
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Days grid
            val firstDayOfMonth = currentMonth.atDay(1)
            val daysInMonth = currentMonth.lengthOfMonth()
            val startDayOfWeek = firstDayOfMonth.dayOfWeek.value % 7

            val days = buildList {
                repeat(startDayOfWeek) { add(null) }
                for (day in 1..daysInMonth) {
                    add(currentMonth.atDay(day))
                }
            }

            LazyVerticalGrid(
                columns = GridCells.Fixed(7),
                modifier = Modifier.height(240.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(days) { date ->
                    if (date != null) {
                        val isSelected = date == tempCheckIn || date == tempCheckOut
                        val isInRange = tempCheckIn != null && tempCheckOut != null &&
                                date.isAfter(tempCheckIn) && date.isBefore(tempCheckOut)
                        val isPast = date.isBefore(LocalDate.now())
                        val isToday = date == LocalDate.now()

                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        isSelected -> Color.Black
                                        isInRange -> Color.Gray.copy(alpha = 0.15f)
                                        isToday -> Color.Gray.copy(alpha = 0.1f)
                                        else -> Color.Transparent
                                    }
                                )
                                .clickable(enabled = !isPast) {
                                    when {
                                        tempCheckIn == null -> tempCheckIn = date
                                        tempCheckOut == null -> {
                                            if (date.isAfter(tempCheckIn)) {
                                                tempCheckOut = date
                                                onDateSelect(tempCheckIn, date)
                                            } else {
                                                tempCheckIn = date
                                            }
                                        }
                                        else -> {
                                            tempCheckIn = date
                                            tempCheckOut = null
                                        }
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = date.dayOfMonth.toString(),
                                fontSize = 14.sp,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                color = when {
                                    isPast -> Color.Gray.copy(alpha = 0.4f)
                                    isSelected -> Color.White
                                    else -> Color.Black
                                }
                            )
                        }
                    } else {
                        Spacer(modifier = Modifier.size(36.dp))
                    }
                }
            }
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Flexible options
    Text(
        "Flexible options",
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold
    )

    Spacer(modifier = Modifier.height(12.dp))

    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        items(listOf("Weekend", "Week", "Month")) { option ->
            Card(
                modifier = Modifier
                    .clickable {
                        val today = LocalDate.now()
                        when (option) {
                            "Weekend" -> {
                                val saturday = today.plusDays((6 - today.dayOfWeek.value.toLong() + 7) % 7)
                                tempCheckIn = saturday
                                tempCheckOut = saturday.plusDays(2)
                            }
                            "Week" -> {
                                tempCheckIn = today
                                tempCheckOut = today.plusWeeks(1)
                            }
                            "Month" -> {
                                tempCheckIn = today
                                tempCheckOut = today.plusMonths(1)
                            }
                        }
                        onDateSelect(tempCheckIn, tempCheckOut)
                    }
                    .border(1.dp, Color.Gray.copy(alpha = 0.3f), RoundedCornerShape(999.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                shape = RoundedCornerShape(999.dp)
            ) {
                Text(
                    option,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }

    if (tempCheckIn != null && tempCheckOut != null) {
        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = onNext,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color.Black),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Next", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(vertical = 4.dp))
        }
    }
}

@Composable
private fun DateCard(
    label: String,
    date: LocalDate?,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color.Gray.copy(alpha = 0.1f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(label, fontSize = 12.sp, color = Color.Gray)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = date?.format(DateTimeFormatter.ofPattern("MMM d, yyyy")) ?: "Add date",
                fontSize = 16.sp,
                fontWeight = if (date != null) FontWeight.Medium else FontWeight.Normal,
                color = if (date != null) Color.Black else Color.Gray
            )
        }
    }
}

@Composable
private fun WhoContent(
    adults: Int,
    children: Int,
    infants: Int,
    onAdultsChange: (Int) -> Unit,
    onChildrenChange: (Int) -> Unit,
    onInfantsChange: (Int) -> Unit,
    destination: String,
    checkInDate: LocalDate?,
    checkOutDate: LocalDate?
) {
    Text(
        "Who's coming?",
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold
    )

    Spacer(modifier = Modifier.height(20.dp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.Gray.copy(alpha = 0.05f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            GuestRow(
                title = "Adults",
                subtitle = "Ages 13 or above",
                count = adults,
                minCount = 1,
                onCountChange = onAdultsChange
            )

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 16.dp),
                color = Color.LightGray.copy(alpha = 0.5f)
            )

            GuestRow(
                title = "Children",
                subtitle = "Ages 2-12",
                count = children,
                minCount = 0,
                onCountChange = onChildrenChange
            )

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 16.dp),
                color = Color.LightGray.copy(alpha = 0.5f)
            )

            GuestRow(
                title = "Infants",
                subtitle = "Under 2",
                count = infants,
                minCount = 0,
                onCountChange = onInfantsChange
            )
        }
    }

    if (destination.isNotEmpty()) {
        Spacer(modifier = Modifier.height(20.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.Gray.copy(alpha = 0.05f)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Your trip", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(destination, fontSize = 14.sp, color = Color.Gray)
                }

                if (checkInDate != null && checkOutDate != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "${checkInDate.format(DateTimeFormatter.ofPattern("MMM d"))} - ${checkOutDate.format(DateTimeFormatter.ofPattern("MMM d"))}",
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    val totalGuests = adults + children + infants
                    Text("$totalGuests guest${if (totalGuests == 1) "" else "s"}", fontSize = 14.sp, color = Color.Gray)
                }
            }
        }
    }
}

@Composable
private fun GuestRow(
    title: String,
    subtitle: String,
    count: Int,
    minCount: Int,
    onCountChange: (Int) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(title, fontSize = 16.sp, fontWeight = FontWeight.Medium)
            Text(subtitle, fontSize = 14.sp, color = Color.Gray)
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            IconButton(
                onClick = { if (count > minCount) onCountChange(count - 1) },
                modifier = Modifier
                    .size(32.dp)
                    .border(
                        1.dp,
                        if (count > minCount) Color.Gray else Color.Gray.copy(alpha = 0.3f),
                        CircleShape
                    ),
                enabled = count > minCount
            ) {
                Icon(
                    Icons.Default.Remove,
                    contentDescription = "Remove",
                    modifier = Modifier.size(14.dp),
                    tint = if (count > minCount) Color.Black else Color.Gray.copy(alpha = 0.4f)
                )
            }

            Text(
                count.toString(),
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.width(24.dp),
                textAlign = TextAlign.Center
            )

            IconButton(
                onClick = { onCountChange(count + 1) },
                modifier = Modifier
                    .size(32.dp)
                    .border(1.dp, Color.Gray, CircleShape)
            ) {
                Icon(
                    Icons.Default.Add,
                    contentDescription = "Add",
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}
