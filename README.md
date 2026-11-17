# cas-autologin

Chrome extension that presses Enter on the IIIT CAS login page (`login.iiit.ac.in/cas/...`) once your username and password are prefilled, so you don't have to.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.

## How it works

- `content.js` waits up to 6s for both fields to be filled (by Chrome autofill or a password manager).
- If the values are readable (most password-manager extensions), it submits the form directly.
- Chrome's built-in autofill hides the values from page scripts until you interact with the page, so a scripted submit would send an empty password. In that case the background worker uses the `chrome.debugger` API to send a real click on the password field and a real Enter keypress. Chrome shows its "started debugging this browser" bar for a moment while that happens.
- It won't fire if CAS shows a login error, if it already tried in this tab in the last 20s, or if you start typing or clicking yourself.
- Click the toolbar icon to turn it off or on (badge shows `OFF`).
