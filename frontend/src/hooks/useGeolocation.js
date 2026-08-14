/**
 * Wraps navigator.geolocation in a Promise. Requires HTTPS in production
 * (or localhost for dev) - browsers refuse geolocation on plain HTTP.
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation isn't available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const messages = {
          1: "Location permission denied. Enable it in your browser settings to find the nearest hospital.",
          2: "Couldn't determine your location right now.",
          3: "Location request timed out.",
        };
        reject(new Error(messages[err.code] || "Couldn't get your location."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}
