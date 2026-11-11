/* apps/ip/js/05-state.js — S, the one state object, and the shared element/renderer handles.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ STATE ═══════════════════════════════════════════════════════════ */

var S = {
  home: null,
  source: '',
  where: null,        /* the approximate place our own edge reads for this
                       * connection: {city, region, regionCode, country},
                       * any of them missing. Never asked of anyone else. */
  edgeNet: null,      /* the network the edge saw this visit arrive from:
                       * {asn, org}. The name may be filled in later from
                       * RIPEstat by the AS NUMBER, never by the address. */
  net: null,
  asked: {},          /* cell prefix -> what came back when we asked */
  aim: null,          /* BigInt: the address the instrument is POINTED AT.
                       * starts as yours and stops being yours the moment
                       * the visitor travels. Everything drawn is built
                       * around this, not around home. */
  subject: null,      /* the announced block at the aim, as S.net is for home */
  trail: [],          /* where the aim has been, so there is a way back */
  ptr: null,          /* where the pointer last was, in client pixels, so the
                       * highlight can be recomputed as the camera settles
                       * underneath it. Null when it is off the canvas. */
  sound: false,       /* the ears are off until asked, always */
  guide: true,        /* the guide is ON by default and mutes persistently */
  gone: null,         /* and the coarsest. Together with `been` these are the
                       * two ends of the traverse, so every rung between
                       * them is one the visitor has genuinely passed. */
  been: null,         /* the finest axis actually HELD. The descent leaves a
                       * trail behind it, not a diagram of the hierarchy:
                       * a container is outlined because the visitor went
                       * there, not because it happens to contain them. */
  renderFail: '',     /* why there is no picture, if there is no picture */
  query: null,        /* what the visitor asked the map to show, if anything */
  pickAxis: null,     /* the zoom the last choice was made at; the frame
                       * slides onto that choice as you go in from here */
  shape: null,        /* every block the subject's network announces */
  travelled: false,   /* has this visitor ever gone anywhere */
  s: 0,
  maxAxis: 3,         /* the real depth of THIS address family */
  anchor: 0,          /* the prefix length the ladder is pinned to */
  blockAxis: 1,       /* where on the axis the announced block sits */
  ladder: [],         /* container prefix lengths, deep first */
  rungs: [],          /* what each live slot is showing right now */
  ref: null,          /* the frame every rung positions itself against */
  rungKey: '',
  yaw: 0,
  reduced: false,
  W: 0, H: 0, DPR: 1,
  px: 0, py: 0, tx: 0, ty: 0,
  hot: 0,
  running: false,
  renderer: ''
};

var cv, el = {}, R = null;
