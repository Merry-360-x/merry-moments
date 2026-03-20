package com.merry360x.mobile.data

import kotlin.math.abs

private val FALLBACK_USD_RATES: Map<String, Double> = mapOf(
    "RWF" to 1.0,
    "USD" to 1455.5,
    "EUR" to 1716.76225,
    "GBP" to 1972.4936,
    "KES" to 11.283036,
    "UGX" to 0.408996,
    "TZS" to 0.563279,
    "BIF" to 0.491231,
    "ZAR" to 89.412093,
    "NGN" to 1.066154,
    "GHS" to 132.559663,
    "CNY" to 209.732456,
    "INR" to 16.118935,
    "AED" to 396.323917,
)

fun defaultUsdRates(): Map<String, Double> = FALLBACK_USD_RATES

private fun normalizeCurrency(code: String?): String = code?.trim()?.uppercase()?.ifBlank { "RWF" } ?: "RWF"

fun convertAmount(
    amount: Double,
    fromCurrency: String?,
    toCurrency: String?,
    usdRates: Map<String, Double>,
): Double {
    val from = normalizeCurrency(fromCurrency)
    val to = normalizeCurrency(toCurrency)
    if (!amount.isFinite()) return 0.0
    if (from == to) return amount

    val rates = if (usdRates.isEmpty()) FALLBACK_USD_RATES else usdRates
    val fromRate = rates[from] ?: FALLBACK_USD_RATES[from] ?: return amount
    val toRate = rates[to] ?: FALLBACK_USD_RATES[to] ?: return amount
    if (fromRate <= 0.0 || toRate <= 0.0) return amount

    val inUsd = if (from == "USD") amount else amount / fromRate
    return if (to == "USD") inUsd else inUsd * toRate
}

private fun formatRounded(value: Double): String {
    val safe = if (!value.isFinite()) 0.0 else value
    val whole = if (abs(safe) < 1.0) 0.0 else safe
    return String.format("%,.0f", whole)
}

fun formatDisplayMoney(
    amount: Double,
    sourceCurrency: String?,
    selectedCurrency: String?,
    usdRates: Map<String, Double>,
): String {
    val target = normalizeCurrency(selectedCurrency)
    val converted = convertAmount(amount, sourceCurrency, target, usdRates)
    return "$target ${formatRounded(converted)}"
}
