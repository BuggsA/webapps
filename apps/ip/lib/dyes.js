/* ip — the palette.
 *
 * Direction: docs/ip-art-direction.md (LOCKED: Cordage).
 * Colour is DERIVED, never picked per-address: a fixed set of natural dyes
 * in OKLCH, one of which a network selects by its ASN. Nothing here maps
 * address bytes to RGB — that is the failure mode the gate exists to
 * prevent (it hands some visitors a muddy brown form by chance).
 *
 * MAP OF THIS FILE
 *   OKLCH      oklch -> sRGB conversion
 *   DYES       the curated set
 *   SELECT     ASN -> dye, and the ground/linen constants
 */

(function (root) {
  'use strict';

  /* ---- OKLCH ---------------------------------------------------------- */

  function srgbGamma(x) {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  }

  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  // L in 0..1, C in 0..0.4, H in degrees.
  function oklch(L, C, H, alpha) {
    var h = (H * Math.PI) / 180;
    var a = C * Math.cos(h);
    var b = C * Math.sin(h);

    var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    var s_ = L - 0.0894841775 * a - 1.291485548 * b;

    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;

    var r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    var g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    var bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

    var R = Math.round(clamp01(srgbGamma(r)) * 255);
    var G = Math.round(clamp01(srgbGamma(g)) * 255);
    var B = Math.round(clamp01(srgbGamma(bb)) * 255);

    if (alpha === undefined || alpha >= 1) return 'rgb(' + R + ',' + G + ',' + B + ')';
    return 'rgba(' + R + ',' + G + ',' + B + ',' + alpha.toFixed(3) + ')';
  }

  /* ---- DYES ----------------------------------------------------------- */

  // Colours that have been put next to each other on cloth for two thousand
  // years. None is neon, none is muddy, and any pair of them sits together —
  // which is a stronger guarantee than any generated scheme.
  var DYES = [
    { name: 'madder',    L: 0.56, C: 0.145, H: 32 },
    { name: 'cochineal', L: 0.49, C: 0.165, H: 12 },
    { name: 'lac',       L: 0.44, C: 0.135, H: 22 },
    { name: 'safflower', L: 0.67, C: 0.115, H: 18 },
    { name: 'osage',     L: 0.73, C: 0.130, H: 72 },
    { name: 'weld',      L: 0.80, C: 0.135, H: 96 },
    { name: 'myrobalan', L: 0.62, C: 0.070, H: 112 },
    { name: 'verdigris', L: 0.60, C: 0.075, H: 168 },
    { name: 'woad',      L: 0.53, C: 0.085, H: 248 },
    { name: 'indigo',    L: 0.42, C: 0.105, H: 264 },
    { name: 'logwood',   L: 0.43, C: 0.095, H: 318 },
    { name: 'walnut',    L: 0.47, C: 0.060, H: 62 }
  ];

  /* ---- SELECT --------------------------------------------------------- */

  // The ground: dyer's vat / walnut ink. Warm, NOT blue-black — the series
  // already has two dark-blue fields.
  var GROUND = { L: 0.135, C: 0.014, H: 62 };
  var LINEN = { L: 0.885, C: 0.022, H: 86 };

  function dyeForAsn(asn) {
    // A stable, boring spread. Two networks sharing a dye is fine and
    // expected; what matters is that one network always gets the same one.
    var n = Math.abs(asn | 0);
    var i = (n * 2654435761) % DYES.length;
    return DYES[(i + DYES.length) % DYES.length];
  }

  function css(c, alpha, dL) {
    return oklch(clamp01(c.L + (dL || 0)), c.C, c.H, alpha);
  }

  root.IPDyes = {
    oklch: oklch,
    DYES: DYES,
    GROUND: GROUND,
    LINEN: LINEN,
    dyeForAsn: dyeForAsn,
    css: css
  };
})(typeof window !== 'undefined' ? window : globalThis);
