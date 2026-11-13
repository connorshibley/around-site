import{A as e,E as t,O as n,S as r,a as i,d as a,i as o,m as s,s as c}from"./three.module.Dh4Gz07z.js";var l=Math.PI/180;function u(t,n,r=1){let i=t*l,a=n*l;return new e(r*Math.cos(i)*Math.sin(a),r*Math.sin(i),r*Math.cos(i)*Math.cos(a))}function d(d){let f=new a,p=d.length/3,m=new Float32Array(p*3),h=new Float32Array(p);for(let e=0;e<p;e++){let t=u(d[e*3]/100,d[e*3+1]/100);m.set([t.x,t.y,t.z],e*3),h[e]=d[e*3+2]}let g=new i;g.setAttribute(`position`,new o(m,3)),g.setAttribute(`tag`,new o(h,1));let _=new t({transparent:!0,depthWrite:!1,uniforms:{uColor:{value:new c(`#f4ede0`)},uHiColor:{value:new c(`#ff8a5c`)},uHi:{value:new e(0,0,0)},uOpacity:{value:1},uDot:{value:.0125},uProj:{value:1e3},uScale:{value:1}},vertexShader:`
      attribute float tag;
      uniform vec3 uHi;
      uniform float uDot, uProj, uScale;
      varying float vFacing;
      varying float vHi;
      varying float vCountry;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normalize(position));
        vFacing = dot(n, normalize(-mv.xyz));
        vCountry = step(0.5, tag);
        vHi = tag < 0.5 ? 0.0 : (tag < 1.5 ? uHi.x : (tag < 2.5 ? uHi.y : uHi.z));
        // Country dots are packed twice as tightly, so they are drawn smaller.
        float size = mix(1.0, 0.56, vCountry) * (1.0 + vHi * 0.3);
        gl_PointSize = max(1.0, uDot * size * uScale * uProj / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform vec3 uColor, uHiColor;
      uniform float uOpacity;
      varying float vFacing;
      varying float vHi;
      varying float vCountry;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float edge = smoothstep(0.5, 0.36, d);
        float limb = smoothstep(0.02, 0.42, vFacing); // fade toward the silhouette
        float rest = mix(0.82, 0.5, vCountry); // an unlit country sits back
        float a = edge * limb * mix(rest, 1.0, vHi) * uOpacity;
        gl_FragColor = vec4(mix(uColor, uHiColor, vHi), a);
        #include <colorspace_fragment>
      }`}),v=new r(g,_);v.renderOrder=2,f.add(v);let y=new t({uniforms:{uBase:{value:new c(`#1b1210`)},uRim:{value:new c(`#8a4a37`)},uRimPower:{value:2.6},uRimStrength:{value:.55}},vertexShader:`
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform vec3 uBase, uRim;
      uniform float uRimPower, uRimStrength;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), uRimPower);
        // light the upper-left limb a little more, like one warm key light
        float key = 0.6 + 0.4 * max(dot(normalize(vN), normalize(vec3(-0.5, 0.7, 0.5))), 0.0);
        gl_FragColor = vec4(mix(uBase, uRim, f * uRimStrength * key), 1.0);
        #include <colorspace_fragment>
      }`}),b=new s(new n(.992,96,64),y);return b.renderOrder=1,f.add(b),{group:f,dotMaterial:_,bodyMaterial:y,face(e,t,n){f.rotation.set((e-n)*l,-t*l,0,`XYZ`)}}}export{u as n,d as t};