// Toggle on/off by clicking the toolbar icon.
async function syncBadge() {
  const { enabled = true } = await chrome.storage.local.get('enabled');
  await chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
  await chrome.action.setTitle({
    title: `CAS Autologin: ${enabled ? 'ON' : 'OFF'} (click to toggle)`,
  });
}
chrome.runtime.onInstalled.addListener(syncBadge);
chrome.runtime.onStartup.addListener(syncBadge);
chrome.action.onClicked.addListener(async () => {
  const { enabled = true } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({ enabled: !enabled });
  await syncBadge();
});

// Trusted input via the DevTools protocol. A real (trusted) gesture makes Chrome
// commit autofilled credentials, which a scripted submit can't do.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'pressEnter' || !sender.tab?.id) return;
  const target = { tabId: sender.tab.id };
  const send = (method, params) => chrome.debugger.sendCommand(target, method, params);

  (async () => {
    try {
      await chrome.debugger.attach(target, '1.3');
      const mouse = { x: msg.x, y: msg.y, button: 'left', clickCount: 1 };
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...mouse });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...mouse });
      const enter = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', text: '\r', ...enter });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...enter });
    } catch (e) {
      console.warn('CAS Autologin: failed to press Enter', e);
    } finally {
      try { await chrome.debugger.detach(target); } catch {}
    }
  })();
});
