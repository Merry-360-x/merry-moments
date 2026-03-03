package com.merry360x.mobile.ui.screens

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.merry360x.mobile.theme.CardGray
import com.merry360x.mobile.theme.Coral
import com.merry360x.mobile.viewmodel.AuthUiState

private enum class AuthTab {
    EMAIL, PHONE
}

@Composable
fun LoginScreenNew(
    uiState: AuthUiState,
    onEmail: (String) -> Unit,
    onPassword: (String) -> Unit,
    onPhone: (String) -> Unit = {},
    onSignIn: () -> Unit,
    onSignInWithApple: () -> Unit = {},
    onSignInWithGoogle: () -> Unit = {},
    onSignUp: () -> Unit = {},
    onForgotPassword: () -> Unit = {}
) {
    var selectedTab by remember { mutableStateOf(AuthTab.EMAIL) }
    var passwordVisible by remember { mutableStateOf(false) }
    var phoneNumber by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(60.dp))
        
        // Logo
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(CardGray),
            contentAlignment = Alignment.Center
        ) {
            Text("🎯", fontSize = 28.sp)
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Welcome back",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold
        )
        
        Text(
            text = "Sign in to continue",
            fontSize = 15.sp,
            color = Color.Gray
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Auth Card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(CardGray)
                .padding(20.dp)
        ) {
            // Tab Selector
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.White)
                    .padding(4.dp)
            ) {
                AuthTabButton(
                    icon = "✉️",
                    title = "Email",
                    isSelected = selectedTab == AuthTab.EMAIL,
                    onClick = { selectedTab = AuthTab.EMAIL },
                    modifier = Modifier.weight(1f)
                )
                
                AuthTabButton(
                    icon = "📞",
                    title = "Phone",
                    isSelected = selectedTab == AuthTab.PHONE,
                    onClick = { selectedTab = AuthTab.PHONE },
                    modifier = Modifier.weight(1f)
                )
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            when (selectedTab) {
                AuthTab.EMAIL -> {
                    // Email Field
                    Text(
                        text = "Email",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                    
                    OutlinedTextField(
                        value = uiState.email,
                        onValueChange = onEmail,
                        placeholder = { Text("Enter your email", color = Color.Gray) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color.LightGray,
                            focusedBorderColor = Coral,
                            unfocusedContainerColor = Color.White,
                            focusedContainerColor = Color.White
                        ),
                        singleLine = true
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Password Field
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Password",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                        
                        Text(
                            text = "Forgot password?",
                            fontSize = 13.sp,
                            color = Coral,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.clickable(onClick = onForgotPassword)
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(6.dp))
                    
                    OutlinedTextField(
                        value = uiState.password,
                        onValueChange = onPassword,
                        placeholder = { Text("Enter your password", color = Color.Gray) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color.LightGray,
                            focusedBorderColor = Coral,
                            unfocusedContainerColor = Color.White,
                            focusedContainerColor = Color.White
                        ),
                        singleLine = true,
                        visualTransformation = if (passwordVisible) 
                            VisualTransformation.None 
                        else 
                            PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) 
                                        Icons.Default.Visibility 
                                    else 
                                        Icons.Default.VisibilityOff,
                                    contentDescription = "Toggle password visibility",
                                    tint = Color.Gray
                                )
                            }
                        }
                    )
                }
                
                AuthTab.PHONE -> {
                    Text(
                        text = "Phone Number",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                    
                    OutlinedTextField(
                        value = phoneNumber,
                        onValueChange = { 
                            phoneNumber = it
                            onPhone(it)
                        },
                        placeholder = { Text("+250 7XX XXX XXX", color = Color.Gray) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color.LightGray,
                            focusedBorderColor = Coral,
                            unfocusedContainerColor = Color.White,
                            focusedContainerColor = Color.White
                        ),
                        singleLine = true
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // Sign In Button
            Button(
                onClick = onSignIn,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (uiState.email.isNotEmpty() && uiState.password.isNotEmpty()) 
                        Coral 
                    else 
                        Color.LightGray
                ),
                enabled = !uiState.loading
            ) {
                Text(
                    text = if (uiState.loading) "Signing in..." else "Sign In",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(vertical = 6.dp)
                )
            }
            
            uiState.error?.let { error ->
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = error,
                    color = Color.Red,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Divider
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            HorizontalDivider(
                modifier = Modifier.weight(1f),
                color = Color.LightGray
            )
            Text(
                text = "or",
                color = Color.Gray,
                fontSize = 14.sp,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            HorizontalDivider(
                modifier = Modifier.weight(1f),
                color = Color.LightGray
            )
        }
        
        Spacer(modifier = Modifier.height(20.dp))
        
        // Apple Sign In
        Button(
            onClick = onSignInWithApple,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color.Black)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text("", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Sign in with Apple",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    modifier = Modifier.padding(vertical = 6.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Google Sign In
        Button(
            onClick = onSignInWithGoogle,
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color.LightGray, RoundedCornerShape(12.dp)),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color.White)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text("G", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Continue with Google",
                    color = Color.Black,
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp,
                    modifier = Modifier.padding(vertical = 6.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Sign Up Link
        Row {
            Text(
                text = "Don't have an account? ",
                color = Color.Gray,
                fontSize = 14.sp
            )
            Text(
                text = "Sign up",
                color = Coral,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable(onClick = onSignUp)
            )
        }
        
        Spacer(modifier = Modifier.height(40.dp))
    }
}

@Composable
private fun AuthTabButton(
    icon: String,
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(if (isSelected) Coral else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Text(icon, fontSize = 14.sp)
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = if (isSelected) Color.White else Color.Gray
            )
        }
    }
}
