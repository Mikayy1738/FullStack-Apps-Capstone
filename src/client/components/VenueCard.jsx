import TagContainer from "./TagContainer";

const VenueCard = ({venue, tagFilterFn, onViewVenue}) => {
  for (let tag of venue.tags){
    tag.onClick = tagFilterFn(tag)
  }
  return (
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
        <TagContainer tags={venue.tags}/>
        <button 
          onClick={() => onViewVenue(venue.id)} 
          className="view-venue-button"
        >
          View Details
        </button>
      </div>
    </div>
  )
} 

export default VenueCard