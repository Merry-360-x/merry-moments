package com.merry360x.mobile.data

import com.merry360x.mobile.BuildConfig
import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

object CloudinaryUploader {
    private val client = OkHttpClient()
    
    suspend fun uploadImage(
        context: Context,
        imageUri: Uri,
        folder: String = "uploads"
    ): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val cloudName = BuildConfig.CLOUDINARY_CLOUD_NAME.trim()
            val uploadPreset = BuildConfig.CLOUDINARY_UPLOAD_PRESET.trim()
            if (cloudName.isEmpty() || uploadPreset.isEmpty()) {
                throw IllegalStateException("Cloudinary is not configured")
            }

            val mimeType = context.contentResolver.getType(imageUri)?.takeIf { it.isNotBlank() } ?: "image/jpeg"
            val bytes = context.contentResolver.openInputStream(imageUri)?.use { it.readBytes() }
                ?: throw IllegalStateException("Could not read selected image")
            val fileName = imageUri.lastPathSegment?.substringAfterLast('/')?.ifBlank { null }
                ?: "mobile-upload-${System.currentTimeMillis()}.jpg"

            val body = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("upload_preset", uploadPreset)
                .addFormDataPart("folder", folder)
                .addFormDataPart("file", fileName, bytes.toRequestBody(mimeType.toMediaTypeOrNull()))
                .build()

            val request = Request.Builder()
                .url("https://api.cloudinary.com/v1_1/$cloudName/image/upload")
                .post(body)
                .build()

            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val reason = try {
                        JSONObject(responseBody).optJSONObject("error")?.optString("message")
                    } catch (_: Exception) {
                        null
                    }
                    throw IllegalStateException(reason?.ifBlank { null } ?: "Cloudinary upload failed (${response.code})")
                }

                val secureUrl = JSONObject(responseBody).optString("secure_url", "")
                if (secureUrl.isBlank()) {
                    throw IllegalStateException("Cloudinary did not return secure_url")
                }
                secureUrl
            }
        }
    }
}
