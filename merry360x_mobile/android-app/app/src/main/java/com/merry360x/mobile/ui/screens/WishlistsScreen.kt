package com.merry360x.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.theme.Coral

@Composable
fun WishlistsScreen(
    onGoToExplore: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        
        Spacer(modifier = Modifier.weight(0.3f))
        
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "No saved stays yet",
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold
            )
            
            Text(
                text = "Save listings from Explore and they'll appear here.",
                fontSize = 15.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 32.dp)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Button(
                onClick = onGoToExplore,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Coral)
            ) {
                Text(
                    text = "Go to Explore",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(vertical = 6.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.weight(0.7f))
    }
}
