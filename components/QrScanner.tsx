"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

/**
 * QR Scanner props interface
 */
interface QrScannerProps {
  onScan: (data: string) => void;
}

/**
 * QR Code Scanner component using device camera
 * Works on both mobile and desktop devices
 */
export default function QrScanner({ onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  /**
   * Start camera and begin scanning
   */
  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // Start scanning loop
      scanQRCode();
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        "Unable to access camera. Please grant camera permissions and try again."
      );
      setScanning(false);
    }
  };

  /**
   * Stop camera and scanning
   */
  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setScanning(false);
  };

  /**
   * Scan QR code from video stream
   */
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Try to decode QR code using jsQR library
    try {
      // Note: You would need to install jsQR library for actual QR code decoding
      // For now, this is a placeholder for the scanning logic
      // In production, use: import jsQR from "jsqr";
      // const code = jsQR(imageData.data, imageData.width, imageData.height);

      // Simulate QR code detection for demo
      // In production, replace with actual jsQR decoding
    } catch (err) {
      console.error("QR scan error:", err);
    }

    // Continue scanning if still active
    if (scanning) {
      requestAnimationFrame(scanQRCode);
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  /**
   * Manual address input fallback
   */
  const [manualAddress, setManualAddress] = useState("");

  const handleManualSubmit = () => {
    if (manualAddress.trim()) {
      onScan(manualAddress.trim());
      setManualAddress("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-64 object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-[hsl(var(--look-yellow))] rounded-lg"></div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
            <p className="text-red-400 text-center text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {!scanning ? (
          <Button
            onClick={startScanning}
            className="w-full bg-[hsl(var(--look-yellow))] hover:bg-[hsl(var(--look-yellow))]/90 text-white font-semibold py-3"
          >
            Start Camera
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="outline"
            className="w-full bg-[#2a2a2a] border-gray-700 hover:bg-gray-800 text-white py-3"
          >
            Stop Camera
          </Button>
        )}

        {/* Manual entry fallback */}
        <div className="pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Or enter address manually:</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste wallet address"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="flex-1 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--look-yellow))]"
            />
            <Button
              onClick={handleManualSubmit}
              disabled={!manualAddress.trim()}
              className="bg-[hsl(var(--look-yellow))] hover:bg-[hsl(var(--look-yellow))]/90 text-white px-4"
            >
              Use
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Point your camera at a QR code to scan
      </p>
    </div>
  );
}

