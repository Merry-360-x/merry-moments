package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.merry360x.mobile.data.SearchResultItem
import com.merry360x.mobile.data.SearchResults
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.data.formatDisplayMoney
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import kotlinx.coroutines.launch

@Composable
fun UnifiedSearchResultsScreen(
    api: SupabaseApi,
    initialQuery: String,
    selectedCurrency: String,
    usdRates: Map<String, Double>,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf(initialQuery) }
    var results by remember { mutableStateOf(SearchResults(emptyList(), emptyList(), emptyList())) }
    var loading by remember { mutableStateOf(false) }
    var tabIndex by remember { mutableIntStateOf(0) }
    val tabs = listOf("All", "Properties", "Tours", "Transport")

    fun search() {
        if (query.isBlank()) return
        scope.launch {
            loading = true
            results = api.searchAll(query)
            loading = false
        }
    }

    LaunchedEffect(initialQuery) {
        if (initialQuery.isNotBlank()) search()
    }

    val displayItems = when (tabIndex) {
        1 -> results.properties
        2 -> results.tours
        3 -> results.transport
        else -> results.properties + results.tours + results.transport
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                Text("Search", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
        }

        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search properties, tours, transport...", color = Color(0xFF9E9E9E)) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )
            Spacer(Modifier.height(4.dp))
            Text("Search", color = Coral, fontWeight = FontWeight.Medium, modifier = Modifier.clickable { search() }.padding(vertical = 4.dp))
        }

        item {
            TabRow(selectedTabIndex = tabIndex, containerColor = Color.Transparent, contentColor = Coral) {
                tabs.forEachIndexed { i, title ->
                    Tab(selected = tabIndex == i, onClick = { tabIndex = i }) {
                        Text(title, modifier = Modifier.padding(vertical = 12.dp), fontSize = 13.sp)
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("${results.properties.size} properties", fontSize = 12.sp, color = Color.Gray)
                Text("${results.tours.size} tours", fontSize = 12.sp, color = Color.Gray)
                Text("${results.transport.size} transport", fontSize = 12.sp, color = Color.Gray)
            }
        }

        if (loading) {
            item { CircularProgressIndicator(color = Coral, modifier = Modifier.padding(24.dp)) }
        } else if (displayItems.isEmpty()) {
            item {
                Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = CardGray)) {
                    Text(
                        if (query.isBlank()) "Enter a search term to begin." else "No results found.",
                        modifier = Modifier.padding(16.dp),
                        color = Color.Gray
                    )
                }
            }
        } else {
            items(displayItems, key = { "${it.type}-${it.id}" }) { item ->
                SearchItemCard(item = item, selectedCurrency = selectedCurrency, usdRates = usdRates)
            }
        }

        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun SearchItemCard(item: SearchResultItem, selectedCurrency: String, usdRates: Map<String, Double>) {
    val typeBadgeColor = when (item.type) {
        "property" -> Color(0xFF1565C0)
        "tour" -> Color(0xFF2E7D32)
        "transport" -> Color(0xFF6A1B9A)
        else -> Color.Gray
    }
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = CardGray),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            item.mainImage?.let { url ->
                AsyncImage(
                    model = url,
                    contentDescription = item.title,
                    modifier = Modifier
                        .size(72.dp)
                        .clip(RoundedCornerShape(10.dp)),
                    contentScale = ContentScale.Crop
                )
                Spacer(Modifier.width(12.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        item.type.replaceFirstChar { it.uppercase() },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                        modifier = Modifier
                            .background(typeBadgeColor, RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 1.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    item.location?.let { Text(it, fontSize = 12.sp, color = Color.Gray) }
                }
                Text(item.title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text(formatDisplayMoney(item.price, item.currency, selectedCurrency, usdRates), fontWeight = FontWeight.Bold, color = Coral, fontSize = 14.sp)
            }
        }
    }
}
