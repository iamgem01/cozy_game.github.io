(function () {
  'use strict';

  // Helper compatible with both Three.js r128 and r149+
  function makeCapsuleGeo(radius, length, capSegs = 8, radialSegs = 14) {
    if (THREE.CapsuleGeometry) {
      return new THREE.CapsuleGeometry(radius, length, capSegs, radialSegs);
    }
    const geo = new THREE.CylinderGeometry(radius, radius, length + radius * 1.6, radialSegs, 4);
    return geo;
  }

  const SKY_MOODS = [
    {
      name: 'Ban mai',
      lucideIcon: 'sun',
      toast: 'Bình minh hồng đào ấm áp trải nhẹ trên tầng mây',
      topColor: new THREE.Color('#9db7ff'),
      midColor: new THREE.Color('#f4bbcf'),
      botColor: new THREE.Color('#f5dcbf'),
      fogColor: new THREE.Color('#fbcfdd'),
      sunColor: new THREE.Color('#f8e3bd'),
      hemiSky: new THREE.Color('#b6ccf5'),
      hemiGround: new THREE.Color('#ffd8c9'),
      sunIntensity: 1.05,
      hemiIntensity: 0.88,
      starAlpha: 0.12
    },
    {
      name: 'Hoàng hôn',
      lucideIcon: 'sunset',
      toast: 'Hoàng hôn tím mơ nhuộm hồng những cánh buồm gió',
      topColor: new THREE.Color('#7768c6'),
      midColor: new THREE.Color('#ffaec9'),
      botColor: new THREE.Color('#ffe0b5'),
      fogColor: new THREE.Color('#f5dcf0'),
      sunColor: new THREE.Color('#ffc7a6'),
      hemiSky: new THREE.Color('#d8c4ff'),
      hemiGround: new THREE.Color('#ffc9b5'),
      sunIntensity: 0.98,
      hemiIntensity: 0.82,
      starAlpha: 0.48
    },
    {
      name: 'Đêm sao',
      lucideIcon: 'moon',
      toast: 'Đêm sao ngân hà lấp lánh khúc hát ru của mây',
      topColor: new THREE.Color('#35356b'),
      midColor: new THREE.Color('#7466a8'),
      botColor: new THREE.Color('#c8b8eb'),
      fogColor: new THREE.Color('#8e7fbe'),
      sunColor: new THREE.Color('#d8ecff'),
      hemiSky: new THREE.Color('#9fb4ff'),
      hemiGround: new THREE.Color('#7b689c'),
      sunIntensity: 0.68,
      hemiIntensity: 0.72,
      starAlpha: 1.0
    }
  ];

  // Canonical definitions of the 5 Sky Islands
  const ISLAND_DEFS = [
    {
      id: 'meadow',
      name: 'Đảo Mầm Mơ',
      subtitle: 'Thảo nguyên xanh mát nơi những cánh gió bắt đầu',
      center: { x: 0, y: 0, z: 0 },
      radius: 26,
      spawn: { x: 0, y: 0.6, z: 10 },
      grassColor: '#b5ead7',
      cliffColor: '#f5e4d3',
      accentColor: '#ffb7cc',
      visited: true
    },
    {
      id: 'sakura',
      name: 'Đảo Hoa Anh Đào',
      subtitle: 'Thung lũng cánh hoa hồng phấn và mặt hồ gương lặng',
      center: { x: 58, y: 5.5, z: -18 },
      radius: 22,
      spawn: { x: 48, y: 6.0, z: -14 },
      grassColor: '#ffc9da',
      cliffColor: '#f7e5e9',
      accentColor: '#ff8fab',
      visited: false
    },
    {
      id: 'honey',
      name: 'Đảo Bánh Mây Vàng',
      subtitle: 'Cối xay gió kem bơ thơm lừng mật sao mới nướng',
      center: { x: -54, y: 4.5, z: 24 },
      radius: 21,
      spawn: { x: -44, y: 5.0, z: 18 },
      grassColor: '#ffeaa7',
      cliffColor: '#f5dec9',
      accentColor: '#ffb870',
      visited: false
    },
    {
      id: 'crystal',
      name: 'Đảo Pha Lê Tím',
      subtitle: 'Đài quan trắc tinh vân và những trụ thạch anh ngân vang',
      center: { x: -46, y: 13.5, z: -56 },
      radius: 20,
      spawn: { x: -38, y: 14.0, z: -48 },
      grassColor: '#d8ccf8',
      cliffColor: '#e9e2f8',
      accentColor: '#9bf6ff',
      visited: false
    },
    {
      id: 'celestial',
      name: 'Đỉnh Thiên Hà Mộng Mơ',
      subtitle: 'Thánh địa mây trắng nơi Đại Hồng Chung Ngân Hà ngự trị',
      center: { x: 8, y: 26.5, z: -92 },
      radius: 19,
      spawn: { x: 4, y: 27.0, z: -80 },
      grassColor: '#d9f2ff',
      cliffColor: '#f8f9ff',
      accentColor: '#ffe48f',
      visited: false
    }
  ];

  class PastelWorld {
    constructor(scene) {
      this.scene = scene;
      this.islands = ISLAND_DEFS.map(d => ({ ...d }));

      // Physics & interactive spatial registries
      this.discPlatforms = [];   // { x, yTop, yBottom, z, radius }
      this.bridgeColliders = []; // { id, active, x1, y1, z1, x2, y2, z2, halfWidth, arch, group }
      this.pillars = [];         // { x, yMin, yMax, z, radius }
      this.bouncyClouds = [];    // { x, y, z, radius, power, mesh, squish }
      this.updrafts = [];        // { id, active, x, yBase, yTop, z, radius, lift, group, rings }
      this.benches = [];         // { x, y, z, lookAtX, lookAtZ, label }
      this.animatedProps = [];   // windmills, crystal floaters, rings, whale, clouds, aurora

      this.moodIndex = 0;
      this.skyUniforms = null;
      this.starPoints = null;
      this.auroraGroup = null;
      this.auroraActive = false;

      this.materials = {};
      this.initLightingAndSky();
      this.initSharedMaterials();
      this.buildAllIslands();
      this.buildCloudsAndBridges();
      this.buildSkyWhale();
      this.buildAuroraCrown();
    }

    initSharedMaterials() {
      const toonMat = (hex, opts = {}) => new THREE.MeshStandardMaterial({
        color: hex,
        roughness: opts.roughness ?? 0.78,
        metalness: opts.metalness ?? 0.04,
        emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        flatShading: opts.flat ?? true,
        transparent: !!opts.transparent,
        opacity: opts.opacity ?? 1.0
      });

      this.makeMat = toonMat;
      this.materials = {
        wood: toonMat('#d9a78b', { roughness: 0.85 }),
        creamWall: toonMat('#fff8f2', { roughness: 0.75 }),
        pastelRoof: toonMat('#ff9ebb', { roughness: 0.65 }),
        goldTrim: toonMat('#ffe082', { roughness: 0.35, metalness: 0.25, emissive: '#ffcf66', emissiveIntensity: 0.22 }),
        stoneLight: toonMat('#f2ebf7', { roughness: 0.7 }),
        cloudWhite: toonMat('#fffafd', { roughness: 0.9, emissive: '#ffe8f3', emissiveIntensity: 0.18, flat: false }),
        cloudPink: toonMat('#ffd6e8', { roughness: 0.75, emissive: '#ffb3d1', emissiveIntensity: 0.28, flat: false }),
        waterPond: toonMat('#a6e3ff', { roughness: 0.16, metalness: 0.1, transparent: true, opacity: 0.84, emissive: '#89d4ff', emissiveIntensity: 0.2, flat: false }),
        crystalViolet: toonMat('#c5b3ff', { roughness: 0.2, metalness: 0.15, emissive: '#a68eff', emissiveIntensity: 0.42 }),
        crystalAqua: toonMat('#9bf6ff', { roughness: 0.18, metalness: 0.15, emissive: '#7ae8ff', emissiveIntensity: 0.42 })
      };
    }

    initLightingAndSky() {
      const m = SKY_MOODS[0];
      this.scene.fog = new THREE.FogExp2(m.fogColor.getHex(), 0.0042);

      // Soft Hemisphere + Warm Directional Sunlight
      this.hemiLight = new THREE.HemisphereLight(m.hemiSky.getHex(), m.hemiGround.getHex(), m.hemiIntensity);
      this.hemiLight.position.set(0, 80, 0);
      this.scene.add(this.hemiLight);

      this.sunLight = new THREE.DirectionalLight(m.sunColor.getHex(), m.sunIntensity);
      this.sunLight.position.set(55, 92, 42);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 260;
      const d = 115;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0006;
      this.scene.add(this.sunLight);

      // Custom Gradient Pastel Sky Dome Shader
      this.skyUniforms = {
        uTop: { value: m.topColor.clone() },
        uMid: { value: m.midColor.clone() },
        uBot: { value: m.botColor.clone() },
        uTime: { value: 0 }
      };

      const skyGeo = new THREE.SphereGeometry(360, 32, 24);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyUniforms,
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uMid;
          uniform vec3 uBot;
          uniform float uTime;
          varying vec3 vWorldPos;
          void main() {
            float h = normalize(vWorldPos).y;
            vec3 col = mix(uBot, uMid, smoothstep(-0.28, 0.16, h));
            col = mix(col, uTop, smoothstep(0.12, 0.78, h));
            // Subtle pastel sun halo glow
            vec3 sunDir = normalize(vec3(0.45, 0.55, 0.35));
            float sunDot = max(dot(normalize(vWorldPos), sunDir), 0.0);
            col += vec3(1.0, 0.94, 0.88) * pow(sunDot, 28.0) * 0.26;
            gl_FragColor = vec4(col, 1.0);
          }
        `
      });
      this.skyDome = new THREE.Mesh(skyGeo, skyMat);
      this.scene.add(this.skyDome);

      // Twinkling Starfield Dome
      const starCount = 520;
      const starPos = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);
      const palette = [
        new THREE.Color('#fff6d6'),
        new THREE.Color('#ffd6ea'),
        new THREE.Color('#d6ecff'),
        new THREE.Color('#e5d6ff')
      ];

      for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.52; // Upper sky
        const r = 310 + Math.random() * 25;
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.cos(phi) + 12;
        starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

        const c = palette[i % palette.length];
        starColors[i * 3] = c.r;
        starColors[i * 3 + 1] = c.g;
        starColors[i * 3 + 2] = c.b;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
      this.starMat = new THREE.PointsMaterial({
        size: 2.6,
        vertexColors: true,
        transparent: true,
        opacity: m.starAlpha,
        fog: false,
        depthWrite: false
      });
      this.starPoints = new THREE.Points(starGeo, this.starMat);
      this.scene.add(this.starPoints);
    }

    cycleSkyMood() {
      this.moodIndex = (this.moodIndex + 1) % SKY_MOODS.length;
      return SKY_MOODS[this.moodIndex];
    }

    // Core Island Layer Builder: Visual sculpted floating island + 1:1 disc collider
    addIslandDisc(x, yTop, z, radius, thickness, grassHex, cliffHex, addUnderSpire = true) {
      const group = new THREE.Group();
      group.position.set(x, yTop, z);

      // Soft pillowy grass cap
      const capHeight = Math.min(1.5, Math.max(0.7, thickness * 0.22));
      const capGeo = new THREE.CylinderGeometry(radius, radius * 1.02, capHeight, 28);
      const capMat = this.makeMat(grassHex, { roughness: 0.82, flat: true });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = -capHeight * 0.5;
      cap.receiveShadow = true;
      cap.castShadow = true;
      group.add(cap);

      // Tapered pastel rock body underneath
      const cliffHeight = thickness - capHeight;
      const cliffGeo = new THREE.CylinderGeometry(radius * 0.98, radius * (addUnderSpire ? 0.34 : 0.72), cliffHeight, 18);
      const cliffMat = this.makeMat(cliffHex, { roughness: 0.88, flat: true });
      const cliff = new THREE.Mesh(cliffGeo, cliffMat);
      cliff.position.y = -capHeight - cliffHeight * 0.5;
      cliff.receiveShadow = true;
      cliff.castShadow = true;
      group.add(cliff);

      if (addUnderSpire && radius >= 7) {
        // Floating root tip & hanging pastel moss pebbles
        const tipGeo = new THREE.ConeGeometry(radius * 0.34, radius * 0.45, 10);
        const tip = new THREE.Mesh(tipGeo, cliffMat);
        tip.rotation.x = Math.PI;
        tip.position.y = -thickness - radius * 0.2;
        group.add(tip);
      }

      this.scene.add(group);

      this.discPlatforms.push({
        x,
        yTop,
        yBottom: yTop - thickness,
        z,
        radius
      });

      return group;
    }

    // Pastel Tree Builder (Sakura / Matcha Puff / Golden Autumn / Crystal Pine)
    addPastelTree(x, y, z, leafHex = '#ffb7cc', scale = 1.0, style = 'puff') {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.scale.setScalar(scale);

      const trunkMat = this.materials.wood;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 2.6, 8), trunkMat);
      trunk.position.y = 1.3;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      g.add(trunk);

      const leafMat = this.makeMat(leafHex, {
        roughness: 0.74,
        emissive: leafHex,
        emissiveIntensity: 0.08,
        flat: true
      });

      if (style === 'pine') {
        for (let i = 0; i < 3; i++) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(1.8 - i * 0.38, 1.9, 9), leafMat);
          cone.position.y = 2.5 + i * 1.1;
          cone.castShadow = true;
          cone.receiveShadow = true;
          g.add(cone);
        }
      } else {
        const blobs = [
          [0, 3.1, 0, 1.55],
          [-0.95, 2.65, 0.45, 1.08],
          [0.95, 2.7, -0.35, 1.12],
          [0.2, 3.85, 0.3, 1.02],
          [-0.35, 2.8, -0.85, 0.98]
        ];
        blobs.forEach(([bx, by, bz, br]) => {
          const m = new THREE.Mesh(new THREE.IcosahedronGeometry(br, 1), leafMat);
          m.position.set(bx, by, bz);
          m.castShadow = true;
          m.receiveShadow = true;
          g.add(m);
        });
      }

      this.scene.add(g);
      this.pillars.push({ x, yMin: y, yMax: y + 3.2 * scale, z, radius: 0.52 * scale });
    }

    addFlowerPatch(cx, y, cz, spread, count, colors) {
      const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.25, 5);
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * spread;
        const fx = cx + Math.cos(ang) * r;
        const fz = cz + Math.sin(ang) * r;
        const col = colors[i % colors.length];
        const petal = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.1, 0),
          this.makeMat(col, { emissive: col, emissiveIntensity: 0.15 })
        );
        petal.position.set(fx, y + 0.16, fz);
        this.scene.add(petal);
        if (i % 3 === 0) {
          const stem = new THREE.Mesh(stemGeo, this.makeMat('#8cd6b2'));
          stem.position.set(fx, y + 0.08, fz);
          this.scene.add(stem);
        }
      }
    }

    addCozyCottage(x, y, z, rotY = 0, roofHex = '#ff9ebb') {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = rotY;

      // Body
      const walls = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 2.8, 12), this.materials.creamWall);
      walls.position.y = 1.4;
      walls.castShadow = true;
      walls.receiveShadow = true;
      g.add(walls);

      // Witchy/Ghibli conical pastel roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.6, 12), this.makeMat(roofHex, { roughness: 0.65 }));
      roof.position.y = 3.9;
      roof.castShadow = true;
      g.add(roof);

      // Door & Glowing Warm Windows
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.55, 0.3), this.materials.wood);
      door.position.set(0, 0.8, 2.62);
      g.add(door);

      const winMat = this.makeMat('#fff0a8', { emissive: '#ffd97d', emissiveIntensity: 0.75 });
      [-1.3, 1.3].forEach(wx => {
        const w = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), winMat);
        w.position.set(wx, 1.65, 2.3);
        g.add(w);
      });

      // Chimney
      const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.5, 8), this.materials.stoneLight);
      chim.position.set(1.4, 4.3, -0.6);
      g.add(chim);

      this.scene.add(g);
      this.pillars.push({ x, yMin: y, yMax: y + 4.5, z, radius: 2.95 });
      return g;
    }

    addWindmill(x, y, z, rotY = 0) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = rotY;

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.8, 6.2, 12), this.materials.creamWall);
      tower.position.y = 3.1;
      tower.castShadow = true;
      tower.receiveShadow = true;
      g.add(tower);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.1, 12), this.makeMat('#ffb870'));
      cap.position.y = 7.1;
      cap.castShadow = true;
      g.add(cap);

      // Rotating sails hub
      const hub = new THREE.Group();
      hub.position.set(0, 5.4, 2.15);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 10), this.materials.goldTrim);
      hub.add(nose);

      const sailMat = this.makeMat('#fff3d1', { emissive: '#ffe4a3', emissiveIntensity: 0.14 });
      for (let i = 0; i < 4; i++) {
        const armGroup = new THREE.Group();
        armGroup.rotation.z = (i * Math.PI) / 2;
        const rod = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.4, 0.14), this.materials.wood);
        rod.position.y = 2.2;
        armGroup.add(rod);
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.05, 3.4, 0.06), sailMat);
        cloth.position.set(0.52, 2.45, 0.05);
        armGroup.add(cloth);
        hub.add(armGroup);
      }
      g.add(hub);

      this.scene.add(g);
      this.pillars.push({ x, yMin: y, yMax: y + 7.5, z, radius: 2.9 });
      this.animatedProps.push({ type: 'windmill', mesh: hub, speed: 0.85 });
      return hub;
    }

    addMoonArch(x, y, z, rotY = 0, colorHex = '#ff9ebb', scale = 1.0) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = rotY;
      g.scale.setScalar(scale);

      const mat = this.makeMat(colorHex, { roughness: 0.6 });
      const left = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 4.4, 10), mat);
      left.position.set(-2.1, 2.2, 0);
      left.castShadow = true;
      const right = left.clone();
      right.position.set(2.1, 2.2, 0);
      g.add(left, right);

      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.42, 0.55), mat);
      beam.position.set(0, 4.2, 0);
      beam.castShadow = true;
      g.add(beam);

      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.34, 0.65), this.materials.goldTrim);
      topBeam.position.set(0, 4.65, 0);
      g.add(topBeam);

      // Glowing hanging lanterns
      const lanternMat = this.makeMat('#fff0b8', { emissive: '#ffc978', emissiveIntensity: 0.9 });
      [-1.35, 1.35].forEach(lx => {
        const lan = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), lanternMat);
        lan.position.set(lx, 3.65, 0);
        g.add(lan);
      });

      this.scene.add(g);
      const cos = Math.cos(rotY);
      const sin = Math.sin(rotY);
      [-2.1 * scale, 2.1 * scale].forEach(offset => {
        this.pillars.push({
          x: x + offset * cos,
          yMin: y,
          yMax: y + 4.5 * scale,
          z: z - offset * sin,
          radius: 0.42 * scale
        });
      });
    }

    addScenicBench(x, y, z, rotY, lookAtX, lookAtZ, label) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = rotY;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.72), this.materials.wood);
      seat.position.y = 0.52;
      seat.castShadow = true;
      g.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 0.14), this.materials.wood);
      back.position.set(0, 0.88, -0.3);
      back.rotation.x = -0.14;
      g.add(back);

      [-0.82, 0.82].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.62), this.materials.stoneLight);
        leg.position.set(lx, 0.26, 0);
        g.add(leg);
      });

      this.scene.add(g);
      this.benches.push({ x, y, z, rotY, lookAtX, lookAtZ, label });
    }

    addCrystalCluster(x, y, z, hex = '#c5b3ff', scale = 1.0, floatAnim = false) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.scale.setScalar(scale);

      const mat = this.makeMat(hex, {
        roughness: 0.18,
        metalness: 0.18,
        emissive: hex,
        emissiveIntensity: 0.42
      });

      const specs = [
        [0, 1.4, 0, 0.62, 2.9, 0, 0],
        [-0.55, 0.85, 0.25, 0.42, 1.8, 0.2, 0.28],
        [0.55, 0.95, -0.2, 0.45, 2.0, -0.18, -0.25],
        [0.15, 0.7, 0.55, 0.34, 1.4, 0.32, -0.1]
      ];
      specs.forEach(([cx, cy, cz, r, h, rx, rz]) => {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mat);
        shard.position.set(cx, cy, cz);
        shard.rotation.set(rx, Math.random(), rz);
        shard.castShadow = true;
        g.add(shard);
      });

      this.scene.add(g);
      if (floatAnim) {
        this.animatedProps.push({ type: 'float', mesh: g, baseY: y, phase: Math.random() * 6.28, amp: 0.55 });
      } else {
        this.pillars.push({ x, yMin: y, yMax: y + 2.6 * scale, z, radius: 0.85 * scale });
      }
    }

    addBouncyCloud(x, y, z, radius = 2.4, power = 18.5) {
      const g = new THREE.Group();
      g.position.set(x, y, z);

      const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.72, 16, 12), this.materials.cloudPink);
      core.scale.set(1.3, 0.62, 1.3);
      g.add(core);

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.44, 12, 10), this.materials.cloudWhite);
        puff.position.set(Math.cos(a) * radius * 0.58, -0.05, Math.sin(a) * radius * 0.58);
        puff.scale.set(1.1, 0.72, 1.1);
        g.add(puff);
      }

      // Cute ring halo
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.85, 0.06, 8, 28),
        this.makeMat('#ff9ebb', { emissive: '#ff8fab', emissiveIntensity: 0.55 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.15;
      g.add(ring);

      this.scene.add(g);
      const entry = { x, y, z, radius: radius * 1.05, power, mesh: g, squish: 0 };
      this.bouncyClouds.push(entry);
      return entry;
    }

    addUpdraft(id, x, yBase, yTop, z, radius = 3.2, lift = 16.5, active = true) {
      const group = new THREE.Group();
      group.position.set(x, yBase, z);
      group.visible = active;

      const rings = [];
      const height = yTop - yBase;
      const ringCount = 5;
      const mat = new THREE.MeshBasicMaterial({
        color: '#c8f7ff',
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide
      });

      for (let i = 0; i < ringCount; i++) {
        const rMesh = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.78, 0.08, 8, 28), mat.clone());
        rMesh.rotation.x = Math.PI / 2;
        rMesh.userData.offset = i / ringCount;
        group.add(rMesh);
        rings.push(rMesh);
      }

      // Vertical translucent wind cylinder shimmer
      const cylGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.85, height, 16, 1, true);
      const cylMat = new THREE.MeshBasicMaterial({
        color: '#dff8ff',
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      cyl.position.y = height * 0.5;
      group.add(cyl);

      this.scene.add(group);
      const updraft = { id, active, x, yBase, yTop, z, radius, lift, group, rings };
      this.updrafts.push(updraft);
      return updraft;
    }

    addRainbowBridge(id, x1, y1, z1, x2, y2, z2, width = 3.8, arch = 1.8, active = false) {
      const group = new THREE.Group();
      group.visible = active;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;
      const len2D = Math.hypot(dx, dz);
      const steps = Math.max(12, Math.floor(len2D / 1.45));
      const yaw = Math.atan2(dx, dz);

      const pastelRainbow = ['#ffb3c6', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffc6ff'];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + dx * t;
        const pz = z1 + dz * t;
        const py = y1 + dy * t + Math.sin(t * Math.PI) * arch;

        const hex = pastelRainbow[i % pastelRainbow.length];
        const plankMat = this.makeMat(hex, {
          roughness: 0.3,
          emissive: hex,
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.88
        });

        const plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, (len2D / steps) * 0.92), plankMat);
        plank.position.set(px, py - 0.11, pz);
        plank.rotation.y = yaw;
        group.add(plank);

        // Soft glowing side pearls every 3 planks
        if (i % 3 === 0) {
          [-width * 0.48, width * 0.48].forEach(side => {
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), this.materials.goldTrim);
            orb.position.set(
              px + Math.cos(yaw) * side,
              py + 0.32,
              pz - Math.sin(yaw) * side
            );
            group.add(orb);
          });
        }
      }

      this.scene.add(group);
      const bridge = {
        id,
        active,
        x1, y1, z1,
        x2, y2, z2,
        halfWidth: width * 0.54,
        arch,
        group
      };
      this.bridgeColliders.push(bridge);
      return bridge;
    }

    setBridgeActive(id, state = true) {
      this.bridgeColliders.forEach(b => {
        if (b.id === id) {
          b.active = state;
          b.group.visible = state;
        }
      });
    }

    setUpdraftActive(id, state = true) {
      this.updrafts.forEach(u => {
        if (u.id === id) {
          u.active = state;
          u.group.visible = state;
        }
      });
    }

    buildAllIslands() {
      // =====================================================
      // 1. ĐẢO MẦM MƠ (MEADOW BLOSSOM HUB - Center 0, 0, 0)
      // =====================================================
      this.addIslandDisc(0, 0, 0, 26, 15, '#b5ead7', '#f5e4d3', true);
      // Raised central Starlight Altar plaza + welcoming south stairs
      this.addIslandDisc(0, 0.55, 5.2, 3.2, 1.2, '#e8f8f2', '#e9d8ef', false);
      this.addIslandDisc(0, 1.1, -3, 8.2, 2.5, '#e8f8f2', '#e9d8ef', false);
      this.addIslandDisc(0, 1.7, -3, 4.6, 1.4, '#fff7fb', '#dfd0ee', false);
      // Cozy western cottage hill + stepping terrace
      this.addIslandDisc(-8.2, 0.75, 0.5, 2.6, 1.8, '#c7f2e3', '#f2dfd0', false);
      this.addIslandDisc(-10.2, 1.5, -2.0, 2.8, 2.5, '#c7f2e3', '#f2dfd0', false);
      this.addIslandDisc(-12.5, 2.2, -6, 7.2, 4.2, '#c7f2e3', '#f2dfd0', false);
      this.addCozyCottage(-13, 2.2, -7.2, 0.65, '#ff9ebb');

      // Stepping terrace toward east
      this.addIslandDisc(16, 1.4, -5, 5.5, 3.2, '#c2f0de', '#f3e1d3', false);

      // Decorative Starlight Altar Arch
      this.addMoonArch(0, 1.7, -6.5, 0, '#d8ccf8', 1.15);

      // Trees & Flower Meadows on Hub
      this.addPastelTree(-17, 0, 7, '#ffb7cc', 1.15, 'puff');
      this.addPastelTree(14, 0, 10, '#ffc8dd', 1.2, 'puff');
      this.addPastelTree(18, 1.4, -7, '#9bf6ff', 0.95, 'puff');
      this.addPastelTree(-7, 2.2, -10.5, '#ffe5a3', 0.92, 'puff');
      this.addPastelTree(8, 0, 17, '#a8e6cf', 1.05, 'puff');
      this.addFlowerPatch(6, 0, 7, 7.5, 26, ['#ffb3c6', '#ffeaa7', '#d8ccf8', '#ffffff']);
      this.addFlowerPatch(-9, 0, 11, 6.5, 22, ['#ffc6ff', '#bde0fe', '#ffdfba']);

      this.addScenicBench(0, 0, 21.5, Math.PI, 0, 45, 'Ghế Mây Thảo Nguyên');

      // =====================================================
      // 2. ĐẢO HOA ANH ĐÀO (SAKURA WHISPER ISLE - East 58, 5.5, -18)
      // =====================================================
      this.addIslandDisc(58, 5.5, -18, 22, 14, '#ffc9da', '#f7e5e9', true);
      // Upper Shrine Terrace + Blossom Stairs
      this.addIslandDisc(57.8, 6.2, -16.8, 2.8, 1.5, '#ffdbe7', '#f3dce4', false);
      this.addIslandDisc(59.4, 6.9, -17.8, 2.8, 2.0, '#ffdbe7', '#f3dce4', false);
      this.addIslandDisc(61.0, 7.55, -18.8, 3.0, 2.5, '#ffdbe7', '#f3dce4', false);
      this.addIslandDisc(65, 8.2, -23, 9.5, 5.0, '#ffdbe7', '#f3dce4', false);
      this.addPastelTree(66.5, 8.2, -24.5, '#ff9ebb', 1.95, 'puff'); // Giant Spirit Sakura!

      // Tranquil Mirror Pond on lower terrace
      const pond = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.14, 24), this.materials.waterPond);
      pond.position.set(52, 5.56, -13);
      this.scene.add(pond);
      // Walkable Lily Pads on pond
      this.addIslandDisc(50.5, 5.72, -12, 1.45, 0.3, '#a8e6cf', '#88d4b4', false);
      this.addIslandDisc(53.8, 5.72, -14.2, 1.45, 0.3, '#a8e6cf', '#88d4b4', false);

      this.addMoonArch(44, 5.5, -15, -Math.PI / 2.3, '#ff8fab', 1.0);
      this.addMoonArch(61, 8.2, -18.5, -0.5, '#ffb3c6', 0.92);

      this.addPastelTree(49, 5.5, -26, '#ffb3c6', 1.1, 'puff');
      this.addPastelTree(64, 5.5, -7, '#ffc6ff', 1.15, 'puff');
      this.addPastelTree(73, 5.5, -15, '#ffd6e8', 1.0, 'puff');
      this.addFlowerPatch(57, 5.5, -20, 12, 30, ['#ffffff', '#ff8fab', '#ffe5ec']);
      this.addScenicBench(72, 8.2, -26, -0.8, 95, -45, 'Hiên Ngắm Hoa Anh Đào');

      // =====================================================
      // 3. ĐẢO BÁNH MÂY VÀNG (HONEYBELL WINDMILL ISLE - SW -54, 4.5, 24)
      // =====================================================
      this.addIslandDisc(-54, 4.5, 24, 21, 13.5, '#ffeaa7', '#f5dec9', true);
      // Windmill Bakery Hilltop + Cobble Steps
      this.addIslandDisc(-51.8, 5.2, 24.5, 2.8, 1.5, '#fff2bf', '#f2d8bf', false);
      this.addIslandDisc(-53.5, 5.9, 25.4, 2.8, 2.0, '#fff2bf', '#f2d8bf', false);
      this.addIslandDisc(-55.2, 6.6, 26.2, 3.0, 2.5, '#fff2bf', '#f2d8bf', false);
      this.addIslandDisc(-60, 7.3, 28, 8.8, 5.0, '#fff2bf', '#f2d8bf', false);
      this.windmillHub = this.addWindmill(-61.5, 7.3, 29.5, 0.72);
      this.addCozyCottage(-46, 4.5, 31, -0.6, '#ffb870');

      // Stepping Honey Platforms around Windmill
      this.addIslandDisc(-50, 6.2, 14, 3.6, 2.5, '#ffd89c', '#f0cfb0', true);
      this.addIslandDisc(-64, 9.5, 18, 3.4, 2.5, '#ffe2a8', '#f0cfb0', true);

      this.addPastelTree(-42, 4.5, 21, '#ffd166', 1.15, 'puff');
      this.addPastelTree(-56, 4.5, 10, '#ffb870', 1.05, 'puff');
      this.addPastelTree(-68, 7.3, 33, '#ffe599', 1.1, 'puff');
      this.addFlowerPatch(-52, 4.5, 24, 11, 26, ['#ffffff', '#ffb703', '#ff9ebb']);
      this.addScenicBench(-41, 4.5, 28, 1.1, -15, 10, 'Đồi Cối Xay Gió Kem Bơ');

      // =====================================================
      // 4. ĐẢO PHA LÊ TÍM (LAVENDER CRYSTAL SPIRE - NW -46, 13.5, -56)
      // =====================================================
      this.addIslandDisc(-46, 13.5, -56, 20, 15, '#d8ccf8', '#e9e2f8', true);
      // Observatory Upper Spire + Crystal Steps
      this.addIslandDisc(-44.0, 14.3, -55.5, 2.7, 1.8, '#e6ddff', '#dcd3f5', false);
      this.addIslandDisc(-45.5, 15.2, -57.0, 2.7, 2.5, '#e6ddff', '#dcd3f5', false);
      this.addIslandDisc(-47.2, 16.1, -58.5, 2.9, 3.2, '#e6ddff', '#dcd3f5', false);
      this.addIslandDisc(-51, 17.0, -62, 8.4, 5.5, '#e6ddff', '#dcd3f5', false);
      // Crystal Ledges for Prism Shards & Wind Chimes
      this.addIslandDisc(-34, 15.2, -52, 4.2, 3.2, '#c8e7ff', '#dde0f7', true);
      this.addIslandDisc(-58, 19.4, -50, 3.8, 3.0, '#dfd6ff', '#dde0f7', true);

      this.addCrystalCluster(-53, 17.0, -65, '#b197fc', 1.45, false);
      this.addCrystalCluster(-39, 13.5, -66, '#9bf6ff', 1.2, false);
      this.addCrystalCluster(-58, 13.5, -45, '#ffc6ff', 1.1, false);
      // Floating sky crystals around spire
      this.addCrystalCluster(-35, 21.0, -64, '#9bf6ff', 0.85, true);
      this.addCrystalCluster(-62, 23.0, -60, '#ffc6ff', 0.9, true);

      this.addPastelTree(-42, 13.5, -44, '#bdb2ff', 1.1, 'pine');
      this.addPastelTree(-55, 13.5, -54, '#a0c4ff', 1.15, 'pine');
      this.addFlowerPatch(-46, 13.5, -56, 11, 24, ['#9bf6ff', '#ffc6ff', '#ffffff']);

      // =====================================================
      // 5. ĐỈNH THIÊN HÀ MỘNG MƠ (CELESTIAL CROWN SANCTUARY - 8, 26.5, -92)
      // =====================================================
      this.addIslandDisc(8, 26.5, -92, 19, 16, '#d9f2ff', '#f8f9ff', true);
      this.addIslandDisc(8, 27.2, -82.8, 3.4, 1.5, '#eef8ff', '#ffffff', false);
      this.addIslandDisc(8, 27.9, -84.6, 3.4, 2.0, '#eef8ff', '#ffffff', false);
      this.addIslandDisc(8, 28.5, -94, 10.5, 3.5, '#eef8ff', '#ffffff', false);
      this.addIslandDisc(8, 29.25, -88.8, 3.2, 2.0, '#fffdf5', '#f5ecff', false);
      this.addIslandDisc(8, 30.0, -95, 5.8, 2.4, '#fffdf5', '#f5ecff', false);

      // Rotating Golden Armillary Celestial Rings around the Sanctuary!
      const ringGroup = new THREE.Group();
      ringGroup.position.set(8, 35.5, -95);
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(9.5, 0.22, 10, 48), this.materials.goldTrim);
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.18, 10, 44), this.makeMat('#ffc6ff', { emissive: '#ffb3e6', emissiveIntensity: 0.45 }));
      r2.rotation.x = 0.8;
      ringGroup.add(r1, r2);
      this.scene.add(ringGroup);
      this.animatedProps.push({ type: 'armillary', r1, r2 });

      // Grand Celestial Bell Pavilion Arch
      this.addMoonArch(8, 30.0, -95, 0, '#ffe082', 1.35);
      this.addPastelTree(-3, 26.5, -88, '#ffc6ff', 1.15, 'puff');
      this.addPastelTree(19, 26.5, -88, '#bde0fe', 1.15, 'puff');
      this.addFlowerPatch(8, 26.5, -88, 10, 28, ['#ffeaa7', '#ffc6ff', '#9bf6ff', '#ffffff']);
      this.addScenicBench(8, 26.5, -75.5, 0, 8, -20, 'Ban Công Thiên Hà');
    }

    buildCloudsAndBridges() {
      // Decorative Ambient Sky Clouds drifting lazily across the horizon
      const cloudCoords = [
        [-95, 18, -30, 2.2], [95, 22, -55, 2.5], [35, 34, -135, 2.8],
        [-85, 30, -110, 2.4], [88, 12, 35, 2.1], [-20, -8, 65, 2.6],
        [42, -6, 48, 1.9], [-92, 8, 58, 2.2], [110, 28, -5, 2.3]
      ];
      cloudCoords.forEach(([cx, cy, cz, sc], idx) => {
        const cg = new THREE.Group();
        cg.position.set(cx, cy, cz);
        cg.scale.setScalar(sc);
        const puffs = [[0, 0, 0, 3.2], [-2.5, -0.4, 0.6, 2.3], [2.6, -0.3, -0.4, 2.4], [0.5, 1.1, 0.3, 2.1]];
        puffs.forEach(([px, py, pz, pr]) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(pr, 12, 10), this.materials.cloudWhite);
          m.position.set(px, py, pz);
          m.scale.y = 0.62;
          cg.add(m);
        });
        this.scene.add(cg);
        this.animatedProps.push({ type: 'cloudDrift', mesh: cg, baseX: cx, phase: idx * 1.3, amp: 5.5 });
      });

      // =====================================================
      // BOUNCY PINK CLOUDS & STEPPING SKY STONES (Always usable!)
      // =====================================================
      // Hub -> Sakura stepping path
      this.addBouncyCloud(27, 1.8, -8, 2.5, 18.0);
      this.addBouncyCloud(36, 3.8, -12, 2.5, 18.5);

      // Hub -> Honeybell stepping path
      this.addBouncyCloud(-23, 1.5, 10, 2.5, 18.0);
      this.addBouncyCloud(-34, 3.2, 17, 2.5, 18.5);

      // Honeybell Windmill bouncy cloud to reach roof honey drops
      this.addBouncyCloud(-55, 7.6, 19, 2.1, 19.5);

      // Hub / Honeybell -> Lavender Crystal Spire stepping clouds + updraft
      this.addBouncyCloud(-24, 6.2, -28, 2.6, 20.5);
      this.addBouncyCloud(-33, 10.2, -40, 2.6, 20.5);

      // Crystal Spire -> Celestial Sanctuary stepping clouds
      this.addBouncyCloud(-22, 18.5, -70, 2.6, 21.5);
      this.addBouncyCloud(-9, 23.0, -80, 2.6, 21.5);

      // Sakura -> Celestial eastern cloud hop
      this.addBouncyCloud(44, 13.0, -48, 2.6, 21.5);
      this.addBouncyCloud(28, 20.0, -68, 2.6, 21.5);

      // =====================================================
      // SWIRLING WIND UPDRAFTS
      // =====================================================
      // Always-on scenic exploration updrafts
      this.addUpdraft('updraft_east', 31, -2, 16, -20, 3.4, 16.5, true);
      this.addUpdraft('updraft_west', -38, 0, 21, -22, 3.6, 17.5, true);
      this.addUpdraft('updraft_crystal', -46, 13.5, 32, -45, 3.3, 18.0, true);
      // Awakened Central Grand Updraft (unlocked with Relic 4 / all Relics)
      this.addUpdraft('updraft_summit', 0, 1.5, 36, -16, 4.2, 21.0, false);

      // =====================================================
      // RAINBOW LIGHT BRIDGES (Awakened by the 4 Star Relics!)
      // =====================================================
      // Relic 1 (Meadow Hub) unlocks Bridges to Sakura & Honeybell!
      this.addRainbowBridge('bridge_sakura', 22.5, 0.3, -6.5, 38.5, 5.5, -13.5, 3.8, 1.8, false);
      this.addRainbowBridge('bridge_honey', -21.5, 0.3, 9.5, -36.5, 4.5, 17.5, 3.8, 1.8, false);

      // Relic 2 (Sakura) unlocks High Sky Bridge toward Celestial East Terrace + Updraft boost
      this.addRainbowBridge('bridge_sakura_sky', 50.0, 5.8, -36.5, 22.5, 26.5, -79.0, 3.6, 3.2, false);

      // Relic 3 (Honeybell) unlocks Bridge from Honeybell/Hub North-West up to Crystal Spire!
      this.addRainbowBridge('bridge_crystal', -16.5, 1.2, -21.5, -35.5, 13.5, -43.5, 3.8, 2.4, false);

      // Relic 4 (Crystal Spire) unlocks the Grand Celestial Bridge straight to the Summit!
      this.addRainbowBridge('bridge_celestial', -33.0, 14.2, -64.0, -5.5, 26.6, -83.5, 4.2, 2.8, false);
    }

    buildSkyWhale() {
      const whale = new THREE.Group();

      const bodyMat = this.makeMat('#ffb8d2', { roughness: 0.55, emissive: '#ff9ebb', emissiveIntensity: 0.18, flat: false });
      const bellyMat = this.makeMat('#fff7fb', { roughness: 0.65, flat: false });
      const finMat = this.makeMat('#bde0fe', { roughness: 0.45, emissive: '#9bf6ff', emissiveIntensity: 0.28, flat: false });

      const torso = new THREE.Mesh(makeCapsuleGeo(2.1, 5.2, 10, 16), bodyMat);
      torso.rotation.x = Math.PI / 2;
      whale.add(torso);

      const belly = new THREE.Mesh(makeCapsuleGeo(1.75, 4.6, 8, 14), bellyMat);
      belly.rotation.x = Math.PI / 2;
      belly.position.y = -0.55;
      whale.add(belly);

      // Cute eyes
      const eyeMat = this.makeMat('#3d2b4f', { roughness: 0.2 });
      [-1.78, 1.78].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), eyeMat);
        eye.position.set(ex, 0.25, 2.6);
        whale.add(eye);
      });

      // Graceful Pectoral Wings/Fins
      const leftFin = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 1.8), finMat);
      leftFin.position.set(-2.9, -0.2, 0.6);
      leftFin.rotation.y = -0.25;
      const rightFin = leftFin.clone();
      rightFin.position.set(2.9, -0.2, 0.6);
      rightFin.rotation.y = 0.25;
      whale.add(leftFin, rightFin);

      // Tail section + Flukes
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 0, -3.5);
      const tailCone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.8, 12), bodyMat);
      tailCone.rotation.x = -Math.PI / 2;
      tailCone.position.z = -1.6;
      tailPivot.add(tailCone);

      const flukes = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 1.4), finMat);
      flukes.position.z = -3.4;
      tailPivot.add(flukes);
      whale.add(tailPivot);

      // Glowing golden crown star above whale
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), this.materials.goldTrim);
      star.position.set(0, 2.7, 2.2);
      whale.add(star);

      this.scene.add(whale);
      this.skyWhale = { group: whale, leftFin, rightFin, tailPivot, angle: 0.4 };
    }

    buildAuroraCrown() {
      this.auroraGroup = new THREE.Group();
      this.auroraGroup.position.set(8, 46, -92);
      this.auroraGroup.visible = false;

      const colors = ['#ffb3c6', '#9bf6ff', '#caffbf', '#bdb2ff'];
      colors.forEach((hex, idx) => {
        const ribbonGeo = new THREE.CylinderGeometry(28 + idx * 8, 34 + idx * 8, 14, 36, 1, true);
        const ribbonMat = new THREE.MeshBasicMaterial({
          color: hex,
          transparent: true,
          opacity: 0.19,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const mesh = new THREE.Mesh(ribbonGeo, ribbonMat);
        mesh.position.y = idx * 4.5;
        mesh.rotation.x = 0.12 * (idx % 2 === 0 ? 1 : -1);
        this.auroraGroup.add(mesh);
      });

      this.scene.add(this.auroraGroup);
    }

    activateAurora() {
      this.auroraActive = true;
      if (this.auroraGroup) this.auroraGroup.visible = true;
    }

    // =====================================================
    // ANALYTICAL FLOOR & OBSTACLE QUERIES (Fast & Seam-Free)
    // =====================================================
    sampleGroundHeight(px, py, pz, playerRadius = 0.48) {
      let bestY = -Infinity;
      const stepTolerance = 0.88;

      // 1. Check all Island & Terrace Discs
      for (let i = 0; i < this.discPlatforms.length; i++) {
        const d = this.discPlatforms[i];
        const dx = px - d.x;
        const dz = pz - d.z;
        const rEff = d.radius + playerRadius * 0.35;
        if (dx * dx + dz * dz <= rEff * rEff) {
          if (py >= d.yTop - 1.65 && d.yTop <= py + stepTolerance) {
            if (d.yTop > bestY) bestY = d.yTop;
          } else if (py >= d.yTop - 0.35 && d.yTop > bestY && py + stepTolerance >= d.yTop) {
            bestY = d.yTop;
          }
        }
      }

      // 2. Check all Active Rainbow Bridges
      for (let i = 0; i < this.bridgeColliders.length; i++) {
        const b = this.bridgeColliders[i];
        if (!b.active) continue;
        const abx = b.x2 - b.x1;
        const abz = b.z2 - b.z1;
        const lenSq = abx * abx + abz * abz;
        if (lenSq < 0.001) continue;

        const apx = px - b.x1;
        const apz = pz - b.z1;
        const t = (apx * abx + apz * abz) / lenSq;
        if (t < -0.03 || t > 1.03) continue;

        const len = Math.sqrt(lenSq);
        const perp = Math.abs(-apx * abz + apz * abx) / len;
        if (perp > b.halfWidth + playerRadius * 0.3) continue;

        const tc = Math.max(0, Math.min(1, t));
        const surfY = b.y1 + (b.y2 - b.y1) * tc + Math.sin(tc * Math.PI) * b.arch;
        if (py >= surfY - 1.8 && surfY <= py + 1.15) {
          if (surfY > bestY) bestY = surfY;
        }
      }

      return bestY;
    }

    resolveHorizontalCollisions(pos, playerRadius = 0.48) {
      // 1. Tree trunks, cottages, windmills, arch pillars
      for (let i = 0; i < this.pillars.length; i++) {
        const p = this.pillars[i];
        if (pos.y > p.yMax || pos.y + 1.4 < p.yMin) continue;
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        const distSq = dx * dx + dz * dz;
        const minDist = p.radius + playerRadius;
        if (distSq < minDist * minDist && distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const push = minDist - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        }
      }

      // 2. Island side cliffs (when below surface cap)
      for (let i = 0; i < this.discPlatforms.length; i++) {
        const d = this.discPlatforms[i];
        if (pos.y >= d.yTop - 0.65 || pos.y < d.yBottom) continue;
        const dx = pos.x - d.x;
        const dz = pos.z - d.z;
        const distSq = dx * dx + dz * dz;
        const minDist = d.radius + playerRadius * 0.6;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const push = minDist - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        }
      }
    }

    getNearestVisitedIsland(px, pz) {
      let best = this.islands[0];
      let bestD = Infinity;
      this.islands.forEach(isl => {
        const dx = px - isl.center.x;
        const dz = pz - isl.center.z;
        const d = Math.hypot(dx, dz);
        if (d < bestD) {
          bestD = d;
          best = isl;
        }
      });
      return best;
    }

    detectCurrentIsland(px, py, pz) {
      for (let i = 0; i < this.islands.length; i++) {
        const isl = this.islands[i];
        const d = Math.hypot(px - isl.center.x, pz - isl.center.z);
        if (d <= isl.radius + 5 && Math.abs(py - isl.center.y) < 16) {
          return isl;
        }
      }
      return null;
    }

    update(dt, elapsed) {
      // Smoothly interpolate Sky Mood colors & lighting
      const targetMood = SKY_MOODS[this.moodIndex];
      const lerpFactor = Math.min(1, dt * 2.2);
      this.skyUniforms.uTop.value.lerp(targetMood.topColor, lerpFactor);
      this.skyUniforms.uMid.value.lerp(targetMood.midColor, lerpFactor);
      this.skyUniforms.uBot.value.lerp(targetMood.botColor, lerpFactor);
      this.skyUniforms.uTime.value = elapsed;

      this.scene.fog.color.lerp(targetMood.fogColor, lerpFactor);
      this.sunLight.color.lerp(targetMood.sunColor, lerpFactor);
      this.sunLight.intensity += (targetMood.sunIntensity - this.sunLight.intensity) * lerpFactor;
      this.hemiLight.color.lerp(targetMood.hemiSky, lerpFactor);
      this.hemiLight.groundColor.lerp(targetMood.hemiGround, lerpFactor);
      this.hemiLight.intensity += (targetMood.hemiIntensity - this.hemiLight.intensity) * lerpFactor;
      this.starMat.opacity += (targetMood.starAlpha - this.starMat.opacity) * lerpFactor;
      this.starPoints.rotation.y = elapsed * 0.008;

      // Update Animated Props (Windmill, Floating Crystals, Armillary Rings, Clouds)
      for (let i = 0; i < this.animatedProps.length; i++) {
        const p = this.animatedProps[i];
        if (p.type === 'windmill') {
          p.mesh.rotation.z -= dt * p.speed;
        } else if (p.type === 'float') {
          p.mesh.position.y = p.baseY + Math.sin(elapsed * 1.4 + p.phase) * p.amp;
          p.mesh.rotation.y += dt * 0.35;
        } else if (p.type === 'armillary') {
          p.r1.rotation.y = elapsed * 0.28;
          p.r1.rotation.x = Math.sin(elapsed * 0.2) * 0.35;
          p.r2.rotation.z = -elapsed * 0.42;
        } else if (p.type === 'cloudDrift') {
          p.mesh.position.x = p.baseX + Math.sin(elapsed * 0.14 + p.phase) * p.amp;
        }
      }

      // Bouncy cloud spring recovery
      for (let i = 0; i < this.bouncyClouds.length; i++) {
        const bc = this.bouncyClouds[i];
        if (bc.squish > 0.001) {
          bc.squish = Math.max(0, bc.squish - dt * 3.5);
          const s = Math.sin(bc.squish * Math.PI * 3) * bc.squish * 0.35;
          bc.mesh.scale.set(1 + s, 1 - s, 1 + s);
        } else {
          bc.mesh.scale.set(1, 1, 1);
        }
      }

      // Updraft Wind Rings Rising Animation
      for (let i = 0; i < this.updrafts.length; i++) {
        const u = this.updrafts[i];
        if (!u.active) continue;
        const h = u.yTop - u.yBase;
        for (let r = 0; r < u.rings.length; r++) {
          const ring = u.rings[r];
          const prog = (ring.userData.offset + elapsed * 0.42) % 1;
          ring.position.y = prog * h;
          const fade = Math.sin(prog * Math.PI);
          ring.material.opacity = fade * 0.52;
          const sc = 0.85 + prog * 0.35;
          ring.scale.set(sc, sc, 1);
        }
      }

      // Sky Whale Graceful Orbit
      if (this.skyWhale) {
        const w = this.skyWhale;
        w.angle += dt * 0.085;
        const rx = 68;
        const rz = 62;
        const cx = 6;
        const cz = -46;
        const wx = cx + Math.cos(w.angle) * rx;
        const wz = cz + Math.sin(w.angle) * rz;
        const wy = 29.5 + Math.sin(w.angle * 2.0) * 3.8;

        const nextX = cx + Math.cos(w.angle + 0.05) * rx;
        const nextZ = cz + Math.sin(w.angle + 0.05) * rz;
        const nextY = 29.5 + Math.sin((w.angle + 0.05) * 2.0) * 3.8;

        w.group.position.set(wx, wy, wz);
        w.group.lookAt(nextX, nextY, nextZ);

        const flap = Math.sin(elapsed * 2.1) * 0.36;
        w.leftFin.rotation.z = flap;
        w.rightFin.rotation.z = -flap;
        w.tailPivot.rotation.x = Math.sin(elapsed * 2.1 - 0.8) * 0.25;
      }

      // Aurora Crown Shimmer
      if (this.auroraActive && this.auroraGroup) {
        this.auroraGroup.rotation.y = elapsed * 0.12;
      }
    }
  }

  window.PastelWorld = PastelWorld;
})();
