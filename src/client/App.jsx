import "./App.css";

function App() {
  const venues = [];

  return (
    <div className="App">
      <header className="header">
        <h1>Venue Reviews</h1>
        <nav>
          <a href="#">Home</a>
          <a href="#">Favorites</a>
        </nav>
      </header>

      <main className="main-content">
        <div className="search-section">
          <input 
            type="text" 
            placeholder="Search venues or locations..." 
            className="search-input"
          />
          <button className="search-button">Search</button>
        </div>

        <div className="venues-grid">
          {venues.length === 0 ? (
            <div className="empty-state">
              <p>No venues found. Search to discover local venues.</p>
            </div>
          ) : (
            venues.map(venue => (
              <div key={venue.id} className="venue-card">
                <div className="venue-image">
                  <img src={venue.image} alt={venue.name} />
                </div>
                <div className="venue-info">
                  <h2>{venue.name}</h2>
                  <p className="venue-location">{venue.location}</p>
                  <div className="venue-rating">
                    <span className="stars">{"★".repeat(Math.floor(venue.rating))}{"☆".repeat(5 - Math.floor(venue.rating))}</span>
                    <span className="rating-number">{venue.rating}</span>
                    <span className="review-count">({venue.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
