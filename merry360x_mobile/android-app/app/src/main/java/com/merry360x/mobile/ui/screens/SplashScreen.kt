package com.merry360x.mobile.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AirplanemodeActive
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.R
import com.merry360x.mobile.theme.Coral
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onSplashComplete: () -> Unit
) {
    var logoVisible by remember { mutableStateOf(false) }
    var textVisible by remember { mutableStateOf(false) }
    var loadingVisible by remember { mutableStateOf(false) }
    var activeIconIndex by remember { mutableIntStateOf(0) }
    
    val icons = listOf(
        Icons.Default.Home,
        Icons.Default.Apartment,
        Icons.Default.DirectionsCar,
        Icons.Default.AirplanemodeActive
    )
    
    // Animation values
    val logoScale by animateFloatAsState(
        targetValue = if (logoVisible) 1f else 0.8f,
        animationSpec = tween(500, easing = FastOutSlowInEasing),
        label = "logoScale"
    )
    
    val logoAlpha by animateFloatAsState(
        targetValue = if (logoVisible) 1f else 0f,
        animationSpec = tween(500),
        label = "logoAlpha"
    )
    
    val textAlpha by animateFloatAsState(
        targetValue = if (textVisible) 1f else 0f,
        animationSpec = tween(400),
        label = "textAlpha"
    )
    
    // Launch animations in sequence
    LaunchedEffect(Unit) {
        logoVisible = true
        delay(200)
        textVisible = true
        delay(300)
        loadingVisible = true
        
        // Animate loading icons
        repeat(6) {
            delay(350)
            activeIconIndex = (activeIconIndex + 1) % 4
        }
        
        // Complete splash
        delay(200)
        onSplashComplete()
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Coral.copy(alpha = 0.15f),
                        Color.White,
                        Color(0xFFF8F8FA)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo with glow
            Box(
                contentAlignment = Alignment.Center
            ) {
                // Glow effect
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .scale(logoScale)
                        .alpha(logoAlpha * 0.3f)
                        .blur(30.dp)
                        .background(Coral, CircleShape)
                )
                
                // Logo
                Icon(
                    painter = painterResource(id = R.drawable.ic_splash_logo),
                    contentDescription = "Merry 360x",
                    modifier = Modifier
                        .size(120.dp)
                        .scale(logoScale)
                        .alpha(logoAlpha),
                    tint = Coral
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Brand name
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.alpha(textAlpha)
            ) {
                Text(
                    text = "Merry 360x",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = Coral
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = "Your travel companion",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.Gray
                )
            }
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Loading animation
            AnimatedVisibility(
                visible = loadingVisible,
                enter = fadeIn(tween(300)),
                exit = fadeOut(tween(200))
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    icons.forEachIndexed { index, icon ->
                        val isActive = activeIconIndex == index
                        val scale by animateFloatAsState(
                            targetValue = if (isActive) 1.3f else 1f,
                            animationSpec = tween(250, easing = FastOutSlowInEasing),
                            label = "iconScale$index"
                        )
                        val alpha by animateFloatAsState(
                            targetValue = if (isActive) 1f else 0.4f,
                            animationSpec = tween(250),
                            label = "iconAlpha$index"
                        )
                        
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            modifier = Modifier
                                .size(24.dp)
                                .scale(scale)
                                .alpha(alpha),
                            tint = Coral
                        )
                    }
                }
            }
        }
    }
}
