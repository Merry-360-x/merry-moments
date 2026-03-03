package com.merry360x.mobile.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.merry360x.mobile.data.CityWithCount
import com.merry360x.mobile.data.Listing
import com.merry360x.mobile.data.SupabaseApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CitySection(
    val city: String,
    val count: Int,
    val listings: List<Listing>
)

data class HomeUiState(
    val loading: Boolean = false,
    val listings: List<Listing> = emptyList(),
    val tours: List<Listing> = emptyList(),
    val cars: List<Listing> = emptyList(),
    val events: List<Listing> = emptyList(),
    val cities: List<CityWithCount> = emptyList(),
    val citySections: List<CitySection> = emptyList(),
    val error: String? = null,
)

class HomeViewModel(
    private val api: SupabaseApi,
) : ViewModel() {
    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    private fun extractRegion(location: String): String {
        val tokens = location
            .split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }

        if (tokens.isEmpty()) return "Other"
        if (tokens.size == 1) return tokens.first()

        val broadValues = setOf(
            "kigali", "rwanda", "rw", "gasabo", "nyarugenge", "kicukiro",
            "rubavu", "musanze", "huye", "bugesera", "nyanza", "karongi"
        )

        return if (broadValues.contains(tokens.first().lowercase())) {
            tokens[1]
        } else {
            tokens.first()
        }
    }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val stayDeferred = async { api.fetchFeaturedListings(limit = 1000) }
                val toursDeferred = async { api.fetchTours(limit = 300) }
                val carsDeferred = async { api.fetchCars(limit = 300) }
                val eventsDeferred = async { api.fetchEvents(limit = 300) }

                val listings = stayDeferred.await()
                val tours = toursDeferred.await()
                val cars = carsDeferred.await()
                val events = eventsDeferred.await()

                val grouped = listings.groupBy { listing -> extractRegion(listing.location) }

                val sections = grouped
                    .map { (region, regionListings) ->
                        CitySection(region, regionListings.size, regionListings)
                    }
                    .sortedWith(compareByDescending<CitySection> { it.count }.thenBy { it.city.lowercase() })

                val cities = sections.map { CityWithCount(it.city, it.count) }
                
                _state.value = _state.value.copy(
                    loading = false,
                    listings = listings,
                    tours = tours,
                    cars = cars,
                    events = events,
                    cities = cities,
                    citySections = sections
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = e.message ?: "Failed to load")
            }
        }
    }
}
