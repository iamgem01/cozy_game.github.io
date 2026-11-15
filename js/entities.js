(function () {
  'use strict';

  function makeCapsule(r, len, segs = 12) {
    if (THREE.CapsuleGeometry) {
      return new THREE.CapsuleGeometry(r, len, 8, segs);
    }
    return new THREE.CylinderGeometry(r, r, len + r * 1.5, segs, 3);
  }

  // =========================================================================
  // 1. LUMI HERO 3D MODEL & PROCEDURAL ANIMATOR
  // =========================================================================
  class LumiCharacter {
    constructor(scene) {
      this.scene = scene;
      this.root = new THREE.Group();
      this.visual = new THREE.Group(); // Squashes, tilts, pitches independently
      this.root.add(this.visual);

      this.blinkTimer = 2.5;
      this.squash = 0; // >0 squash on land, <0 stretch on jump
      this.runPhase = 0;
      this.wingFold = 0.95;
      this.flapKick = 0;

      this.buildMesh();
      this.buildRescueCloud();
      this.scene.add(this.root);
    }

    buildButterflyWingSide(dir) {
      const s = dir; // +1 right (+X), -1 left (-X)
      const rootPivot = new THREE.Group();
      rootPivot.position.set(s * 0.08, 0.78, -0.21);

      const foreMat = new THREE.MeshStandardMaterial({
        color: '#ffc8e2',
        emissive: '#ff94c2',
        emissiveIntensity: 0.36,
        roughness: 0.28,
        metalness: 0.05,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });

      const hindMat = new THREE.MeshStandardMaterial({
        color: '#c4ebff',
        emissive: '#8fd8ff',
        emissiveIntensity: 0.36,
        roughness: 0.28,
        metalness: 0.05,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide
      });

      const innerGlowMat = new THREE.MeshBasicMaterial({
        color: '#fff4fa',
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide
      });

      const spotGoldMat = new THREE.MeshBasicMaterial({
        color: '#fff3bf',
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide
      });

      const spotLavenderMat = new THREE.MeshBasicMaterial({
        color: '#e6d6ff',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });

      const makeWingGeo = (shape) => {
        if (THREE.ExtrudeGeometry) {
          return new THREE.ExtrudeGeometry(shape, {
            depth: 0.016,
            bevelEnabled: true,
            bevelThickness: 0.006,
            bevelSize: 0.006,
            bevelSegments: 2,
            curveSegments: 18
          });
        }
        return new THREE.ShapeGeometry(shape, 16);
      };

      // 1. Upper Forewing (Monarch / Morpho sweeping Bezier silhouette)
      const foreGroup = new THREE.Group();
      const foreShape = new THREE.Shape();
      foreShape.moveTo(0, 0.02);
      foreShape.bezierCurveTo(s * 0.26, 0.60, s * 0.86, 1.04, s * 1.34, 0.84);
      foreShape.bezierCurveTo(s * 1.54, 0.70, s * 1.44, 0.20, s * 1.08, -0.04);
      foreShape.bezierCurveTo(s * 0.72, -0.16, s * 0.32, -0.09, 0, -0.03);

      const foreMesh = new THREE.Mesh(makeWingGeo(foreShape), foreMat);
      foreMesh.position.z = -0.008;
      foreGroup.add(foreMesh);

      // Luminous inner forewing cell pattern
      const cellShape = new THREE.Shape();
      cellShape.moveTo(s * 0.12, 0.06);
      cellShape.bezierCurveTo(s * 0.30, 0.42, s * 0.72, 0.70, s * 0.98, 0.56);
      cellShape.bezierCurveTo(s * 1.08, 0.44, s * 0.98, 0.18, s * 0.74, 0.04);
      cellShape.bezierCurveTo(s * 0.50, -0.04, s * 0.24, 0.0, s * 0.12, 0.06);
      if (THREE.ShapeGeometry) {
        const cellGeo = new THREE.ShapeGeometry(cellShape, 12);
        const cellFront = new THREE.Mesh(cellGeo, innerGlowMat);
        cellFront.position.z = 0.016;
        const cellBack = cellFront.clone();
        cellBack.position.z = -0.017;
        foreGroup.add(cellFront, cellBack);
      }

      // Delicate butterfly wing spots (ocelli) along outer margin
      [
        [1.14, 0.62, 0.095, spotGoldMat],
        [1.21, 0.36, 0.072, spotLavenderMat],
        [1.02, 0.14, 0.058, spotGoldMat]
      ].forEach(([ox, oy, r, mat]) => {
        const spot = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
        spot.scale.set(1.15, 0.85, 0.32);
        spot.position.set(s * ox, oy, 0);
        foreGroup.add(spot);
      });

      rootPivot.add(foreGroup);

      // 2. Lower Hindwing (Scalloped Swallowtail lobe with secondary flutter pivot)
      const hindPivot = new THREE.Group();
      const hindShape = new THREE.Shape();
      hindShape.moveTo(0, -0.03);
      hindShape.bezierCurveTo(s * 0.40, -0.05, s * 0.90, -0.15, s * 0.96, -0.45);
      hindShape.bezierCurveTo(s * 1.00, -0.74, s * 0.74, -0.94, s * 0.50, -0.84);
      hindShape.bezierCurveTo(s * 0.40, -1.02, s * 0.25, -0.92, s * 0.21, -0.72);
      hindShape.bezierCurveTo(s * 0.10, -0.48, s * 0.04, -0.22, 0, -0.11);

      const hindMesh = new THREE.Mesh(makeWingGeo(hindShape), hindMat);
      hindMesh.position.z = -0.01;
      hindPivot.add(hindMesh);

      [
        [0.70, -0.50, 0.075, spotLavenderMat],
        [0.44, -0.68, 0.062, spotGoldMat]
      ].forEach(([ox, oy, r, mat]) => {
        const spot = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
        spot.scale.set(1.0, 1.1, 0.32);
        spot.position.set(s * ox, oy, 0);
        hindPivot.add(spot);
      });

      rootPivot.add(hindPivot);
      return { rootPivot, foreGroup, hindPivot };
    }

    buildMesh() {
      const matBody = new THREE.MeshStandardMaterial({ color: '#fff9fc', roughness: 0.65 });
      const matPoncho = new THREE.MeshStandardMaterial({ color: '#a8d8ff', roughness: 0.6, emissive: '#89c2ff', emissiveIntensity: 0.12 });
      const matScarf = new THREE.MeshStandardMaterial({ color: '#ff9ebb', roughness: 0.55, emissive: '#ff8fab', emissiveIntensity: 0.15 });
      const matEye = new THREE.MeshStandardMaterial({ color: '#3b284d', roughness: 0.2 });
      const matBlush = new THREE.MeshBasicMaterial({ color: '#ffb3c6', transparent: true, opacity: 0.75 });
      const matGold = new THREE.MeshStandardMaterial({ color: '#ffe082', roughness: 0.3, emissive: '#ffd166', emissiveIntensity: 0.45 });
      const matFoot = new THREE.MeshStandardMaterial({ color: '#ffc2d4', roughness: 0.7 });

      // Chibi Torso + Pastel Sky Poncho
      const torso = new THREE.Mesh(makeCapsule(0.34, 0.36), matBody);
      torso.position.y = 0.62;
      torso.castShadow = true;
      this.visual.add(torso);

      const poncho = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.58, 14), matPoncho);
      poncho.position.y = 0.68;
      poncho.castShadow = true;
      this.visual.add(poncho);

      // Subtle Ribbon Bow on Back between Butterfly Wings
      this.capePivot = new THREE.Group();
      this.capePivot.position.set(0, 0.78, -0.22);
      const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), matScarf);
      this.capePivot.add(bowCenter);
      this.visual.add(this.capePivot);

      // Cute Round Head
      this.headGroup = new THREE.Group();
      this.headGroup.position.y = 1.16;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), matBody);
      head.scale.set(1.06, 0.96, 1.02);
      head.castShadow = true;
      this.headGroup.add(head);

      // Cozy Collar + Delicate Paired Butterfly Feelers (Râu bướm phát sáng)
      const scarfCollar = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 8, 20), matScarf);
      scarfCollar.rotation.x = Math.PI / 2;
      scarfCollar.position.y = -0.26;
      this.headGroup.add(scarfCollar);

      this.feelers = new THREE.Group();
      [-1, 1].forEach(side => {
        const feelerPivot = new THREE.Group();
        feelerPivot.position.set(side * 0.09, 0.36, 0.12);
        feelerPivot.rotation.z = -side * 0.34;
        feelerPivot.rotation.x = 0.22;

        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.34, 6), matGold);
        stalk.position.y = 0.17;
        feelerPivot.add(stalk);

        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), matGold);
        tip.position.set(side * 0.03, 0.35, 0.02);
        feelerPivot.add(tip);
        this.feelers.add(feelerPivot);
      });
      this.headGroup.add(this.feelers);

      // Expressive Eyes & Rosy Cheeks (facing +Z)
      this.leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 10), matEye);
      this.leftEye.scale.set(0.9, 1.35, 0.6);
      this.leftEye.position.set(-0.14, 0.02, 0.39);
      this.rightEye = this.leftEye.clone();
      this.rightEye.position.set(0.14, 0.02, 0.39);
      this.headGroup.add(this.leftEye, this.rightEye);

      [-0.24, 0.24].forEach(bx => {
        const blush = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), matBlush);
        blush.scale.set(1.2, 0.65, 0.4);
        blush.position.set(bx, -0.06, 0.37);
        this.headGroup.add(blush);
      });

      this.visual.add(this.headGroup);

      // Arms & Feet
      this.leftArm = new THREE.Mesh(makeCapsule(0.09, 0.2), matBody);
      this.leftArm.position.set(-0.44, 0.66, 0);
      this.rightArm = this.leftArm.clone();
      this.rightArm.position.set(0.44, 0.66, 0);
      this.visual.add(this.leftArm, this.rightArm);

      this.leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), matFoot);
      this.leftFoot.scale.set(0.95, 0.7, 1.35);
      this.leftFoot.position.set(-0.16, 0.1, 0.04);
      this.rightFoot = this.leftFoot.clone();
      this.rightFoot.position.set(0.16, 0.1, 0.04);
      this.visual.add(this.leftFoot, this.rightFoot);

      // Sculpted Pastel Butterfly Wings!
      this.leftButterfly = this.buildButterflyWingSide(-1);
      this.rightButterfly = this.buildButterflyWingSide(1);
      this.visual.add(this.leftButterfly.rootPivot, this.rightButterfly.rootPivot);

      // Subtle Blob Shadow Disc projected onto ground beneath Lumi
      const shadowGeo = new THREE.CircleGeometry(0.52, 20);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: '#523b68',
        transparent: true,
        opacity: 0.24,
        depthWrite: false
      });
      this.blobShadow = new THREE.Mesh(shadowGeo, shadowMat);
      this.blobShadow.rotation.x = -Math.PI / 2;
      this.scene.add(this.blobShadow);
    }

    buildRescueCloud() {
      this.rescueCloud = new THREE.Group();
      this.rescueCloud.visible = false;
      const mat = new THREE.MeshStandardMaterial({
        color: '#ffd1e6',
        emissive: '#ff9ec7',
        emissiveIntensity: 0.35,
        roughness: 0.7
      });
      [[0, -0.15, 0, 0.75], [-0.5, -0.2, 0.2, 0.52], [0.5, -0.2, -0.15, 0.52], [0, -0.22, 0.48, 0.48]].forEach(([x, y, z, r]) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);
        m.position.set(x, y, z);
        m.scale.y = 0.55;
        this.rescueCloud.add(m);
      });
      this.root.add(this.rescueCloud);
    }

    triggerSquash(amount) {
      this.squash = amount;
    }

    triggerFlap() {
      this.flapKick = 1.0;
    }

    update(dt, elapsed, state) {
      // state: { pos, groundY, speed, maxSpeed, grounded, gliding, rescuing, turnRate, dashTimer }
      this.root.position.copy(state.pos);

      // Update Ground Shadow Disc
      if (Number.isFinite(state.groundY) && state.groundY > -100) {
        const h = Math.max(0, state.pos.y - state.groundY);
        this.blobShadow.visible = h < 18;
        this.blobShadow.position.set(state.pos.x, state.groundY + 0.04, state.pos.z);
        const s = Math.max(0.32, 1 - h * 0.045);
        this.blobShadow.scale.setScalar(s);
        this.blobShadow.material.opacity = 0.25 * s;
      } else {
        this.blobShadow.visible = false;
      }

      this.rescueCloud.visible = !!state.rescuing;

      // Recover Squash/Stretch spring
      this.squash += (0 - this.squash) * Math.min(1, dt * 10);
      const sy = 1 - this.squash * 0.28;
      const sxz = 1 + this.squash * 0.18;
      this.visual.scale.set(sxz, sy, sxz);

      // Blinking animation
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.leftEye.scale.y = 0.12;
        this.rightEye.scale.y = 0.12;
        if (this.blinkTimer < -0.13) {
          this.leftEye.scale.y = 1.35;
          this.rightEye.scale.y = 1.35;
          this.blinkTimer = 2.4 + Math.random() * 2.8;
        }
      }

      // Butterfly feelers gentle sway
      const moveRatio = Math.min(1, state.speed / (state.maxSpeed || 9));
      if (this.feelers) {
        this.feelers.rotation.x = Math.sin(elapsed * 3.0) * 0.08 - moveRatio * 0.18;
      }

      // Limb animations
      if (state.grounded && moveRatio > 0.06) {
        this.runPhase += dt * (8 + moveRatio * 7);
        const swing = Math.sin(this.runPhase);
        this.leftFoot.position.z = 0.04 + swing * 0.24 * moveRatio;
        this.rightFoot.position.z = 0.04 - swing * 0.24 * moveRatio;
        this.leftFoot.position.y = 0.1 + Math.max(0, swing) * 0.12;
        this.rightFoot.position.y = 0.1 + Math.max(0, -swing) * 0.12;

        this.leftArm.rotation.x = -swing * 0.65 * moveRatio;
        this.rightArm.rotation.x = swing * 0.65 * moveRatio;
        this.visual.position.y = Math.abs(Math.cos(this.runPhase)) * 0.09 * moveRatio;
      } else {
        this.leftFoot.position.set(-0.16, 0.1, 0.04);
        this.rightFoot.position.set(0.16, 0.1, 0.04);
        this.leftArm.rotation.x = state.gliding ? 0.35 : 0;
        this.rightArm.rotation.x = state.gliding ? 0.35 : 0;
        this.visual.position.y = state.grounded ? Math.sin(elapsed * 2.4) * 0.03 : 0;
      }

      // Glider Pitch & Banking Roll
      const targetPitch = state.gliding ? 0.28 : (state.dashTimer > 0 ? 0.22 : moveRatio * 0.09);
      const targetRoll = -state.turnRate * (state.gliding ? 0.45 : 0.16);
      this.visual.rotation.x += (targetPitch - this.visual.rotation.x) * Math.min(1, dt * 8);
      this.visual.rotation.z += (targetRoll - this.visual.rotation.z) * Math.min(1, dt * 8);

      // Organic 3D Butterfly Wing Articulation
      if (this.flapKick > 0) {
        this.flapKick = Math.max(0, this.flapKick - dt * 2.8);
      }

      // Fold angle around Y: 0.20 = spread wide open for gliding, 0.98 = folded gracefully back when resting
      let targetFold = 0.96;
      let flutterAmp = 0.13;
      let flutterFreq = 2.6;
      let wingScaleTarget = 0.82;

      if (state.gliding || state.rescuing) {
        targetFold = 0.22;
        flutterAmp = 0.26;
        flutterFreq = 5.4;
        wingScaleTarget = 1.12;
      } else if (!state.grounded) {
        targetFold = 0.42;
        flutterAmp = 0.42;
        flutterFreq = 11.5;
        wingScaleTarget = 1.04;
      } else if (moveRatio > 0.1) {
        targetFold = 0.78;
        flutterAmp = 0.24;
        flutterFreq = 8.5;
        wingScaleTarget = 0.88;
      }

      this.wingFold += (targetFold - this.wingFold) * Math.min(1, dt * 9);
      const beatWave = Math.sin(elapsed * flutterFreq) * flutterAmp;
      const kickStroke = Math.sin(this.flapKick * Math.PI * 2.2) * this.flapKick * 0.72;
      const currentAngle = Math.max(-0.25, this.wingFold + beatWave - kickStroke);

      // Secondary lagging wave for lower hindwings (living butterfly ripple!)
      const hindLag = Math.cos(elapsed * flutterFreq) * flutterAmp * 0.38;

      this.rightButterfly.rootPivot.rotation.y = currentAngle;
      this.leftButterfly.rootPivot.rotation.y = -currentAngle;

      const dihedral = state.gliding ? 0.12 : 0.04;
      this.rightButterfly.rootPivot.rotation.z = dihedral;
      this.leftButterfly.rootPivot.rotation.z = -dihedral;

      this.rightButterfly.hindPivot.rotation.y = hindLag;
      this.leftButterfly.hindPivot.rotation.y = -hindLag;

      this.rightButterfly.rootPivot.scale.setScalar(wingScaleTarget);
      this.leftButterfly.rootPivot.scale.setScalar(wingScaleTarget);
    }
  }

  // =========================================================================
  // 2. NPCs, COLLECTIBLES, RELICS & COZY PARTICLES MANAGER
  // =========================================================================
  class PastelEntities {
    constructor(scene) {
      this.scene = scene;
      this.npcs = [];
      this.stars = [];
      this.questItems = [];
      this.windChimes = [];
      this.relics = [];
      this.grandBell = null;
      this.particles = [];

      this.buildNPCs();
      this.buildRelicsAndBell();
      this.buildQuestCollectibles();
      this.buildStarCrystals();
      this.buildAmbientPetals();
    }

    createQuestMarker(colorHex = '#ffe082') {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.65, roughness: 0.25 })
      );
      m.position.y = 2.35;
      return m;
    }

    buildCuteNPCMesh(spec) {
      const g = new THREE.Group();
      g.position.set(spec.x, spec.y, spec.z);

      const bodyMat = new THREE.MeshStandardMaterial({ color: spec.bodyColor, roughness: 0.68 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: '#fffaf5', roughness: 0.72 });
      const accMat = new THREE.MeshStandardMaterial({ color: spec.accentColor, roughness: 0.55 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: '#3b284d', roughness: 0.2 });

      // Chubby body + belly
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 14), bodyMat);
      body.scale.set(1, 1.08, 0.95);
      body.position.y = 0.62;
      body.castShadow = true;
      g.add(body);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), bellyMat);
      belly.position.set(0, 0.56, 0.24);
      g.add(belly);

      const head = new THREE.Group();
      head.position.y = 1.28;
      const headBall = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 14), bodyMat);
      headBall.castShadow = true;
      head.add(headBall);

      // Eyes
      [-0.15, 0.15].forEach(ex => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat);
        e.position.set(ex, 0.04, 0.42);
        head.add(e);
      });

      // Species-specific cute features!
      if (spec.species === 'owl') {
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 6), accMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, -0.04, 0.48);
        head.add(beak);
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.52, 10), accMat);
        hat.position.set(0, 0.55, 0);
        head.add(hat);
      } else if (spec.species === 'bunny') {
        [-0.18, 0.18].forEach(ex => {
          const ear = new THREE.Mesh(makeCapsule(0.09, 0.42, 10), bodyMat);
          ear.position.set(ex, 0.56, -0.04);
          ear.rotation.z = ex * -0.25;
          head.add(ear);
        });
      } else if (spec.species === 'frog') {
        [-0.2, 0.2].forEach(ex => {
          const bump = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), bodyMat);
          bump.position.set(ex, 0.36, 0.15);
          head.add(bump);
        });
        const beret = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), accMat);
        beret.scale.set(1.15, 0.42, 1.15);
        beret.position.set(0.08, 0.44, -0.05);
        head.add(beret);
      } else if (spec.species === 'fox') {
        [-0.24, 0.24].forEach(ex => {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.36, 6), accMat);
          ear.position.set(ex, 0.46, 0);
          ear.rotation.z = ex * -0.35;
          head.add(ear);
        });
        const chefHat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.36, 12), bellyMat);
        chefHat.position.set(0, 0.54, 0);
        head.add(chefHat);
      } else if (spec.species === 'turtle') {
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.66, 14, 12), accMat);
        shell.position.set(0, 0.68, -0.22);
        shell.scale.set(1.05, 1.1, 0.72);
        g.add(shell);
      } else if (spec.species === 'spirit') {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.045, 8, 24), accMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.set(0, 0.62, 0);
        head.add(halo);
      }

      g.add(head);
      const marker = this.createQuestMarker('#ffe082');
      g.add(marker);

      this.scene.add(g);
      return { group: g, head, marker };
    }

    buildNPCs() {
      const specs = [
        {
          id: 'npc_owl',
          name: 'Bác Cú Mơ',
          role: 'Hiền Giả Đảo Mầm Mơ',
          avatar: 'CM',
          species: 'owl',
          voicePitch: 360,
          x: 3.4, y: 1.7, z: -1.1,
          bodyColor: '#d9ccf8',
          accentColor: '#ffb870'
        },
        {
          id: 'npc_bunny',
          name: 'Bé Thỏ Mochi',
          role: 'Người Trồng Hoa Anh Đào',
          avatar: 'TM',
          species: 'bunny',
          voicePitch: 590,
          x: 56.5, y: 5.5, z: -19.5,
          bodyColor: '#ffc4d6',
          accentColor: '#ff8fab'
        },
        {
          id: 'npc_frog',
          name: 'Nhạc Sĩ Ếch Cốm',
          role: 'Người Gẩy Đàn Bên Hồ Gương',
          avatar: 'EC',
          species: 'frog',
          voicePitch: 430,
          x: 48.2, y: 5.5, z: -10.2,
          bodyColor: '#a8e6cf',
          accentColor: '#ffe082'
        },
        {
          id: 'npc_fox',
          name: 'Tiểu Hồ Bơ',
          role: 'Thợ Bánh Cối Xay Gió',
          avatar: 'HB',
          species: 'fox',
          voicePitch: 520,
          x: -49.5, y: 4.5, z: 27.5,
          bodyColor: '#ffc085',
          accentColor: '#ff8fab'
        },
        {
          id: 'npc_turtle',
          name: 'Cụ Rùa Tinh Vân',
          role: 'Nhà Chiêm Tinh Pha Lê',
          avatar: 'RT',
          species: 'turtle',
          voicePitch: 310,
          x: -45.5, y: 13.5, z: -52.5,
          bodyColor: '#b8e0d2',
          accentColor: '#9d8df1'
        },
        {
          id: 'npc_spirit',
          name: 'Tinh Linh Ngân Hà',
          role: 'Người Gác Đại Hồng Chung',
          avatar: 'TL',
          species: 'spirit',
          voicePitch: 660,
          x: 11.8, y: 30.0, z: -92.5,
          bodyColor: '#dff2ff',
          accentColor: '#ffe082'
        }
      ];

      specs.forEach(s => {
        const built = this.buildCuteNPCMesh(s);
        this.npcs.push({ ...s, ...built });
      });
    }

    buildRelicsAndBell() {
      const relicSpecs = [
        {
          id: 'relic_meadow',
          name: 'Cổ Vật Gió Xuân',
          islandId: 'meadow',
          x: 0, y: 1.7, z: -3.2,
          color: '#76e5c2',
          unlockBridges: ['bridge_sakura', 'bridge_honey'],
          desc: 'Đã dệt Cầu Cầu Vồng nối tới Đảo Hoa Anh Đào & Đảo Bánh Mây Vàng!'
        },
        {
          id: 'relic_sakura',
          name: 'Cổ Vật Hoa Đào',
          islandId: 'sakura',
          x: 61.5, y: 8.2, z: -25.5,
          color: '#ff9ebb',
          unlockBridges: ['bridge_sakura_sky'],
          desc: 'Đã dệt Cầu Ánh Sao vươn thẳng từ Đảo Anh Đào lên Đỉnh Thiên Hà!'
        },
        {
          id: 'relic_honey',
          name: 'Cổ Vật Nắng Mật',
          islandId: 'honey',
          x: -55.5, y: 7.3, z: 25.0,
          color: '#ffd166',
          unlockBridges: ['bridge_crystal'],
          desc: 'Đã dệt Cầu Cầu Vồng dẫn lối lên Đảo Pha Lê Tím!'
        },
        {
          id: 'relic_crystal',
          name: 'Cổ Vật Tinh Vân',
          islandId: 'crystal',
          x: -49.0, y: 17.0, z: -60.5,
          color: '#b197fc',
          unlockBridges: ['bridge_celestial'],
          unlockUpdraft: 'updraft_summit',
          desc: 'Đã mở Đại Lộ Cầu Vồng & Cột Gió Trung Tâm vươn tới Đỉnh Thiên Hà!'
        }
      ];

      const pedMat = new THREE.MeshStandardMaterial({ color: '#f5effa', roughness: 0.65 });

      relicSpecs.forEach(r => {
        const g = new THREE.Group();
        g.position.set(r.x, r.y, r.z);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 1.1, 8), pedMat);
        base.position.y = 0.55;
        base.castShadow = true;
        g.add(base);

        const coreMat = new THREE.MeshStandardMaterial({
          color: r.color,
          emissive: r.color,
          emissiveIntensity: 0.25,
          roughness: 0.2
        });
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), coreMat);
        crystal.position.y = 1.95;
        g.add(crystal);

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.92, 0.055, 8, 28),
          new THREE.MeshStandardMaterial({ color: '#ffe082', emissive: '#ffd166', emissiveIntensity: 0.35 })
        );
        ring.position.y = 1.95;
        g.add(ring);

        // Skyward light beam (visible once awakened!)
        const beamGeo = new THREE.CylinderGeometry(0.32, 0.82, 55, 14, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
          color: r.color,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 28;
        beam.visible = false;
        g.add(beam);

        this.scene.add(g);
        this.relics.push({
          ...r,
          awakened: false,
          group: g,
          crystal,
          ring,
          beam,
          coreMat
        });
      });

      // Grand Celestial Bell on Summit (8, 30.0, -95)
      const bellGroup = new THREE.Group();
      bellGroup.position.set(8, 30.0, -95);
      const bellMat = new THREE.MeshStandardMaterial({
        color: '#ffe082',
        roughness: 0.25,
        metalness: 0.35,
        emissive: '#ffc966',
        emissiveIntensity: 0.4
      });
      const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.15, 1.65, 18), bellMat);
      bellBody.position.y = 3.55;
      bellGroup.add(bellBody);

      const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), bellMat);
      clapper.position.y = 2.65;
      bellGroup.add(clapper);

      this.scene.add(bellGroup);
      this.grandBell = {
        x: 8, y: 30.0, z: -95,
        rung: false,
        swing: 0,
        group: bellGroup,
        bellBody
      };
    }

    buildQuestCollectibles() {
      const addCollectible = (type, colorHex, coords) => {
        coords.forEach(([x, y, z], idx) => {
          const g = new THREE.Group();
          g.position.set(x, y, z);

          let mesh;
          const mat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 0.55,
            roughness: 0.25
          });

          if (type === 'sakura_bloom') {
            mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), mat);
          } else if (type === 'honey_drop') {
            mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), mat);
            mesh.scale.set(0.9, 1.25, 0.9);
          } else {
            mesh = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.88, 5), mat);
          }
          g.add(mesh);

          const halo = new THREE.Mesh(
            new THREE.TorusGeometry(0.58, 0.035, 6, 20),
            new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.65 })
          );
          halo.rotation.x = Math.PI / 2;
          g.add(halo);

          this.scene.add(g);
          this.questItems.push({
            id: `${type}_${idx}`,
            type,
            x, y, z,
            baseY: y,
            collected: false,
            group: g,
            mesh
          });
        });
      };

      // 5 Glowing Sakura Blooms on Sakura Whisper Isle
      addCollectible('sakura_bloom', '#ff85a9', [
        [50.5, 6.5, -12.0],
        [63.5, 6.3, -7.5],
        [49.5, 6.3, -25.0],
        [69.5, 9.0, -20.5],
        [74.5, 6.3, -15.5]
      ]);

      // 5 Starry Honey Drops on Honeybell Windmill Isle
      addCollectible('honey_drop', '#ffbe3b', [
        [-50.0, 7.0, 14.0],
        [-64.0, 10.3, 18.0],
        [-56.5, 5.3, 11.5],
        [-42.5, 5.3, 22.5],
        [-66.5, 8.1, 31.0]
      ]);

      // 3 Violet Prism Shards on Lavender Crystal Spire
      addCollectible('prism_shard', '#9bf6ff', [
        [-34.0, 16.1, -52.0],
        [-58.0, 20.3, -50.0],
        [-40.5, 14.4, -64.5]
      ]);

      // 3 Interactive Crystal Wind Chimes on Crystal Spire (for Frog Musician's quest)
      const chimeCoords = [
        [-41.0, 13.5, -47.5],
        [-55.0, 13.5, -58.5],
        [-53.5, 17.0, -63.0]
      ];
      chimeCoords.forEach(([x, y, z], idx) => {
        const g = new THREE.Group();
        g.position.set(x, y, z);

        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.14, 2.5, 8),
          new THREE.MeshStandardMaterial({ color: '#e9def8', roughness: 0.6 })
        );
        post.position.y = 1.25;
        g.add(post);

        const chimeMat = new THREE.MeshStandardMaterial({
          color: '#b8f2ff',
          emissive: '#89e2ff',
          emissiveIntensity: 0.25,
          roughness: 0.2
        });
        const crystalRod = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.08, 1.15, 6), chimeMat);
        crystalRod.position.y = 1.9;
        g.add(crystalRod);

        this.scene.add(g);
        this.windChimes.push({
          id: `chime_${idx}`,
          index: idx,
          x, y, z,
          harmonized: false,
          sway: 0,
          group: g,
          crystalRod,
          chimeMat
        });
      });
    }

    buildStarCrystals() {
      // Exactly 36 Star Crystals across all 5 Islands, Bouncy Clouds & Sky Streams
      const coords = [
        // Meadow Blossom Hub (8)
        [0, 1.0, 5.5], [-6, 1.0, 8], [7, 1.0, 9], [-11, 3.2, -3.5],
        [16, 2.4, -5], [0, 4.8, -6.5], [-16, 1.0, 12], [11, 1.0, 16],
        // Cloud Paths & Updrafts (8)
        [27, 4.2, -8], [36, 6.2, -12], [-23, 3.8, 10], [-34, 5.6, 17],
        [31, 9.5, -20], [-38, 12.0, -22], [-24, 8.8, -28], [-33, 12.8, -40],
        // Sakura Whisper Isle (6)
        [44, 7.2, -15], [53.8, 6.7, -14.2], [58, 6.5, -26],
        [65, 9.3, -18], [71, 9.3, -25], [66.5, 13.2, -24.5],
        // Honeybell Windmill Isle (5)
        [-48, 5.5, 22], [-55, 10.2, 19], [-60, 8.3, 33], [-45, 5.5, 34], [-59, 8.3, 22],
        // Lavender Crystal Spire (5)
        [-46, 14.6, -45], [-46, 22.0, -45], [-51, 18.2, -65], [-38, 14.5, -58], [-22, 21.0, -70],
        // Celestial Crown Sanctuary (4)
        [-9, 25.5, -80], [2, 27.6, -86], [14, 27.6, -86], [8, 31.2, -90]
      ];

      const starGeo = new THREE.OctahedronGeometry(0.38, 0);
      const ringGeo = new THREE.TorusGeometry(0.52, 0.03, 6, 18);
      const colors = ['#ffe082', '#ffb3c6', '#9bf6ff', '#d8ccf8'];

      coords.forEach(([x, y, z], idx) => {
        const hex = colors[idx % colors.length];
        const g = new THREE.Group();
        g.position.set(x, y, z);

        const mat = new THREE.MeshStandardMaterial({
          color: hex,
          emissive: hex,
          emissiveIntensity: 0.52,
          roughness: 0.22
        });
        const gem = new THREE.Mesh(starGeo, mat);
        g.add(gem);

        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#fff8dc', transparent: true, opacity: 0.6 }));
        g.add(ring);

        this.scene.add(g);
        this.stars.push({
          id: idx,
          x, y, z,
          baseY: y,
          collected: false,
          group: g,
          gem,
          ring
        });
      });
    }

    buildAmbientPetals() {
      const petalCount = 160;
      const pos = new Float32Array(petalCount * 3);
      for (let i = 0; i < petalCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 180;
        pos[i * 3 + 1] = Math.random() * 42;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 180 - 25;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: '#ffd1e3',
        size: 0.55,
        transparent: true,
        opacity: 0.78
      });
      this.petalField = new THREE.Points(geo, mat);
      this.scene.add(this.petalField);
    }

    spawnBurst(x, y, z, colorHex = '#ffe082', count = 12) {
      const geo = new THREE.OctahedronGeometry(0.14, 0);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(geo, mat.clone());
        m.position.set(x, y, z);
        const a = Math.random() * Math.PI * 2;
        const spd = 2.2 + Math.random() * 4.2;
        const vy = 2.0 + Math.random() * 4.5;
        this.scene.add(m);
        this.particles.push({
          mesh: m,
          vx: Math.cos(a) * spd,
          vy,
          vz: Math.sin(a) * spd,
          life: 0.65 + Math.random() * 0.35,
          maxLife: 0.9
        });
      }
    }

    spawnTrailPuff(x, y, z, colorHex = '#fff5fb') {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 6, 6),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.7 })
      );
      m.position.set(x, y, z);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.4 + Math.random() * 0.6,
        vz: (Math.random() - 0.5) * 0.6,
        life: 0.42,
        maxLife: 0.42
      });
    }

    update(dt, elapsed, playerPos) {
      // 1. Animate NPCs & Look smoothly toward Lumi when nearby
      for (let i = 0; i < this.npcs.length; i++) {
        const n = this.npcs[i];
        n.group.position.y = n.y + Math.sin(elapsed * 2.2 + i) * 0.04;
        n.marker.position.y = 2.32 + Math.sin(elapsed * 3.4 + i) * 0.14;
        n.marker.rotation.y = elapsed * 1.8;

        const dx = playerPos.x - n.x;
        const dz = playerPos.z - n.z;
        if (dx * dx + dz * dz < 140) {
          const targetYaw = Math.atan2(dx, dz);
          let diff = targetYaw - n.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          n.group.rotation.y += diff * Math.min(1, dt * 5);
        }
      }

      // 2. Animate Star Crystals
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        if (s.collected) continue;
        s.group.position.y = s.baseY + Math.sin(elapsed * 2.6 + s.id * 0.7) * 0.22;
        s.gem.rotation.y = elapsed * 1.9 + s.id;
        s.ring.rotation.x = elapsed * 1.4;
        s.ring.rotation.y = elapsed * 1.1;
      }

      // 3. Animate Quest Collectibles
      for (let i = 0; i < this.questItems.length; i++) {
        const q = this.questItems[i];
        if (q.collected) continue;
        q.group.position.y = q.baseY + Math.sin(elapsed * 2.8 + i) * 0.2;
        q.mesh.rotation.y = elapsed * 1.6;
      }

      // 4. Animate Wind Chimes
      for (let i = 0; i < this.windChimes.length; i++) {
        const c = this.windChimes[i];
        if (c.sway > 0.001) {
          c.sway = Math.max(0, c.sway - dt * 1.2);
        }
        const baseSway = c.harmonized ? 0.12 : 0.03;
        c.crystalRod.rotation.z = Math.sin(elapsed * 5.2 + i) * (baseSway + c.sway * 0.4);
      }

      // 5. Animate Relics & Grand Bell
      for (let i = 0; i < this.relics.length; i++) {
        const r = this.relics[i];
        const spd = r.awakened ? 2.6 : 0.9;
        r.crystal.rotation.y = elapsed * spd;
        r.crystal.position.y = 1.95 + Math.sin(elapsed * 2.4 + i) * 0.16;
        r.ring.rotation.x = Math.PI / 2 + Math.sin(elapsed * 1.5 + i) * 0.45;
        r.ring.rotation.y = elapsed * spd * 0.7;
      }

      if (this.grandBell && this.grandBell.swing > 0.001) {
        this.grandBell.swing = Math.max(0, this.grandBell.swing - dt * 0.55);
        this.grandBell.bellBody.rotation.z = Math.sin(elapsed * 6.5) * this.grandBell.swing * 0.42;
      }

      // 6. Drifting Sakura Petals
      if (this.petalField) {
        const arr = this.petalField.geometry.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i] += Math.sin(elapsed * 0.6 + i) * dt * 0.8;
          arr[i + 1] -= dt * 1.15;
          arr[i + 2] += Math.cos(elapsed * 0.5 + i) * dt * 0.6;
          if (arr[i + 1] < -8) {
            arr[i + 1] = 38;
          }
        }
        this.petalField.geometry.attributes.position.needsUpdate = true;
      }

      // 7. Burst & Trail Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          this.particles.splice(i, 1);
          continue;
        }
        p.vy -= dt * 5.5;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const ratio = p.life / p.maxLife;
        p.mesh.scale.setScalar(ratio);
        p.mesh.material.opacity = ratio;
      }
    }
  }

  window.LumiCharacter = LumiCharacter;
  window.PastelEntities = PastelEntities;
})();
