import "../App.css";
import { useState, useEffect } from "react";
import TagContainer from "./TagContainer";
import TagCreator from "./TagCreator";
import axios from "axios";

const VenueDetailsOverlay = ({venue, visibility, onClose, handleRemoveTag, handleAddTag}) => {
  if (!venue){return <></>}
  console.log(venue)
  const [selectedStarFilter, setSelectedStarFilter] = useState("all");

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

  useEffect(() => {
    if (visibility) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [visibility]);

  return (
    <div 
      style={{
      position: "fixed",
      display: "flex",
      justifyContent: "center",
      zIndex: 9999,
      overflow: "hidden",
      height: "100%",
      width: "100%",
      background: "#000a",
      visibility: visibility ? "auto" : "hidden"
      }}>
      <div 
        data-venue-overlay-scrollable="true"
        style={{
        background: "#eee",
        width: "90%",
        height: "calc(100% - 50px)",
        marginTop: 50,
        padding: 20,
        borderRadius: "12px 12px 0px 0px",
        overflowY: "auto",
        overflowX: "hidden"
      }}>
        <div 
          style={{
          background: "#000b",
          position: "relative",
          width: 80,
          display: 'flex',
          justifyContent: 'center',
          alignItems:"center",
          borderRadius: 20,
          bottom : 10,
          }}
          onClick={onClose}
        >
          <p style={{color: "#ccc"}}>✕ Close</p>
        </div>
        <div className="venue-header">
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
        </div>
        <div className="venue-header">
          <div className="reviews-header">
            <h3>Tags</h3>
          </div >
          <TagContainer tags={venue.tags.map((tag) => ({...tag, onClick: () => {handleRemoveTag(venue.id,tag.id)}}))}/>
          <TagCreator venueID={venue.id} handleAddTag={handleAddTag}/>
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
            <div className="reviews-list" style={{overflowY: "auto", overflowX: "hidden"}}>
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
      </div>
    </div>
  )
}

export default VenueDetailsOverlay;