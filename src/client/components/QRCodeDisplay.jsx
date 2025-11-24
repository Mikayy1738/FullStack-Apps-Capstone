import { useEffect, useRef } from "react";
import QRCode from "qrcode";

function QRCodeDisplay({ assignedRoomCode }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const qrCodeContainer = containerRef.current;

    if (!assignedRoomCode) {
      qrCodeContainer.innerHTML = '<p style="color:red;">Waiting...</p>';
      return;
    }

    const controllerOrigin = window.location.origin;
    const controllerUrl = `${controllerOrigin}/controller?room=${assignedRoomCode}`;
    console.log(`Generating QR Code for Room Code: ${controllerUrl}`);

    qrCodeContainer.innerHTML = `<p>${assignedRoomCode}</p>`;

    const canvas = document.createElement("canvas");
    QRCode.toCanvas(
      canvas,
      controllerUrl,
      {
        width: 128,
        margin: 1,
        errorCorrectionLevel: "L"
      },
      (err) => {
        if (err) {
          console.error("QR Code Generation Error:", err);
          qrCodeContainer.innerHTML += '<p style="color: red;">Error.</p>';
        } else {
          qrCodeContainer.appendChild(canvas);
          console.log("QR Code Generated successfully.");
        }
      }
    );
  }, [assignedRoomCode]);

  return (
    <div 
      ref={containerRef} 
      id="qrCodeContainer"
      className="qr-code-container"
    />
  );
}

export default QRCodeDisplay;
