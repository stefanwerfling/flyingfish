// PWA bootstrap: point the manifest link at the current origin and register the
// service worker. Externalized from an inline <script> so the CSP scriptSrc can
// drop 'unsafe-inline'.
document.querySelector('#manifest-placeholder').setAttribute('href', window.location.origin + '/manifest.json');

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('dist/service-worker.js');
}
