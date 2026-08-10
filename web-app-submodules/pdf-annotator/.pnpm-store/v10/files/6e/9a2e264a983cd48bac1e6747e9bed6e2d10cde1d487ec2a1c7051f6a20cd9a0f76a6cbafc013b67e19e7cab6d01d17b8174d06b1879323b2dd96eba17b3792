import { defineComponent as C, useAttrs as _, ref as S, watch as E, nextTick as L, createBlock as M, openBlock as $, h as D } from "vue";
const h = {};
function H(n) {
  return n.getIsPending !== void 0;
}
function G(n) {
  if (H(n))
    return n;
  let o = !0, r = n.then(
    (t) => (o = !1, t),
    (t) => {
      throw o = !1, t;
    }
  );
  return r.getIsPending = function() {
    return o;
  }, r;
}
function N(n) {
  let o = {};
  const r = n.attributes;
  if (!r)
    return o;
  for (let t = r.length - 1; t >= 0; t--)
    o[r[t].name] = r[t].value;
  return o;
}
function O(n) {
  return Object.keys(n).reduce((o, r) => (n[r] !== !1 && n[r] !== null && n[r] !== void 0 && (o[r] = n[r]), o), {});
}
function V(n, o) {
  const { class: r, style: t, ...f } = N(n), { class: v, style: i, ...m } = O(o);
  return {
    class: [r, v],
    style: [t, i],
    ...f,
    ...m
  };
}
const R = /* @__PURE__ */ C({
  inheritAttrs: !1,
  __name: "InlineSvg",
  props: {
    src: {},
    title: { default: void 0 },
    transformSource: { type: Function, default: (n) => n },
    keepDuringLoading: { type: Boolean, default: !0 },
    uniqueIds: { type: [Boolean, String], default: !1 },
    uniqueIdsBase: { default: "" }
  },
  emits: ["loaded", "unloaded", "error"],
  setup(n, { expose: o, emit: r }) {
    const t = n, f = r, v = _(), i = S(), m = S(), x = S(), b = Math.random().toString(36).substring(2);
    o({
      svgElSource: i,
      request: x
    }), E(() => t.src, (e) => {
      I(e);
    }), I(t.src);
    function y(e) {
      if (e = /** @type {SVGElement}} */
      e.cloneNode(!0), t.uniqueIds) {
        const s = typeof t.uniqueIds == "string" ? t.uniqueIds : b;
        e = q(e, s, t.uniqueIdsBase);
      }
      return e = t.transformSource(e), t.title && P(e, t.title), e.innerHTML;
    }
    function I(e) {
      h[e] || (h[e] = A(e)), i.value && h[e].getIsPending() && !t.keepDuringLoading && (i.value = null, f("unloaded")), h[e].then((s) => {
        i.value = s, L(() => {
          f("loaded", m.value);
        });
      }).catch((s) => {
        i.value && (i.value = void 0, f("unloaded")), delete h[e], f("error", s);
      });
    }
    function A(e) {
      return G(new Promise((s, l) => {
        const u = new XMLHttpRequest();
        u.open("GET", e, !0), x.value = u, u.onload = () => {
          if (u.status >= 200 && u.status < 400)
            try {
              let a = new DOMParser().parseFromString(u.responseText, "text/xml").getElementsByTagName("svg")[0];
              a ? s(a) : l(new Error('Loaded file is not valid SVG"'));
            } catch (p) {
              l(p);
            }
          else
            l(new Error("Error loading SVG"));
        }, u.onerror = l, u.send();
      }));
    }
    const B = () => i.value ? D(
      "svg",
      {
        ...V(i.value, v),
        innerHTML: y(i.value),
        ref: m
      }
    ) : null;
    function P(e, s) {
      const l = e.getElementsByTagName("title");
      if (l.length)
        l[0].textContent = s;
      else {
        const u = document.createElementNS("http://www.w3.org/2000/svg", "title");
        u.textContent = s, e.insertBefore(u, e.firstChild);
      }
    }
    function q(e, s, l = "") {
      const u = ["id", "href", "xlink:href", "xlink:role", "xlink:arcrole"], p = ["href", "xlink:href"], w = (a, g) => p.includes(a) && (g ? !g.includes("#") : !1);
      return [...e.children].forEach((a) => {
        var g;
        if ((g = a.attributes) != null && g.length) {
          const T = Object.values(a.attributes).map((d) => {
            const c = /url\((.*?)\)/.exec(d.value);
            return c != null && c[1] && (d.value = d.value.replace(c[0], `url(${l}${c[1]}_${s})`)), d;
          });
          u.forEach((d) => {
            const c = T.find((k) => k.name === d);
            c && !w(d, c.value) && (c.value = `${c.value}_${s}`);
          });
        }
        return a.children.length ? q(a, s, l) : a;
      }), e;
    }
    return (e, s) => ($(), M(B));
  }
});
export {
  R as default
};
