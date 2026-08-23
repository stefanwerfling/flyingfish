// Resolve the conflict between the jQuery UI 'button' widget and Bootstrap's
// button by bridging jQuery UI's button as 'uibutton'. Externalized from an
// inline <script> so the CSP scriptSrc can drop 'unsafe-inline'.
$.widget.bridge('uibutton', $.ui.button);
