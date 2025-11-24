import { useState, useEffect } from "react";
import "../App.css";

function VenueDetailsPage({ venueId, onBack, onLogout }) {
  const [venue, setVenue] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditVenueForm, setShowEditVenueForm] = useState(false);
  const [editVenueData, setEditVenueData] = useState({ name: "", location: "", description: "" });
  const [error, setError] = useState("");
  const [selectedStarFilter, setSelectedStarFilter] = useState("all");

  useEffect(() => {
    loadCurrentUser();
    loadVenueDetails();
  }, [venueId]);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch("/api/user/me", {
        credentials: "include"
      });
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const loadVenueDetails = async () => {
    setLoading(true);
    try {
      const venueRes = await fetch(`/api/venues/${venueId}`, { credentials: "include" });

      if (venueRes.ok) {
        const venueData = await venueRes.json();
        setVenue(venueData);
        setEditVenueData({
          name: venueData.name,
          location: venueData.location,
          description: venueData.description || ""
        });
      }
    } catch (error) {
      console.error("Error loading venue details:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateVenue = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch(`/api/venues/${venueId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(editVenueData)
      });

      if (response.ok) {
        setShowEditVenueForm(false);
        loadVenueDetails();
      } else if (response.status === 403) {
        setError("You don't have permission to edit this venue.");
      } else {
        setError("Failed to update venue. Please try again.");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleDeleteVenue = async () => {
    if (!window.confirm("Are you sure you want to delete this venue? This will also delete all reviews.")) {
      return;
    }

    try {
      const response = await fetch(`/api/venues/${venueId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok || response.status === 204) {
        onBack();
      } else if (response.status === 403) {
        setError("You don't have permission to delete this venue.");
      }
    } catch (error) {
      console.error("Error deleting venue:", error);
    }
  };


  const getTopReviewsByStar = (starRating) => {
    if (!venue?.googleReviews) return [];
    const filtered = venue.googleReviews.filter(r => r.rating === starRating);
    return filtered.slice(0, 5);
  };

  const getReviewsByCategory = () => {
    if (selectedStarFilter === "all") {
      const categories = {};
      for (let i = 1; i <= 5; i++) {
        const topReviews = getTopReviewsByStar(i);
        if (topReviews.length > 0) {
          categories[i] = topReviews;
        }
      }
      return categories;
    } else {
      const rating = parseInt(selectedStarFilter);
      return { [rating]: getTopReviewsByStar(rating) };
    }
  };


  return (
    <div className="venue-details-page">
      
      <header className="home-header">
        <h1>Venue Reviews</h1>
        <nav>
          <button onClick={onBack} className="back-button">← Back</button>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </nav>
      </header>

      {loading ? (
        <div className="loading">Loading venue details...</div>
      ) : !venue ? (
        <div className="error-message">Venue not found</div>
      ) : (
      <main className="venue-details-content">
        <div className="venue-header">
          {showEditVenueForm ? (
            <div className="edit-venue-form">
              <h3>Edit Venue</h3>
              <form onSubmit={handleUpdateVenue}>
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={editVenueData.name}
                    onChange={(e) => setEditVenueData({...editVenueData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location:</label>
                  <input
                    type="text"
                    value={editVenueData.location}
                    onChange={(e) => setEditVenueData({...editVenueData, location: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={editVenueData.description}
                    onChange={(e) => setEditVenueData({...editVenueData, description: e.target.value})}
                    rows={4}
                  />
                </div>
                {error && <div className="error-message">{error}</div>}
                <div className="form-actions">
                  <button type="submit" className="submit-button">Save Changes</button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditVenueForm(false);
                      setError("");
                    }} 
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <h2>{venue.name}</h2>
              <p className="venue-location">📍 {venue.location}</p>
              {venue.description && (
                <p className="venue-description">{venue.description}</p>
              )}
              <div className="venue-rating-large">
                <span className="stars-large">
                  {"★".repeat(Math.floor(venue.rating || 0))}
                  {"☆".repeat(5 - Math.floor(venue.rating || 0))}
                </span>
                <span className="rating-number-large">
                  {venue.rating ? venue.rating.toFixed(1) : "No ratings"}
                </span>
                <span className="review-count-large">
                  ({venue.reviewCount || 0} reviews)
                </span>
              </div>
            </>
          )}
        </div>

        {venue.googleReviews && venue.googleReviews.length > 0 && (
          <div className="reviews-section">
            <div className="reviews-header">
              <h3>Google Reviews</h3>
            </div>
            <div className="star-filter-tabs">
              <button
                className={selectedStarFilter === "all" ? "star-filter-tab active" : "star-filter-tab"}
                onClick={() => setSelectedStarFilter("all")}
              >
                All
              </button>
              {[5, 4, 3, 2, 1].map(rating => {
                const count = venue.googleReviews.filter(r => r.rating === rating).length;
                if (count === 0) return null;
                return (
                  <button
                    key={rating}
                    className={selectedStarFilter === String(rating) ? "star-filter-tab active" : "star-filter-tab"}
                    onClick={() => setSelectedStarFilter(String(rating))}
                  >
                    {"★".repeat(rating)}{"☆".repeat(5 - rating)} ({count})
                  </button>
                );
              })}
            </div>
            <div className="reviews-list">
              {Object.entries(getReviewsByCategory()).map(([starRating, categoryReviews]) => (
                <div key={starRating} className="star-category-section">
                  {selectedStarFilter === "all" && (
                    <h4 className="category-header">
                      {"★".repeat(parseInt(starRating))}{"☆".repeat(5 - parseInt(starRating))} - Top {categoryReviews.length}
                    </h4>
                  )}
                  {categoryReviews.map((review, index) => (
                    <div key={index} className="review-card google-review-card">
                      <div className="review-header">
                        <div className="review-user">
                          {review.profile_photo_url && (
                            <img 
                              src={review.profile_photo_url} 
                              alt={review.author_name}
                              className="review-profile-photo"
                            />
                          )}
                          <div>
                            <strong>{review.author_name}</strong>
                            <span className="review-rating">
                              {"★".repeat(review.rating)}
                              {"☆".repeat(5 - review.rating)}
                            </span>
                            {review.relative_time_description && (
                              <span className="review-time">{review.relative_time_description}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {review.text && (
                        <p className="review-comment">{review.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      )}
    </div>
  );
}

export default VenueDetailsPage;

