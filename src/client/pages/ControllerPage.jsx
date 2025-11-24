import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "../App.css";

function ControllerPage() {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const touchPadRef = useRef(null);
  const isTouchingRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get("room");
    
    if (!room) {
      setError("No room code provided. Please scan the QR code or enter a room code.");
      return;
    }

    setRoomCode(room.toUpperCase());
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Controller connected to server");
      newSocket.emit("controller_connect", room.toUpperCase());
    });

    newSocket.on("controller_connected", (data) => {
      setConnected(true);
      setError("");
      console.log("Controller connected to room:", data.roomCode);
    });

    newSocket.on("controller_error", (data) => {
      setError(data.message || "Failed to connect to room");
      setConnected(false);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
      setError("Disconnected from server");
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleTouchStart = (e) => {
    e.preventDefault();
    if (!socket || !connected) return;
    
    isTouchingRef.current = true;
    hasMovedRef.current = false;
    const touch = e.touches[0];
    const rect = touchPadRef.current.getBoundingClientRect();
    const startX = touch.clientX - rect.left;
    const startY = touch.clientY - rect.top;
    
    touchStartPosRef.current = { x: startX, y: startY };
    lastTouchRef.current = { x: startX, y: startY };
    
    socket.emit("set_cursor_visibility", { roomId: roomCode, isVisible: true });
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!socket || !connected || !isTouchingRef.current) return;
    
    const touch = e.touches[0];
    const rect = touchPadRef.current.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    
    const deltaX = currentX - lastTouchRef.current.x;
    const deltaY = currentY - lastTouchRef.current.y;
    
    // Check if there was any significant movement from the start position
    const totalDeltaX = currentX - touchStartPosRef.current.x;
    const totalDeltaY = currentY - touchStartPosRef.current.y;
    const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
    
    // If moved more than 5 pixels, consider it a drag
    if (totalDistance > 5) {
      hasMovedRef.current = true;
    }
    
    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      socket.emit("cursor_move", {
        roomId: roomCode,
        deltaX: deltaX,
        deltaY: deltaY
      });
    }
    
    lastTouchRef.current = { x: currentX, y: currentY };
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    if (!socket || !connected) return;
    
    if (isTouchingRef.current) {
      // Only emit tap if there was no significant movement (it was a tap, not a drag)
      if (!hasMovedRef.current) {
        socket.emit("tap", { roomId: roomCode });
      }
      isTouchingRef.current = false;
      hasMovedRef.current = false;
    }
  };

  const handleKeyPress = (e) => {
    if (!socket || !connected) return;
    
    let key = e.key;
    if (key === "Enter") {
      key = "Enter";
    } else if (key === "Backspace") {
      key = "Backspace";
    } else if (key.length === 1) {
      key = key;
    } else {
      return;
    }
    
    socket.emit("key_input", { roomId: roomCode, key });
  };

  useEffect(() => {
    if (connected) {
      window.addEventListener("keydown", handleKeyPress);
      return () => {
        window.removeEventListener("keydown", handleKeyPress);
      };
    }
  }, [connected, roomCode, socket]);

  return (
    <div className="controller-page">
      <div className="controller-header">
        <h1>Touch Pad Controller</h1>
        {roomCode && (
          <div className="room-code-display">
            Room: <strong>{roomCode}</strong>
          </div>
        )}
        {connected ? (
          <div className="status connected">Connected</div>
        ) : (
          <div className="status disconnected">Disconnected</div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {connected ? (
        <>
          <div
            ref={touchPadRef}
            className="touch-pad"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="touch-pad-instructions">
              Touch and drag to move cursor
              <br />
              Release to tap
              <br />
              Type to input text
            </div>
          </div>
          <div className="controller-controls">
            <button
              onClick={() => {
                if (socket) {
                  socket.emit("set_cursor_visibility", {
                    roomId: roomCode,
                    isVisible: false
                  });
                }
              }}
              className="hide-cursor-button"
            >
              Hide Cursor
            </button>
            <button
              onClick={() => {
                if (socket) {
                  socket.emit("set_cursor_visibility", {
                    roomId: roomCode,
                    isVisible: true
                  });
                }
              }}
              className="show-cursor-button"
            >
              Show Cursor
            </button>
          </div>
        </>
      ) : (
        <div className="waiting-message">
          {error || "Connecting to room..."}
        </div>
      )}
    </div>
  );
}

export default ControllerPage;

