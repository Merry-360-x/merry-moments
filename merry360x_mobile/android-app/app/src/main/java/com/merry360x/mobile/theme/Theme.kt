package com.merry360x.mobile.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = Coral,
    background = AppWhite,
    surface = CardGray,
)

private val DarkColors = darkColorScheme(
    primary = Coral,
)

@Composable
fun Merry360xTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = MaterialTheme.typography,
        content = content,
    )
}
