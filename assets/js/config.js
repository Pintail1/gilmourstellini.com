/* Site configuration.
   Contact form: create a free form at https://formspree.io (or a similar service such as Web3Forms or Basin),
   set its destination to gilmourstellini@icloud.com, and paste the form's endpoint URL below, e.g.
   window.GS_FORM_ENDPOINT = 'https://formspree.io/f/abcdwxyz';
   The endpoint is a public form address, not a secret key. Leave it empty to fall back to opening the visitor's email app. */
window.GS_MODE = 'site';
window.GS_BASE = '/';
window.GS_FORM_ENDPOINT = '';
/* Easiest free option (no subscription): get a free access key at https://web3forms.com by entering
   gilmourstellini@icloud.com, then paste it below. Both the contact form and review product orders are then
   emailed to you (free plan: 250 submissions a month, no file attachments). Leave the endpoints above/below empty. */
window.GS_WEB3FORMS_KEY = 'e9a15c6a-aaca-425c-b0a8-1a00373415c2';
/* Review product orders (NFC cards / QR table stands).
   GS_ORDER_ENDPOINT: a form endpoint that emails you each order, e.g. a second Formspree form ('https://formspree.io/f/xxxx')
   with gilmourstellini@icloud.com as the recipient. Each order arrives as a readable email: reference, product, design,
   quantity, business name, wording, Google review link, QR check result, contact details and notes.
   GS_ORDER_FILES: set to true only if your form plan accepts file uploads; the QR artwork (SVG) and the customer's logo
   are then attached to the email. With false, the email says whether a logo was uploaded and the customer is asked to reply with it.
   GS_CHECKOUT_URL: optional payment link (e.g. a Stripe Payment Link). The order reference is passed as client_reference_id. */
window.GS_ORDER_ENDPOINT = '';
window.GS_ORDER_FILES = false;
window.GS_CHECKOUT_URL = '';
