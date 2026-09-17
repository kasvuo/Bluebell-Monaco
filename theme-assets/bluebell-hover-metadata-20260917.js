/* Bluebell card video standard — original Shopify MP4, preload="metadata".
 * Prepare paused players before hover; retain their sources on leave.
 * No animation/image playback fallback. See bluebell-video-upload-protocol.json.
 */
(() => {
  'use strict';
  if (window.__bluebellHoverMetadata20260917) return;
  window.__bluebellHoverMetadata20260917 = true;

  const CARD = '.bsc-card[data-motion-src], .bpc-card[data-motion-src]';
  const MOUNT = '[data-motion-mount]';
  const SOURCE_OVERRIDES = {
    'it-girl': 'https://cdn.shopify.com/s/files/1/0837/4521/0624/files/bluebell-it-girl-IMG8553-original-20260912.mp4?v=1789221176',
    'cloud-9': 'https://cdn.shopify.com/s/files/1/0837/4521/0624/files/bluebell-cloud-9-IMG8435-original-20260912.mp4?v=1789221176',
    'happy-hour': 'https://cdn.shopify.com/s/files/1/0837/4521/0624/files/bluebell-happy-hour-IMG8364-final-20260909.mp4?v=1788973343',
    'drama-queen': 'https://cdn.shopify.com/s/files/1/0837/4521/0624/files/bluebell-drama-queen-IMG8456-original-20260914_6ede244f-2f92-4d16-a778-b6fa70edc52d.mp4?v=1789395014'
  };
  const POSITION_OVERRIDES = {
    'it-girl': 'center 50%',
    'cloud-9': 'center 30%',
    'drama-queen': 'center 50%'
  };
  const states = new WeakMap();
  let touchPointer = false;

  const getCard = target => target instanceof Element ? target.closest(CARD) : null;
  const inside = (card, node) => node instanceof Node && card.contains(node);
  const cancelFrame = state => {
    if (state.frame !== null && typeof state.video.cancelVideoFrameCallback === 'function') {
      try { state.video.cancelVideoFrameCallback(state.frame); } catch (_) {}
    }
    state.frame = null;
  };
  const stop = card => {
    if (!card) return;
    card.classList.remove('is-active', 'is-playing');
    const state = states.get(card);
    if (!state) return;
    state.active = false;
    state.request += 1;
    cancelFrame(state);
    try { state.video.pause(); } catch (_) {}
    if (state.video.readyState >= 1) {
      try { state.video.currentTime = 0; } catch (_) {}
    }
    // Deliberately keep the same video element and source: no load()/removal here.
  };
  const stopOthers = current => {
    document.querySelectorAll(CARD).forEach(card => {
      if (card !== current && states.get(card)?.active) stop(card);
    });
  };
  const reveal = (card, state, request) => {
    if (!state.active || state.request !== request || state.video.paused || state.video.readyState < 2) return;
    card.classList.add('is-playing');
  };
  const revealOnFrame = (card, state) => {
    if (!state.active) return;
    cancelFrame(state);
    const request = state.request;
    if (typeof state.video.requestVideoFrameCallback === 'function') {
      state.frame = state.video.requestVideoFrameCallback(() => {
        state.frame = null;
        reveal(card, state, request);
      });
    } else if (state.video.currentTime > 0.01) {
      reveal(card, state, request);
    }
  };

  const prepare = card => {
    const mount = card.querySelector(MOUNT);
    const handle = card.dataset.productHandle || '';
    const src = (SOURCE_OVERRIDES[handle] || card.dataset.motionSrc || '').trim();
    // Invalid/non-MP4 media leaves the existing packshot and link untouched.
    if (!mount || !/\.mp4(?:[?#]|$)/i.test(src)) return null;
    if (card.dataset.motionSrc !== src) card.dataset.motionSrc = src;
    if (card.dataset.motionKind !== 'video') card.dataset.motionKind = 'video';
    const previous = states.get(card);
    if (previous && previous.src === src && previous.video.parentNode === mount) return previous;
    if (previous) stop(card);

    const video = document.createElement('video');
    video.className = 'bluebell-runtime-hover-video';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.autoplay = false;
    video.controls = false;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'metadata');
    video.setAttribute('aria-hidden', 'true');
    const position = POSITION_OVERRIDES[handle];
    if (position) video.style.setProperty('object-position', position, 'important');
    const source = document.createElement('source');
    source.src = src;
    source.type = 'video/mp4';
    video.appendChild(source);
    const state = { video, src, active: false, failed: false, request: 0, frame: null };
    states.set(card, state);
    const fail = () => {
      if (states.get(card) !== state) return;
      state.failed = true;
      stop(card);
    };
    video.addEventListener('error', fail);
    source.addEventListener('error', fail);
    video.addEventListener('playing', () => revealOnFrame(card, state));
    video.addEventListener('timeupdate', () => {
      if (state.active && typeof video.requestVideoFrameCallback !== 'function' && video.currentTime > 0.01) {
        reveal(card, state, state.request);
      }
    });
    mount.replaceChildren(video);
    // This runs during page/section preparation, not on first hover.
    try { video.load(); } catch (_) {}
    return state;
  };

  const start = card => {
    if (!card) return;
    const state = prepare(card);
    if (!state || state.failed || state.active) return;
    stopOthers(card);
    state.active = true;
    state.request += 1;
    const request = state.request;
    card.classList.add('is-active');
    const failedPlay = error => {
      if (!state.active || state.request !== request) return;
      if (error?.name !== 'AbortError') state.failed = true;
      stop(card);
    };
    try {
      const promise = state.video.play();
      if (promise && typeof promise.then === 'function') {
        promise.then(() => {
          if (state.active && state.request === request) revealOnFrame(card, state);
        }).catch(failedPlay);
      }
    } catch (error) { failedPlay(error); }
  };

  const prepareWithin = root => {
    if (root instanceof Element && root.matches(CARD)) prepare(root);
    root.querySelectorAll?.(CARD).forEach(prepare);
    // Existing native cardigan players retain their proven hover handlers.
    root.querySelectorAll?.('[data-bluebell-cardigan-hover-video]').forEach(video => {
      video.preload = 'metadata';
      video.setAttribute('preload', 'metadata');
    });
  };
  const prepareAll = () => prepareWithin(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepareAll, { once: true });
  else prepareAll();
  document.addEventListener('shopify:section:load', event => prepareWithin(event.target));
  new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === 'attributes') {
        if (record.target.matches(CARD)) prepare(record.target);
        return;
      }
      record.addedNodes.forEach(node => { if (node instanceof Element) prepareWithin(node); });
      record.removedNodes.forEach(node => {
        if (!(node instanceof Element) || node.isConnected) return;
        if (node.matches(CARD)) stop(node);
        node.querySelectorAll(CARD).forEach(stop);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-motion-src', 'data-motion-kind'] });

  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const card = getCard(event.target);
    if (!card || inside(card, event.relatedTarget)) return;
    start(card);
  }, true);
  document.addEventListener('pointerout', event => {
    if (event.pointerType === 'touch') return;
    const card = getCard(event.target);
    if (!card || inside(card, event.relatedTarget)) return;
    stop(card);
  }, true);
  document.addEventListener('focusin', event => { const card = getCard(event.target); if (card) start(card); }, true);
  document.addEventListener('focusout', event => {
    const card = getCard(event.target);
    if (!card || inside(card, event.relatedTarget)) return;
    stop(card);
  }, true);
  document.addEventListener('pointerdown', event => { touchPointer = event.pointerType === 'touch'; }, true);
  document.addEventListener('click', event => {
    if (!touchPointer) return;
    const card = getCard(event.target);
    if (!card || card.dataset.touchNavigation === 'direct' || card.classList.contains('is-active')) return;
    const state = prepare(card);
    if (!state || state.failed) return;
    event.preventDefault();
    start(card);
  }, true);
  const stopAll = () => document.querySelectorAll(CARD).forEach(stop);
  document.addEventListener('bluebell:stop-all-hover-videos', stopAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  window.addEventListener('pagehide', stopAll);
  window.addEventListener('pageshow', prepareAll);
})();
