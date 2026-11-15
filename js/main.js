(function () {
  'use strict';

  class PastelSkyAdventureGame {
    constructor() {
      this.canvas = document.getElementById('sky-canvas');
      this.started = false;
      this.photoMode = false;
      this.restingBench = null;

      // Feather & Buff Progression
      this.maxFeathers = 2;
      this.feathersLeft = 2;
      this.infiniteFeathers = false;
      this.glideBuff = false;

      // Input State
      this.keys = {};
      this.spaceHeld = false;
      this.joyVec = { x: 0, y: 0 };

      // Camera State
      this.camYaw = 0.0;
      this.camPitch = 0.34;
      this.camDist = 11.5;
      this.autoMouseLook = false;
      this.isDraggingCam = false;
      this.lastPointer = { x: 0, y: 0 };
      this.camLookTarget = new THREE.Vector3(0, 1.5, 0);

      // Player Physics State
      this.player = {
        pos: new THREE.Vector3(0, 0.5, 10),
        vel: new THREE.Vector3(0, 0, 0),
        yaw: Math.PI, // Facing north (-Z) toward Altar & Elder Owl!
        turnRate: 0,
        grounded: true,
        groundY: 0,
        coyoteTimer: 0,
        gliding: false,
        dashTimer: 0,
        dashCooldown: 0,
        rescuing: false,
        rescueTarget: null,
        stepTimer: 0,
        trailTimer: 0
      };

      this.currentIslandId = 'meadow';
      this.nearestInteractable = null;

      this.initThree();
      this.world = new window.PastelWorld(this.scene);
      this.lumi = new window.LumiCharacter(this.scene);
      this.entities = new window.PastelEntities(this.scene);
      this.ui = new window.QuestAndUIManager(this);

      this.bindControls();
      this.bindHUDButtons();
      this.setupTouchControls();

      this.clock = new THREE.Clock();
      this.elapsed = 0;
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    initThree() {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if ('outputEncoding' in this.renderer && THREE.sRGBEncoding) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.06;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.25, 650);

      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    bindControls() {
      window.addEventListener('keydown', (e) => {
        const code = e.code;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
          if (this.started) e.preventDefault();
        }

        const firstPress = !this.keys[code];
        this.keys[code] = true;

        if (!this.started) {
          if (code === 'Enter' || code === 'Space') this.startGame();
          return;
        }

        // Global Shortcuts
        if (firstPress && code === 'KeyM' && !this.photoMode && !this.ui.dialogueOpen) {
          this.ui.toggleMap();
          return;
        }
        if (firstPress && code === 'KeyH' && !this.ui.dialogueOpen) {
          this.toggleHelp();
          return;
        }
        if (firstPress && code === 'KeyP' && !this.ui.dialogueOpen) {
          this.togglePhotoMode();
          return;
        }
        if (firstPress && code === 'KeyT') {
          this.handleCycleMood();
          return;
        }
        if (firstPress && code === 'KeyC') {
          this.toggleCamAutoLook();
          return;
        }
        if (firstPress && code === 'KeyJ' && !this.photoMode) {
          this.ui.toggleQuestCollapse();
          return;
        }
        if (firstPress && code === 'Escape') {
          if (this.photoMode) this.togglePhotoMode(false);
          this.ui.toggleMap(false);
          document.getElementById('help-modal').classList.add('hidden');
          if (this.ui.dialogueOpen) this.ui.closeDialogue();
          return;
        }

        // Dialogue Quick Confirm with E / Space
        if (this.ui.dialogueOpen) {
          if (firstPress && (code === 'KeyE' || code === 'Space' || code === 'Enter')) {
            const primaryBtn = document.querySelector('#dialogue-choices .choice-btn');
            if (primaryBtn) primaryBtn.click();
          }
          return;
        }

        if (this.photoMode) return;

        // Stand up from scenic bench
        if (this.restingBench && firstPress && (code === 'Space' || code === 'KeyE')) {
          this.exitBenchRest();
          return;
        }

        if (code === 'Space') {
          this.spaceHeld = true;
          if (firstPress) this.triggerJumpOrFlap();
        }

        if (firstPress && (code === 'ShiftLeft' || code === 'ShiftRight')) {
          this.triggerDash();
        }

        if (firstPress && (code === 'KeyE' || code === 'KeyF')) {
          this.triggerInteract();
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
        if (e.code === 'Space') {
          this.spaceHeld = false;
          this.player.gliding = false;
        }
      });

      // Smooth Mouse Drag OR Auto-Hover Camera Orbit
      this.canvas.addEventListener('mousedown', (e) => {
        this.isDraggingCam = true;
        this.lastPointer.x = e.clientX;
        this.lastPointer.y = e.clientY;
        window.PastelAudio.init();
      });

      window.addEventListener('mouseup', () => {
        this.isDraggingCam = false;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.started) return;
        if (this.isDraggingCam) {
          const dx = e.clientX - this.lastPointer.x;
          const dy = e.clientY - this.lastPointer.y;
          this.lastPointer.x = e.clientX;
          this.lastPointer.y = e.clientY;
          this.camYaw -= dx * 0.0065;
          this.camPitch = Math.max(0.06, Math.min(1.18, this.camPitch + dy * 0.0052));
        } else if (this.autoMouseLook && !this.ui.dialogueOpen && document.getElementById('map-modal').classList.contains('hidden')) {
          const dx = e.movementX || 0;
          const dy = e.movementY || 0;
          this.camYaw -= dx * 0.0042;
          this.camPitch = Math.max(0.06, Math.min(1.18, this.camPitch + dy * 0.0035));
        }
      });

      this.canvas.addEventListener('wheel', (e) => {
        if (!this.started) return;
        e.preventDefault();
        this.camDist = Math.max(5.5, Math.min(24.0, this.camDist + e.deltaY * 0.01));
      }, { passive: false });
    }

    bindHUDButtons() {
      document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());

      document.getElementById('btn-mood').addEventListener('click', () => this.handleCycleMood());
      document.getElementById('btn-cam-lock').addEventListener('click', () => this.toggleCamAutoLook());
      document.getElementById('btn-map').addEventListener('click', () => this.ui.toggleMap());
      document.getElementById('btn-photo').addEventListener('click', () => this.togglePhotoMode(true));
      document.getElementById('btn-exit-photo').addEventListener('click', () => this.togglePhotoMode(false));

      document.getElementById('btn-capture-shot').addEventListener('click', () => {
        this.renderer.render(this.scene, this.camera);
        const link = document.createElement('a');
        link.download = `lumi-pastel-sky-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
      });

      document.getElementById('btn-audio').addEventListener('click', (e) => {
        const on = window.PastelAudio.toggle();
        e.currentTarget.innerHTML = `<i data-lucide="${on ? 'volume-2' : 'volume-x'}"></i>`;
        if (window.lucide) window.lucide.createIcons();
      });

      document.getElementById('btn-help').addEventListener('click', () => this.toggleHelp(true));
      document.getElementById('btn-close-help').addEventListener('click', () => this.toggleHelp(false));

      document.getElementById('btn-continue-freeplay').addEventListener('click', () => {
        this.ui.closeDialogue();
        this.ui.showToast('BAY LƯỢN TỰ DO', 'Đôi Cánh Bướm Vĩnh Cửu', 'Bạn có thể vỗ cánh không giới hạn khắp bầu trời pastel.', 4000);
      });
    }

    setupTouchControls() {
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (!isTouch) return;

      const touchWrap = document.getElementById('touch-controls');
      const zone = document.getElementById('joystick-zone');
      const knob = document.getElementById('joystick-knob');

      this.enableTouchUI = () => touchWrap.classList.remove('hidden');

      let activeId = null;
      const updateKnob = (clientX, clientY) => {
        const rect = zone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const maxR = rect.width * 0.38;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.joyVec.x = dx / maxR;
        this.joyVec.y = dy / maxR;
      };

      zone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        activeId = t.identifier;
        updateKnob(t.clientX, t.clientY);
      }, { passive: false });

      zone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) {
          if (t.identifier === activeId) updateKnob(t.clientX, t.clientY);
        }
      }, { passive: false });

      const resetJoy = () => {
        activeId = null;
        knob.style.transform = 'translate(-50%, -50%)';
        this.joyVec.x = 0;
        this.joyVec.y = 0;
      };
      zone.addEventListener('touchend', resetJoy);
      zone.addEventListener('touchcancel', resetJoy);

      const btnJump = document.getElementById('touch-jump');
      btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.spaceHeld = true;
        this.triggerJumpOrFlap();
      }, { passive: false });
      btnJump.addEventListener('touchend', () => {
        this.spaceHeld = false;
        this.player.gliding = false;
      });

      document.getElementById('touch-dash').addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.triggerDash();
      }, { passive: false });

      document.getElementById('touch-interact').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.restingBench) this.exitBenchRest();
        else this.triggerInteract();
      }, { passive: false });
    }

    startGame() {
      if (this.started) return;
      this.started = true;
      window.PastelAudio.init();
      window.PastelAudio.playFeatherGet();

      document.getElementById('title-screen').classList.remove('active');
      document.getElementById('hud-top').classList.remove('hud-hidden');
      document.getElementById('quest-panel').classList.remove('hud-hidden');
      document.getElementById('feather-hud').classList.remove('hud-hidden');
      if (this.enableTouchUI) this.enableTouchUI();

      this.ui.showToast('CHÀO MỪNG TỚI QUẦN ĐẢO MÂY', 'Đảo Mầm Mơ', 'Hãy gặp Bác Cú Mơ bên Đài Cổ Vật ngay phía trước.', 4200);
    }

    handleCycleMood() {
      const m = this.world.cycleSkyMood();
      const btn = document.getElementById('btn-mood');
      btn.innerHTML = `<i data-lucide="${m.lucideIcon || 'sun'}"></i><span id="mood-label">${m.name}</span>`;
      if (window.lucide) window.lucide.createIcons();
      this.ui.showToast('SẮC TRỜI PASTEL', m.name, m.toast, 2500);
    }

    toggleCamAutoLook() {
      this.autoMouseLook = !this.autoMouseLook;
      const btn = document.getElementById('btn-cam-lock');
      const label = document.getElementById('cam-lock-label');
      if (label) {
        label.textContent = this.autoMouseLook ? 'Tự xoay: Bật' : 'Kéo chuột';
      }
      btn.classList.toggle('active-toggle', this.autoMouseLook);
    }

    toggleHelp(force) {
      const el = document.getElementById('help-modal');
      const open = force !== undefined ? force : el.classList.contains('hidden');
      el.classList.toggle('hidden', !open);
    }

    togglePhotoMode(force) {
      this.photoMode = force !== undefined ? force : !this.photoMode;
      document.getElementById('photo-overlay').classList.toggle('hidden', !this.photoMode);
      document.getElementById('hud-top').classList.toggle('hud-hidden', this.photoMode);
      document.getElementById('quest-panel').classList.toggle('hud-hidden', this.photoMode);
      document.getElementById('feather-hud').classList.toggle('hud-hidden', this.photoMode);
      if (this.photoMode) {
        document.getElementById('interact-prompt').classList.add('hidden');
      }
    }

    triggerJumpOrFlap() {
      const p = this.player;
      if (p.rescuing) return;

      // Crisp Ground or Coyote Jump (free, doesn't spend a Golden Feather!)
      if (p.grounded || p.coyoteTimer > 0) {
        p.grounded = false;
        p.coyoteTimer = 0;
        p.vel.y = 11.2;
        this.lumi.triggerSquash(-0.65);
        this.lumi.triggerFlap();
        window.PastelAudio.playJump();
        this.entities.spawnBurst(p.pos.x, p.pos.y + 0.15, p.pos.z, '#fff5fb', 7);
        return;
      }

      // Airborne Butterfly Wing Flap!
      if (this.infiniteFeathers || this.feathersLeft > 0) {
        const usedIdx = this.maxFeathers - this.feathersLeft + 1;
        if (!this.infiniteFeathers) {
          this.feathersLeft--;
          this.ui.renderFeatherPips();
        }
        p.vel.y = 11.4;
        p.vel.x += Math.sin(p.yaw) * 2.4;
        p.vel.z += Math.cos(p.yaw) * 2.4;
        this.lumi.triggerSquash(-0.55);
        this.lumi.triggerFlap();
        window.PastelAudio.playFlap(usedIdx);
        this.entities.spawnBurst(p.pos.x, p.pos.y + 0.5, p.pos.z, '#ffe082', 10);
      }
    }

    triggerDash() {
      const p = this.player;
      if (p.dashCooldown > 0 || p.rescuing) return;
      p.dashTimer = 0.25;
      p.dashCooldown = 0.72;
      window.PastelAudio.playDash();
      this.entities.spawnBurst(p.pos.x, p.pos.y + 0.7, p.pos.z, '#ffc6ff', 12);
    }

    enterBenchRest(bench) {
      this.restingBench = bench;
      this.player.vel.set(0, 0, 0);
      this.player.pos.set(bench.x, bench.y + 0.42, bench.z);
      this.player.yaw = Math.atan2(bench.lookAtX - bench.x, bench.lookAtZ - bench.z);
      document.getElementById('rest-banner').classList.remove('hidden');
      document.getElementById('interact-prompt').classList.add('hidden');
    }

    exitBenchRest() {
      if (!this.restingBench) return;
      this.player.pos.y = this.restingBench.y + 0.05;
      this.restingBench = null;
      document.getElementById('rest-banner').classList.add('hidden');
      window.PastelAudio.playJump();
    }

    triggerInteract() {
      if (!this.nearestInteractable) return;
      const target = this.nearestInteractable;

      if (target.kind === 'npc') {
        this.ui.openNPCDialogue(target.ref);
      } else if (target.kind === 'relic') {
        this.ui.onAwakenRelic(target.ref);
      } else if (target.kind === 'chime') {
        this.ui.onRingWindChime(target.ref);
      } else if (target.kind === 'bell') {
        this.ui.onRingGrandBell(target.ref);
      } else if (target.kind === 'bench') {
        this.enterBenchRest(target.ref);
      }
    }

    updatePlayer(dt) {
      const p = this.player;

      // Keyboard Camera Q / E rotation
      if (this.keys['KeyQ']) this.camYaw += dt * 1.85;
      if (this.keys['KeyE'] && !this.nearestInteractable && !this.ui.dialogueOpen) {
        this.camYaw -= dt * 1.85;
      }

      if (this.restingBench) {
        this.lumi.root.rotation.y = p.yaw;
        this.lumi.update(dt, this.elapsed, {
          pos: p.pos,
          groundY: this.restingBench.y,
          speed: 0,
          maxSpeed: 9,
          grounded: true,
          gliding: false,
          rescuing: false,
          turnRate: 0,
          dashTimer: 0
        });
        return;
      }

      // Pink Rescue Cloud gentle return arc
      if (p.rescuing && p.rescueTarget) {
        const tx = p.rescueTarget.x;
        const ty = p.rescueTarget.y + 1.4;
        const tz = p.rescueTarget.z;
        p.pos.x += (tx - p.pos.x) * Math.min(1, dt * 2.8);
        p.pos.y += (ty - p.pos.y) * Math.min(1, dt * 3.1);
        p.pos.z += (tz - p.pos.z) * Math.min(1, dt * 2.8);
        p.vel.set(0, 0, 0);

        if (Math.hypot(tx - p.pos.x, ty - p.pos.y, tz - p.pos.z) < 1.2) {
          p.rescuing = false;
          this.feathersLeft = this.maxFeathers;
          this.ui.renderFeatherPips();
        }
        this.lumi.update(dt, this.elapsed, {
          pos: p.pos,
          groundY: -999,
          speed: 4,
          maxSpeed: 9,
          grounded: false,
          gliding: true,
          rescuing: true,
          turnRate: 0,
          dashTimer: 0
        });
        return;
      }

      // Gather Movement Input (Disabled while talking or map open)
      let inX = this.joyVec.x;
      let inZ = this.joyVec.y;
      const modalBlocked = this.ui.dialogueOpen || !document.getElementById('map-modal').classList.contains('hidden');

      if (!modalBlocked && !this.photoMode) {
        if (this.keys['KeyW'] || this.keys['ArrowUp']) inZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) inZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) inX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) inX += 1;
      }

      const inLen = Math.hypot(inX, inZ);
      if (inLen > 1) {
        inX /= inLen;
        inZ /= inLen;
      }

      // Convert Input to World XZ relative to Camera Yaw
      // Forward (inZ = -1) -> (-sin(camYaw), -cos(camYaw))
      // Right   (inX = +1) -> (+cos(camYaw), -sin(camYaw))
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const moveWorldX = (-inZ) * (-sinY) + inX * cosY;
      const moveWorldZ = (-inZ) * (-cosY) + inX * (-sinY);
      const hasInput = Math.hypot(moveWorldX, moveWorldZ) > 0.05;

      // Dash Cooldowns
      if (p.dashCooldown > 0) p.dashCooldown -= dt;
      if (p.dashTimer > 0) p.dashTimer -= dt;

      // Gliding Detection
      p.gliding = !p.grounded && this.spaceHeld && p.vel.y <= 1.5;

      // Target Horizontal Speed
      const baseRunSpeed = 9.0;
      const glideSpeed = this.glideBuff ? 14.0 : 11.2;
      const topSpeed = p.dashTimer > 0 ? 16.0 : (p.gliding ? glideSpeed : baseRunSpeed);

      if (p.dashTimer > 0) {
        p.vel.x = Math.sin(p.yaw) * topSpeed;
        p.vel.z = Math.cos(p.yaw) * topSpeed;
        p.turnRate = 0;
      } else if (hasInput) {
        const targetYaw = Math.atan2(moveWorldX, moveWorldZ);
        let diff = targetYaw - p.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turnLerp = Math.min(1, dt * (p.gliding ? 5.5 : 12.0));
        p.yaw += diff * turnLerp;
        p.turnRate = diff;

        const accel = p.grounded ? 14.0 : 7.5;
        p.vel.x += (moveWorldX * topSpeed - p.vel.x) * Math.min(1, dt * accel);
        p.vel.z += (moveWorldZ * topSpeed - p.vel.z) * Math.min(1, dt * accel);

        // Gentle subtle camera follow when not manually dragging mouse
        if (!this.isDraggingCam && !this.autoMouseLook && Math.abs(inX) > 0.25) {
          this.camYaw -= inX * dt * 0.55;
        }
      } else {
        p.turnRate *= 0.85;
        const drag = p.grounded ? 12.0 : (p.gliding ? 1.8 : 3.2);
        p.vel.x += (0 - p.vel.x) * Math.min(1, dt * drag);
        p.vel.z += (0 - p.vel.z) * Math.min(1, dt * drag);
        // Glider maintains slight forward cruise even when relaxing fingers!
        if (p.gliding) {
          p.vel.x += Math.sin(p.yaw) * 4.2 * dt;
          p.vel.z += Math.cos(p.yaw) * 4.2 * dt;
        }
      }

      // Gravity & Glider Lift
      const gravity = p.gliding ? 6.8 : 25.5;
      p.vel.y -= gravity * dt;
      if (p.gliding && p.vel.y < -2.35) {
        p.vel.y += (-2.35 - p.vel.y) * Math.min(1, dt * 10);
      } else if (p.vel.y < -24) {
        p.vel.y = -24;
      }

      // Swirling Updraft Wind Streams Check
      for (let i = 0; i < this.world.updrafts.length; i++) {
        const u = this.world.updrafts[i];
        if (!u.active) continue;
        if (p.pos.y >= u.yBase - 1.5 && p.pos.y <= u.yTop) {
          const d2 = (p.pos.x - u.x) ** 2 + (p.pos.z - u.z) ** 2;
          if (d2 <= u.radius * u.radius) {
            const targetLift = p.gliding ? u.lift : u.lift * 0.68;
            p.vel.y += (targetLift - p.vel.y) * Math.min(1, dt * 6.5);
            p.grounded = false;
            if (this.feathersLeft < this.maxFeathers) {
              this.feathersLeft = this.maxFeathers;
              this.ui.renderFeatherPips();
            }
          }
        }
      }

      // Integrate Position
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.pos.z += p.vel.z * dt;

      // Resolve Horizontal Obstacles & Cliffs
      this.world.resolveHorizontalCollisions(p.pos, 0.48);

      // Check Bouncy Pink Clouds
      for (let i = 0; i < this.world.bouncyClouds.length; i++) {
        const bc = this.world.bouncyClouds[i];
        const d2 = (p.pos.x - bc.x) ** 2 + (p.pos.z - bc.z) ** 2;
        if (d2 <= bc.radius * bc.radius && p.vel.y <= 2.0 && Math.abs(p.pos.y - (bc.y + 0.45)) < 1.35) {
          p.pos.y = bc.y + 0.5;
          p.vel.y = bc.power;
          p.grounded = false;
          bc.squish = 1.0;
          this.feathersLeft = this.maxFeathers;
          this.ui.renderFeatherPips();
          this.lumi.triggerSquash(0.75);
          window.PastelAudio.playBounce();
          this.entities.spawnBurst(bc.x, bc.y + 0.6, bc.z, '#ffb3c6', 14);
        }
      }

      // Analytical Ground & Rainbow Bridge Floor Check
      const surfY = this.world.sampleGroundHeight(p.pos.x, p.pos.y, p.pos.z, 0.48);
      p.groundY = surfY;

      if (Number.isFinite(surfY) && p.vel.y <= 0.5 && p.pos.y <= surfY + 0.16 && p.pos.y >= surfY - 1.5) {
        if (!p.grounded && p.vel.y < -4.5) {
          this.lumi.triggerSquash(Math.min(0.7, Math.abs(p.vel.y) * 0.04));
          this.entities.spawnTrailPuff(p.pos.x, surfY + 0.1, p.pos.z);
        }
        if (p.grounded && surfY > p.pos.y + 0.08) {
          p.pos.y += (surfY - p.pos.y) * Math.min(1, dt * 22);
        } else {
          p.pos.y = surfY;
        }
        p.vel.y = 0;
        p.grounded = true;
        p.gliding = false;
        p.coyoteTimer = 0.15;

        if (this.feathersLeft < this.maxFeathers) {
          this.feathersLeft = this.maxFeathers;
          this.ui.renderFeatherPips();
        }
      } else {
        if (p.grounded) {
          p.grounded = false;
        }
        if (p.coyoteTimer > 0) p.coyoteTimer -= dt;
      }

      // Safety Pink Rescue Cloud if drifting below low clouds
      if (p.pos.y < -15.5 && !p.rescuing) {
        const safeIsl = this.world.getNearestVisitedIsland(p.pos.x, p.pos.z);
        p.rescuing = true;
        p.rescueTarget = safeIsl.spawn;
        window.PastelAudio.playRescueCloud();
        this.ui.showToast('MÂY HỒNG ĐÓN ĐỠ', 'Bay Lên Êm Ái', `Đám mây bông đang đưa Lumi trở lại ${safeIsl.name}.`, 3200);
      }

      // Cozy Footsteps & Wingtip Trails
      const horizSpeed = Math.hypot(p.vel.x, p.vel.z);
      if (p.grounded && horizSpeed > 2.2) {
        p.stepTimer -= dt;
        if (p.stepTimer <= 0) {
          p.stepTimer = 0.31;
          window.PastelAudio.playStep();
          if (Math.random() < 0.45) {
            this.entities.spawnTrailPuff(p.pos.x, p.pos.y + 0.08, p.pos.z);
          }
        }
      } else if (p.gliding || p.dashTimer > 0) {
        p.trailTimer -= dt;
        if (p.trailTimer <= 0) {
          p.trailTimer = 0.075;
          this.entities.spawnTrailPuff(p.pos.x, p.pos.y + 0.72, p.pos.z, p.dashTimer > 0 ? '#ffc6ff' : '#e8f8ff');
        }
      }

      // Update Lumi 3D Mesh
      this.lumi.root.rotation.y = p.yaw;
      this.lumi.update(dt, this.elapsed, {
        pos: p.pos,
        groundY: p.groundY,
        speed: horizSpeed,
        maxSpeed: baseRunSpeed,
        grounded: p.grounded,
        gliding: p.gliding,
        rescuing: p.rescuing,
        turnRate: p.turnRate,
        dashTimer: p.dashTimer
      });
    }

    checkPickupsAndInteractions() {
      const px = this.player.pos.x;
      const py = this.player.pos.y + 0.75;
      const pz = this.player.pos.z;

      // 1. Auto-collect Star Crystals
      for (let i = 0; i < this.entities.stars.length; i++) {
        const s = this.entities.stars[i];
        if (s.collected) continue;
        const d2 = (px - s.x) ** 2 + (py - s.y) ** 2 + (pz - s.z) ** 2;
        if (d2 < 2.25) {
          s.collected = true;
          s.group.visible = false;
          this.ui.starCount++;
          window.PastelAudio.playStarPickup();
          this.entities.spawnBurst(s.x, s.y, s.z, '#ffe082', 12);
          this.ui.refreshAllHUD();
        }
      }

      // 2. Auto-collect Quest Items (Sakura Blooms, Starry Honey, Prism Shards)
      for (let i = 0; i < this.entities.questItems.length; i++) {
        const q = this.entities.questItems[i];
        if (q.collected) continue;
        const d2 = (px - q.x) ** 2 + (py - q.y) ** 2 + (pz - q.z) ** 2;
        if (d2 < 2.6) {
          q.collected = true;
          q.group.visible = false;
          window.PastelAudio.playQuestItem();
          this.entities.spawnBurst(q.x, q.y, q.z, '#ff9ebb', 16);
          this.ui.onCollectQuestItem(q);
        }
      }

      // 3. Touch-harmonize Wind Chimes when brushing right past them!
      for (let i = 0; i < this.entities.windChimes.length; i++) {
        const c = this.entities.windChimes[i];
        if (!c.harmonized) {
          const d2 = (px - c.x) ** 2 + (this.player.pos.y - c.y) ** 2 + (pz - c.z) ** 2;
          if (d2 < 2.4) {
            this.ui.onRingWindChime(c);
          }
        }
      }

      // 4. Detect Current Sky Island & Trigger Discovery Toast!
      const isl = this.world.detectCurrentIsland(px, this.player.pos.y, pz);
      if (isl && isl.id !== this.currentIslandId) {
        this.currentIslandId = isl.id;
        this.ui.elIslandName.textContent = isl.name;
        if (!isl.visited) {
          isl.visited = true;
          window.PastelAudio.playQuestItem();
          this.ui.showToast('KHÁM PHÁ ĐẢO MỚI', isl.name, isl.subtitle, 4000);
        }
      }

      // 5. Scan Nearest E-Interactable
      if (this.ui.dialogueOpen || this.restingBench || this.photoMode) {
        this.nearestInteractable = null;
        document.getElementById('interact-prompt').classList.add('hidden');
        return;
      }

      let best = null;
      let bestDist = Infinity;

      const consider = (kind, ref, tx, ty, tz, maxR, label) => {
        const d = Math.hypot(px - tx, this.player.pos.y - ty, pz - tz);
        if (d <= maxR && d < bestDist) {
          bestDist = d;
          best = { kind, ref, label };
        }
      };

      this.entities.npcs.forEach(n => {
        consider('npc', n, n.x, n.y, n.z, 3.6, `Trò chuyện cùng ${n.name}`);
      });

      this.entities.relics.forEach(r => {
        if (!r.awakened) {
          consider('relic', r, r.x, r.y, r.z, 3.9, `Đánh thức ${r.name}`);
        }
      });

      this.entities.windChimes.forEach(c => {
        consider('chime', c, c.x, c.y, c.z, 3.5, 'Gõ Chuông Gió Pha Lê');
      });

      if (this.entities.grandBell) {
        const gb = this.entities.grandBell;
        consider('bell', gb, gb.x, gb.y, gb.z, 4.6, 'Ngân vang Đại Hồng Chung Ngân Hà');
      }

      this.world.benches.forEach(b => {
        consider('bench', b, b.x, b.y, b.z, 2.6, `Ngồi ngắm mây (${b.label})`);
      });

      this.nearestInteractable = best;
      const promptEl = document.getElementById('interact-prompt');
      if (best) {
        document.getElementById('interact-label').textContent = best.label;
        promptEl.classList.remove('hidden');
      } else {
        promptEl.classList.add('hidden');
      }
    }

    updateCamera(dt) {
      // Title Screen Panoramic Orbit!
      if (!this.started) {
        const angle = this.elapsed * 0.14;
        const cx = Math.sin(angle) * 46;
        const cz = Math.cos(angle) * 46 - 12;
        this.camera.position.set(cx, 20 + Math.sin(angle * 1.5) * 3, cz);
        this.camera.lookAt(0, 5, -22);
        return;
      }

      // Scenic Bench Panoramic View
      if (this.restingBench) {
        const b = this.restingBench;
        const backAng = Math.atan2(b.x - b.lookAtX, b.z - b.lookAtZ);
        const desiredPos = new THREE.Vector3(
          b.x + Math.sin(backAng + 0.35) * 6.2,
          b.y + 3.0,
          b.z + Math.cos(backAng + 0.35) * 6.2
        );
        this.camera.position.lerp(desiredPos, Math.min(1, dt * 3.5));
        const lookAtVec = new THREE.Vector3(
          (b.x + b.lookAtX) * 0.5,
          b.y + 2.2,
          (b.z + b.lookAtZ) * 0.5
        );
        this.camLookTarget.lerp(lookAtVec, Math.min(1, dt * 3.5));
        this.camera.lookAt(this.camLookTarget);
        return;
      }

      // Silky Spring-Arm Third-Person Follow Camera
      const focus = new THREE.Vector3(
        this.player.pos.x,
        this.player.pos.y + 1.45,
        this.player.pos.z
      );
      this.camLookTarget.lerp(focus, Math.min(1, dt * 12.0));

      const horizDist = Math.cos(this.camPitch) * this.camDist;
      const vertDist = Math.sin(this.camPitch) * this.camDist;

      const camX = this.camLookTarget.x + Math.sin(this.camYaw) * horizDist;
      const camZ = this.camLookTarget.z + Math.cos(this.camYaw) * horizDist;
      let camY = this.camLookTarget.y + vertDist;

      // Prevent camera from dipping inside island grass surfaces
      const camGround = this.world.sampleGroundHeight(camX, camY, camZ, 0.2);
      if (Number.isFinite(camGround) && camY < camGround + 1.1) {
        camY = camGround + 1.1;
      }

      this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), Math.min(1, dt * 14.0));
      this.camera.lookAt(this.camLookTarget);
    }

    animate() {
      requestAnimationFrame(this.animate);
      const dt = Math.min(0.05, this.clock.getDelta());
      this.elapsed += dt;

      this.world.update(dt, this.elapsed);

      if (this.started) {
        this.updatePlayer(dt);
        this.checkPickupsAndInteractions();
      } else {
        // Keep Lumi gently breathing on the hub meadow during Title Screen!
        this.lumi.root.rotation.y = this.player.yaw;
        this.lumi.update(dt, this.elapsed, {
          pos: this.player.pos,
          groundY: 0,
          speed: 0,
          maxSpeed: 9,
          grounded: true,
          gliding: false,
          rescuing: false,
          turnRate: 0,
          dashTimer: 0
        });
      }

      this.entities.update(dt, this.elapsed, this.player.pos);
      this.updateCamera(dt);

      // Live refresh map if open
      if (!document.getElementById('map-modal').classList.contains('hidden')) {
        this.ui.renderMapCanvas();
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const syncIcons = () => {
      if (window.lucide) {
        window.lucide.createIcons();
      } else {
        setTimeout(syncIcons, 120);
      }
    };
    syncIcons();

    const boot = () => {
      if (window.THREE) {
        window.lumiGame = new PastelSkyAdventureGame();
      } else {
        setTimeout(boot, 80);
      }
    };
    boot();
  });
})();
