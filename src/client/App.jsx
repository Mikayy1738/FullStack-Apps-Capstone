import { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import VenueDetailsPage from "./pages/VenueDetailsPage";
import ControllerPage from "./pages/ControllerPage";
import QRCodeDisplay from "./components/QRCodeDisplay";
import { useRemoteControl } from "./hooks/useRemoteControl";

function App() {
  const { assignedRoomCode } = useRemoteControl();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("home");
  const [selectedVenueId, setSelectedVenueId] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/controller") {
      setCurrentView("controller");
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/user/me", {
        credentials: "include"
      });
      setIsAuthenticated(response.ok);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/user/logout", {
        method: "POST",
        credentials: "include"
      });
      setIsAuthenticated(false);
      setCurrentView("home");
      setSelectedVenueId(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleViewVenue = (venueId) => {
    setSelectedVenueId(venueId);
    setCurrentView("venue-details");
  };

  const handleBackToHome = () => {
    setCurrentView("home");
    setSelectedVenueId(null);
  };

  if (window.location.pathname === "/controller") {
    return <ControllerPage />;
  }

  return (
    <>
      <div id="remote-cursor"></div>
      <QRCodeDisplay assignedRoomCode={assignedRoomCode} />
      {loading ? (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100vh",
          fontSize: "1.2rem",
          color: "#666"
        }}>
          Loading...
        </div>
      ) : !isAuthenticated ? (
        <AuthPage onLogin={checkAuth} />
      ) : currentView === "venue-details" ? (
        <VenueDetailsPage 
          venueId={selectedVenueId}
          onBack={handleBackToHome}
          onLogout={handleLogout}
        />
      ) : (
        <HomePage onLogout={handleLogout} onViewVenue={handleViewVenue} />
      )}
    </>
  );
}

export default App;
