/* apps/ip/js/19-input.js — input: wheel, drag, touch and keys, wired to the axis and travel.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

function setupAxis() {
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= S.H;
    if (!e.ctrlKey && pullWheel(d)) return;   /* 28-pullback: the first pull */
    setAxis(S.s + (e.ctrlKey ? -d : d) * 0.0022 * axisGain());
  }, { passive: false });

  var drag = null;
  cv.addEventListener('pointerdown', function (e) {
    cv.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, y: e.clientY, x: e.clientX, moved: 0 };
  });
  cv.addEventListener('pointermove', function (e) {
    /* if the button came up somewhere we never heard about — the pointer
     * left the window, the tab lost focus — the drag is over. Without
     * this a stale drag keeps travelling on every later move. */
    if (drag && e.buttons === 0) drag = null;
    if (!S.reduced) {
      S.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      S.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      invalidate();
    }
    S.ptr = { x: e.clientX, y: e.clientY };
    /* cursor first: pick() defers to whichever cell the field resolved, so
     * the two cannot disagree about what is being pointed at */
    setCursor(cursorAt(e.clientX, e.clientY));
    pick(e.clientX, e.clientY);
    if (!drag || drag.id !== e.pointerId) return;
    var dy = e.clientY - drag.y, dxp = e.clientX - drag.x;
    drag.moved += Math.abs(dy) + Math.abs(dxp);
    drag.y = e.clientY; drag.x = e.clientX;
    /* dragging up pulls the instrument back: outward.
       dragging sideways TRAVELS, which is the point of the whole thing.
       shift-drag keeps the old behaviour of walking around the subject. */
    /* the first drag upward from home is the first pull (28-pullback); the
     * rest of that drag leaves the axis to the glide */
    if (dy < 0 && !drag.pulled && pullEligible()) { drag.pulled = true; drag.moved += 99; startPull(); }
    if (Math.abs(dy) > 0 && !drag.pulled) setAxis(S.s - dy * 0.0042 * axisGain());
    if (Math.abs(dxp) > 0) {
      if (e.shiftKey) setYaw(S.yaw - dxp * 0.005);
      else {
        drag.pan = (drag.pan || 0) + dxp;
        var cells = drag.pan / 13;
        if (Math.abs(cells) >= 1) {
          stepAim(cells > 0 ? Math.floor(cells) : Math.ceil(cells));
          drag.pan -= Math.trunc(cells) * 13;
        }
      }
    }
  });
  function end(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var wasTap = drag.moved < 8;
    drag = null;
    if (wasTap) onTap();
  }
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', function () {
    S.ptr = null; setCursor(null);
  });
  window.addEventListener('blur', function () { drag = null; });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;   /* shift is ours */
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    switch (e.key) {
      case 'ArrowUp': case 'PageUp':
        e.preventDefault();
        if (pullEligible()) startPull(); else stepAxis(1);
        break;
      case 'ArrowDown': case 'PageDown':
        e.preventDefault(); stepAxis(-1); break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) setYaw(S.yaw - 0.26); else stepAim(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) setYaw(S.yaw + 0.26); else stepAim(1);
        break;
      case 'Backspace': e.preventDefault(); back(); break;
      case 'Enter': case ' ':
        if (cursor && cursor.field) { e.preventDefault(); onTap(); }
        else return;
        break;
      case 'Home': e.preventDefault(); S.yaw = 0; goHome(); break;
      case 'End': e.preventDefault(); setAxis(S.maxAxis); break;
      case 'Escape':
        if (!el.aboutPanel.hidden) closeAbout();
        else if (el.notePanel && !el.notePanel.hidden) closeNote();
        else goHome();
        break;
      default: return;
    }
    announce();
  });
}
