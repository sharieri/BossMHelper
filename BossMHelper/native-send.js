(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantNativeSend = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isBossChatUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'www.zhipin.com' && url.pathname === '/web/geek/chat';
    } catch { return false; }
  }

  function typeCommands(text) {
    return [...String(text || '')].map((character) => ({
      method: 'Input.dispatchKeyEvent',
      params: { type: 'char', text: character, unmodifiedText: character }
    }));
  }

  function replaceTypeCommands(text) {
    const controlA = { method: 'Input.dispatchKeyEvent', params: { type: 'keyDown', key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 } };
    return [
      controlA,
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2 } },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: 2 } },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyUp', key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 } },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 } },
      { method: 'Input.dispatchKeyEvent', params: { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 } },
      ...typeCommands(text)
    ];
  }

  return { isBossChatUrl, typeCommands, replaceTypeCommands };
});
