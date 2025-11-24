import { useState, useEffect } from "react";
import "../App.css";

function HomePage({ onLogout, onViewVenue }) {
  const [venues, setVenues] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/venues", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setVenues(data);
      }
    } catch (error) {
      console.error("Error loading venues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const url = searchQuery 
        ? `/api/venues?search=${encodeURIComponent(searchQuery)}`
        : "/api/venues";
      const response = await fetch(url, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setVenues(data);
      }
    } catch (error) {
      console.error("Error searching venues:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = venues.filter(venue => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return venue.name.toLowerCase().includes(query) || 
           venue.location.toLowerCase().includes(query);
  });

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Venue Reviews</h1>
        <nav>
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </nav>
      </header>

      <main className="main-content">
        <div className="search-section">
          <input 
            type="text" 
            placeholder="Search venues or locations..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button onClick={handleSearch} className="search-button">Search</button>
        </div>

        {loading ? (
          <div className="loading">Loading venues...</div>
        ) : filteredVenues.length === 0 ? (
          <div className="empty-state">
            <p>No venues found. {searchQuery ? "Try a different search." : "No venues available."}</p>
          </div>
        ) : (
          <div className="venues-grid">
            {filteredVenues.map(venue => (
              <div key={venue.id} className="venue-card">
                <div className="venue-info">
                  <h2>{venue.name}</h2>
                  <p className="venue-location">📍 {venue.location}</p>
                  {venue.description && (
                    <p className="venue-description">{venue.description}</p>
                  )}
                  <div className="venue-rating">
                    <span className="stars">
                      {"★".repeat(Math.floor(venue.rating || 0))}
                      {"☆".repeat(5 - Math.floor(venue.rating || 0))}
                    </span>
                    <span className="rating-number">{venue.rating ? venue.rating.toFixed(1) : "No ratings"}</span>
                    <span className="review-count">({venue.reviewCount || 0} reviews)</span>
                  </div>
                  <button 
                    onClick={() => onViewVenue(venue.id)} 
                    className="view-venue-button"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default HomePage;

