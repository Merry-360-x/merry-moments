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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.data.SupabaseApi
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import kotlinx.coroutines.launch

@Composable
fun TokenReviewScreen(
    api: SupabaseApi,
    token: String,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var accommodationRating by remember { mutableIntStateOf(5) }
    var serviceRating by remember { mutableIntStateOf(5) }
    var comment by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var success by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Leave a Review", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        if (success) {
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF43A047))
                    Spacer(Modifier.width(8.dp))
                    Text("Thank you! Your review has been submitted.", color = Color(0xFF2E7D32), fontWeight = FontWeight.Medium)
                }
            }
        } else {
            Text("Share your experience from your recent stay.", color = Color.Gray)

            error?.let { Text(it, color = Color(0xFFC62828), fontSize = 13.sp) }

            Text("Accommodation Rating", fontWeight = FontWeight.Medium)
            Row {
                (1..5).forEach { star ->
                    IconButton(onClick = { accommodationRating = star }, modifier = Modifier.size(40.dp)) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = if (star <= accommodationRating) Color(0xFFFFC107) else Color.LightGray,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }

            Text("Service Rating", fontWeight = FontWeight.Medium)
            Row {
                (1..5).forEach { star ->
                    IconButton(onClick = { serviceRating = star }, modifier = Modifier.size(40.dp)) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = if (star <= serviceRating) Color(0xFFFFC107) else Color.LightGray,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }

            OutlinedTextField(
                value = comment,
                onValueChange = { comment = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Your comment") },
                minLines = 4,
                shape = RoundedCornerShape(12.dp)
            )

            Button(
                onClick = {
                    scope.launch {
                        loading = true
                        error = null
                        val result = api.submitTokenReview(token, accommodationRating, serviceRating, comment)
                        result.onSuccess { success = true }
                        result.onFailure { error = it.message }
                        loading = false
                    }
                },
                enabled = !loading && token.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Coral),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                if (loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Submit Review", color = Color.White)
            }
        }
    }
}
