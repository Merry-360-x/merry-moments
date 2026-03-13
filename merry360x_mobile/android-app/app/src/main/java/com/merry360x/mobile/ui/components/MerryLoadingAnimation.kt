package com.merry360x.mobile.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AirplanemodeActive
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.cos
import kotlin.math.sin

// Icon data
private data class LoadingIcon(
    val icon: ImageVector,
    val color: Color
)

private val loadingIcons = listOf(
    LoadingIcon(Icons.Default.Home, Color(0xFFFF5744)),           // Coral - House
    LoadingIcon(Icons.Default.Apartment, Color(0xFF6699FF)),       // Blue - Apartment
    LoadingIcon(Icons.Default.DirectionsCar, Color(0xFF4DCC80)),   // Green - Car
    LoadingIcon(Icons.Default.AirplanemodeActive, Color(0xFFFF9933)) // Orange - Airplane
)

/**
 * PlayStation-style loading animation with travel icons
 * Icons pulse and scale in sequence
 */
@Composable
fun MerryLoadingAnimation(
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "loading")
    
    // Animate through 0-3 continuously
    val animatedIndex by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 4f,
        animationSpec = infiniteRepeatable(
            animation = tween(1600, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "index"
    )
    
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            loadingIcons.forEachIndexed { index, item ->
                val isActive = animatedIndex.toInt() == index
                val scale = if (isActive) 1.3f else 1f
                val alpha = if (isActive) 1f else 0.4f
                
                Box(
                    modifier = Modifier.size(50.dp),
                    contentAlignment = Alignment.Center
                ) {
                    // Glow effect
                    if (isActive) {
                        Box(
                            modifier = Modifier
                                .size(50.dp)
                                .scale(scale)
                                .alpha(0.3f)
                                .background(item.color, RoundedCornerShape(25.dp))
                        )
                    }
                    
                    Icon(
                        imageVector = item.icon,
                        contentDescription = null,
                        modifier = Modifier
                            .size(28.dp)
                            .scale(scale)
                            .alpha(alpha),
                        tint = item.color
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Loading...",
            fontSize = 14.sp,
            color = Color.Gray
        )
    }
}

/**
 * Full screen loading overlay
 */
@Composable
fun MerryLoadingOverlay(
    message: String = "Loading...",
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.4f)),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.White.copy(alpha = 0.95f),
            shadowElevation = 8.dp
        ) {
            Column(
                modifier = Modifier.padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                MerryLoadingAnimation()
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = message,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF222222)
                )
            }
        }
    }
}

/**
 * Compact circular rotating loading animation
 */
@Composable
fun MerryLoadingCompact(
    modifier: Modifier = Modifier,
    size: Dp = 60.dp
) {
    val infiniteTransition = rememberInfiniteTransition(label = "rotation")
    
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )
    
    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        loadingIcons.forEachIndexed { index, item ->
            val angle = Math.toRadians((index * 90 + rotation).toDouble())
            val radius = size.value / 3
            
            Icon(
                imageVector = item.icon,
                contentDescription = null,
                modifier = Modifier
                    .size(16.dp)
                    .offset(
                        x = (radius * cos(angle)).dp,
                        y = (radius * sin(angle)).dp
                    ),
                tint = item.color
            )
        }
    }
}

/**
 * Bouncing icons loading animation
 */
@Composable
fun MerryLoadingBounce(
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "bounce")
    
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        loadingIcons.forEachIndexed { index, item ->
            val bounce by infiniteTransition.animateFloat(
                initialValue = 0f,
                targetValue = -15f,
                animationSpec = infiniteRepeatable(
                    animation = tween(
                        durationMillis = 500,
                        delayMillis = index * 150,
                        easing = FastOutSlowInEasing
                    ),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "bounce$index"
            )
            
            Icon(
                imageVector = item.icon,
                contentDescription = null,
                modifier = Modifier
                    .size(24.dp)
                    .offset(y = bounce.dp),
                tint = item.color
            )
        }
    }
}

/**
 * Pulsing single icon loading
 */
@Composable
fun MerryLoadingPulse(
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )
    
    Icon(
        imageVector = Icons.Default.Home,
        contentDescription = "Loading",
        modifier = modifier
            .size(48.dp)
            .scale(scale)
            .alpha(alpha),
        tint = Color(0xFFFF5744)
    )
}
