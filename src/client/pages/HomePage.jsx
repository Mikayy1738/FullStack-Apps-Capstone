import { useState, useEffect, useReducer } from "react";
import "../App.css";
import TagContainer from "../components/TagContainer";
import VenueCard from "../components/VenueCard";

function HomePage({ onLogout, onViewVenue }) {
  const [fullVenues, setFullVenues] = useState([]);
  const [venues, setVenues] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const filterTagReducer = (state, {action, payload}) => {
    const acceptedActions = ["remove", "add", "clear"];
    if (!acceptedActions.includes(action)){
      return state;
    }
    let newFilters = [...state.filters];
    switch(action){
      case("remove"):
        newFilters.splice(newFilters.findIndex((tag) => tag.id === payload.id), 1);
        break;
      case("add"):
        newFilters.push(payload);
        break;
      case("clear"):
        newFilters = [];
        break;
      }
      return {...state, filters: newFilters};
  }

  const [{filters}, filterDispatch] = useReducer(filterTagReducer, {filters: []})

  const tagClickToFilterFactory = (tag) => {
    return () => { 
      setVenues((currentVenues) => currentVenues.filter(({tagIDs}) => tagIDs.includes(tag.id)));
      filterDispatch({action: "add", payload: {...tag, onClick: () => {
        filterDispatch({action: "remove", payload: tag});
        setVenues(fullVenues);
      }}})
    }
  }

  useEffect(() => {
    loadVenues();
  }, []);
  
  const loadVenues = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/venues?search=nearby", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setVenues(data);
        setFullVenues(data);
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
        setFullVenues(data);
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
        <TagContainer tags={filters} />
        {loading ? (
          <div className="loading">Loading venues...</div>
        ) : filteredVenues.length === 0 ? (
          <div className="empty-state">
            <p>No venues found. {searchQuery ? "Try a different search." : "No venues available."}</p>
          </div>
        ) : (
          <div className="venues-grid">
            {filteredVenues.map(venue => <VenueCard venue={venue} tagFilterFn={tagClickToFilterFactory}/>)}
          </div>
        )}
      </main>
    </div>
  );
}

export default HomePage;

