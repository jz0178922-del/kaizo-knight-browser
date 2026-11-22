/* Kaizo Knight mobile + Xbox controls. No external dependencies. */
(() => {
  'use strict';
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const keyCodes = {
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
    confirm: 'KeyZ', cancel: 'KeyX', menu: 'KeyC'
  };
  const held = new Set();
  const gamepadHeld = new Set();
  const keyEvent = (type, code) => {
    const target = document.activeElement && document.activeElement !== document.body
      ? document.activeElement : canvas;
    const event = new KeyboardEvent(type, {
      key: code.startsWith('Arrow') ? code.replace('Arrow', '') :
        code === 'KeyZ' ? 'z' : code === 'KeyX' ? 'x' : code === 'KeyC' ? 'c' : code,
      code, bubbles: true, cancelable: true, composed: true
    });
    target.dispatchEvent(event);
  };
  function press(name) {
    const code = keyCodes[name];
    if (!code || held.has(code)) return;
    held.add(code); keyEvent('keydown', code);
  }
  function release(name) {
    const code = keyCodes[name];
    if (!code || !held.has(code)) return;
    held.delete(code); keyEvent('keyup', code);
  }
  function bindButton(button, name) {
    const down = e => { e.preventDefault(); button.setPointerCapture?.(e.pointerId); press(name); button.classList.add('pressed'); };
    const up = e => { e.preventDefault(); release(name); button.classList.remove('pressed'); };
    button.addEventListener('pointerdown', down);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => button.addEventListener(t, up));
    button.addEventListener('contextmenu', e => e.preventDefault());
  }

  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = 'mobile-controls.css';
  document.head.appendChild(style);
  const pad = document.createElement('div');
  pad.id = 'mobile-controls';
  pad.setAttribute('aria-label', 'Touch controls');
  pad.innerHTML = `
    <div class="mk-dpad" aria-label="Movement">
      <button data-key="up" aria-label="Up">▲</button>
      <button data-key="left" aria-label="Left">◀</button>
      <button data-key="down" aria-label="Down">▼</button>
      <button data-key="right" aria-label="Right">▶</button>
    </div>
    <div class="mk-actions" aria-label="Actions">
      <button data-key="cancel" aria-label="Cancel or slow">B</button>
      <button data-key="confirm" aria-label="Confirm">A</button>
      <button data-key="menu" aria-label="Menu">MENU</button>
    </div>`;
  document.body.appendChild(pad);
  pad.querySelectorAll('[data-key]').forEach(button => bindButton(button, button.dataset.key));

  // Xbox / standard Gamepad mapping: D-pad or left stick, A=Z, B=X, Start=C.
  const buttonDown = new Set();
  const axisDir = (v, negative, positive, prefix) => {
    if (v < -0.35) return negative;
    if (v > 0.35) return positive;
    return null;
  };
  function pollGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const next = new Set();
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      const b = gp.buttons || [];
      const a = gp.axes || [];
      if (b[12]?.pressed) next.add('up');
      if (b[13]?.pressed) next.add('down');
      if (b[14]?.pressed) next.add('left');
      if (b[15]?.pressed) next.add('right');
      const x = axisDir(a[0] || 0, 'left', 'right');
      const y = axisDir(a[1] || 0, 'up', 'down');
      if (x) next.add(x); if (y) next.add(y);
      if (b[0]?.pressed) next.add('confirm'); // Xbox A
      if (b[1]?.pressed) next.add('cancel');  // Xbox B
      if (b[9]?.pressed) next.add('menu');    // Xbox Start
    }
    for (const name of next) if (!gamepadHeld.has(name)) press(name);
    for (const name of gamepadHeld) if (!next.has(name)) release(name);
    gamepadHeld.clear(); next.forEach(name => gamepadHeld.add(name));
    requestAnimationFrame(pollGamepads);
  }
  window.addEventListener('gamepadconnected', e => {
    const status = document.getElementById('mk-pad-status');
    if (status) status.textContent = 'CONTROLLER CONNECTED';
    console.info('Gamepad connected:', e.gamepad.id);
  });
  window.addEventListener('gamepaddisconnected', () => {
    for (const name of gamepadHeld) release(name);
    gamepadHeld.clear();
  });
  window.addEventListener('blur', () => {
    for (const code of [...held]) {
      const name = Object.keys(keyCodes).find(k => keyCodes[k] === code);
      if (name) release(name);
    }
  });
  canvas.addEventListener('pointerdown', () => canvas.focus());
  pollGamepads();
})();
