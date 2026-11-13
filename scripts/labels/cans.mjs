// Where each can sits in its mock-up photo, and which parts of the label are
// decoration to keep. Angles are degrees round the can from its front centre;
// "t" is the way down the printed label (0 = top edge, 1 = bottom edge).
//
// `band(cx, R, yTop, labelPx, bowTop, bowBottom)`: the can's centre line and
// radius in the photo, the photo row where the print starts, how many pixels
// tall the print is, and how far a level line on the can rises (negative) by
// the time it reaches the can's edge, at the top and bottom of the label.
const band = (cx, R, yTop, labelPx, bowA, bowB) => ({ cx, R, yA: yTop, yB: yTop + labelPx, tA: 0, tB: 1, bowA, bowB });
// The globe in the logo: its centre (angle, t) and radius in label pixels.
const globe = { a: -13.3, t: 0.3657, r: 73 };

export const cans = {
  mexico: {
    parts: [{ f: 'mexico.png', x: 0, y: 0 }], w: 756, h: 742, lightInk: false, inkL: 40,
    full: band(397, 141, 64, 640, -10, -14),
    topEnd: 0.25, bottomStart: 0.695, globe,
    window: [{ t: 0.086, a0: -33.5, a1: 33.5 }],
  },
  italy: {
    // Two captures of the same photo, magnified 1.144x; the second starts 439px down.
    parts: [{ f: 'italy-top.png', x: 0, y: 0 }, { f: 'italy-bottom.png', x: 0, y: 439 }], w: 665, h: 823, lightInk: false, inkL: 75,
    full: band(380.5, 156.5, 88, 718, -11, -15),
    topEnd: 0.25, bottomStart: 0.668, globe,
    window: [{ t: 0.075, a0: -27, a1: 27 }, { t: 0.125, a0: -33, a1: 33 }],
  },
  japan: {
    parts: [{ f: 'japan-left.png', x: 0, y: 0 }, { f: 'japan-right.png', x: 780, y: 0 }], w: 1397, h: 780, lightInk: true, inkL: 235,
    full: band(697.5, 140.5, 85, 630, -10, -14),
    topEnd: 0.25, bottomStart: 0.69, globe,
    window: [{ t: 0.075, a0: -33.5, a1: 33.5 }],
  },
};
