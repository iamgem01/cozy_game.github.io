(function () {
  'use strict';

  class PastelAudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.delayNode = null;
      this.enabled = true;
      this.started = false;
      this.starCombo = 0;
      this.lastStarTime = 0;
      this.musicTimer = null;
      this.chordStep = 0;

      // F Lydian / Major 9th cozy music-box palette (Hz)
      this.scale = [
        349.23, // F4
        392.00, // G4
        440.00, // A4
        523.25, // C5
        587.33, // D5
        659.25, // E5
        698.46, // F5
        783.99, // G5
        880.00, // A5
        1046.50 // C6
      ];

      this.chords = [
        [174.61, 261.63, 349.23, 440.00], // Fmaj
        [196.00, 293.66, 392.00, 493.88], // G6/add9 feel
        [146.83, 220.00, 349.23, 440.00], // Dm7
        [130.81, 196.00, 329.63, 392.00]  // Cmaj7
      ];
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      comp.connect(this.ctx.destination);

      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.75 : 0.0;
      this.master.connect(comp);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.28;
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.master);

      // Gentle dreamy echo for kalimba & chimes
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.34;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.28;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2200;

      this.delayNode.connect(filter);
      filter.connect(fb);
      fb.connect(this.delayNode);
      filter.connect(this.master);

      this.startMusicLoop();
      this.started = true;
    }

    toggle() {
      this.init();
      this.enabled = !this.enabled;
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this.enabled ? 0.75 : 0.0, this.ctx.currentTime, 0.08);
      }
      return this.enabled;
    }

    playTone(freq, opts = {}) {
      if (!this.ctx || !this.enabled) return;
      const now = this.ctx.currentTime + (opts.delay || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (opts.endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), now + (opts.dur || 0.25));
      }

      const peak = opts.vol ?? 0.16;
      const atk = opts.attack ?? 0.012;
      const dur = opts.dur ?? 0.35;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + atk);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(opts.bus === 'music' ? this.musicGain : this.sfxGain);
      if (opts.echo && this.delayNode) {
        const echoSend = this.ctx.createGain();
        echoSend.gain.value = opts.echo;
        gain.connect(echoSend);
        echoSend.connect(this.delayNode);
      }

      osc.start(now);
      osc.stop(now + dur + 0.03);
    }

    startMusicLoop() {
      if (this.musicTimer) return;
      let beat = 0;

      const tick = () => {
        if (this.ctx && this.enabled && this.ctx.state === 'running') {
          // Warm breathy pad every 8 beats
          if (beat % 8 === 0) {
            const chord = this.chords[this.chordStep % this.chords.length];
            this.chordStep++;
            chord.forEach((f, idx) => {
              this.playTone(f, {
                type: idx === 0 ? 'triangle' : 'sine',
                vol: idx === 0 ? 0.065 : 0.045,
                attack: 0.9,
                dur: 4.8,
                bus: 'music',
                echo: 0.18
              });
            });
          }

          // Cozy music-box kalimba notes
          if (Math.random() < 0.72) {
            const idx = Math.floor(Math.random() * this.scale.length);
            const note = this.scale[idx];
            this.playTone(note, {
              type: 'sine',
              vol: 0.095,
              attack: 0.008,
              dur: 0.85,
              bus: 'music',
              echo: 0.35
            });
            // Subtle octave harmonic tine
            this.playTone(note * 2, {
              type: 'sine',
              vol: 0.022,
              attack: 0.004,
              dur: 0.28,
              bus: 'music'
            });
          }
          beat++;
        }
        this.musicTimer = setTimeout(tick, 620);
      };
      tick();
    }

    playStep() {
      this.playTone(170 + Math.random() * 45, {
        type: 'triangle',
        endFreq: 95,
        vol: 0.045,
        attack: 0.004,
        dur: 0.065
      });
    }

    playJump() {
      this.playTone(310, {
        type: 'sine',
        endFreq: 540,
        vol: 0.13,
        attack: 0.008,
        dur: 0.19,
        echo: 0.12
      });
    }

    playFlap(flapIndex = 1) {
      const base = 370 + Math.min(flapIndex, 7) * 48;
      this.playTone(base, {
        type: 'sine',
        endFreq: base * 1.42,
        vol: 0.14,
        attack: 0.01,
        dur: 0.23,
        echo: 0.2
      });
      this.playTone(base * 1.5, {
        type: 'triangle',
        vol: 0.05,
        attack: 0.01,
        dur: 0.16
      });
    }

    playDash() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => {
        this.playTone(n, {
          type: 'sine',
          vol: 0.08,
          attack: 0.005,
          dur: 0.18,
          delay: i * 0.032,
          echo: 0.22
        });
      });
    }

    playBounce() {
      this.playTone(230, {
        type: 'sine',
        endFreq: 660,
        vol: 0.18,
        attack: 0.008,
        dur: 0.34,
        echo: 0.25
      });
      this.playTone(460, {
        type: 'triangle',
        endFreq: 920,
        vol: 0.07,
        attack: 0.01,
        dur: 0.25,
        delay: 0.04
      });
    }

    playStarPickup() {
      if (!this.ctx) return;
      const now = performance.now();
      if (now - this.lastStarTime < 2800) {
        this.starCombo = (this.starCombo + 1) % this.scale.length;
      } else {
        this.starCombo = 3; // Start at C5
      }
      this.lastStarTime = now;

      const f = this.scale[this.starCombo];
      this.playTone(f, {
        type: 'sine',
        vol: 0.16,
        attack: 0.005,
        dur: 0.45,
        echo: 0.32
      });
      this.playTone(f * 1.5, {
        type: 'sine',
        vol: 0.065,
        attack: 0.005,
        dur: 0.32,
        delay: 0.045,
        echo: 0.25
      });
    }

    playQuestItem() {
      [587.33, 783.99, 1046.5].forEach((f, i) => {
        this.playTone(f, {
          type: 'sine',
          vol: 0.14,
          attack: 0.006,
          dur: 0.45,
          delay: i * 0.075,
          echo: 0.3
        });
      });
    }

    playChimeNote(index = 0) {
      const notes = [698.46, 880.00, 1046.50, 1318.51];
      const f = notes[index % notes.length];
      this.playTone(f, {
        type: 'sine',
        vol: 0.19,
        attack: 0.004,
        dur: 1.25,
        echo: 0.45
      });
      this.playTone(f * 2, {
        type: 'sine',
        vol: 0.05,
        attack: 0.003,
        dur: 0.65,
        echo: 0.3
      });
    }

    playFeatherGet() {
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      fanfare.forEach((f, i) => {
        this.playTone(f, {
          type: 'sine',
          vol: 0.16,
          attack: 0.01,
          dur: i === fanfare.length - 1 ? 1.1 : 0.38,
          delay: i * 0.085,
          echo: 0.38
        });
      });
    }

    playRelicAwaken() {
      const arp = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99, 1046.50];
      arp.forEach((f, i) => {
        this.playTone(f, {
          type: i < 2 ? 'triangle' : 'sine',
          vol: 0.15,
          attack: 0.02,
          dur: 1.45,
          delay: i * 0.09,
          echo: 0.42
        });
      });
    }

    playGrandBell() {
      const partials = [261.63, 523.25, 659.25, 783.99, 1046.50, 1567.98];
      partials.forEach((f, i) => {
        this.playTone(f, {
          type: i === 0 ? 'triangle' : 'sine',
          vol: i === 0 ? 0.22 : 0.11,
          attack: 0.015,
          dur: 2.6 - i * 0.2,
          delay: i * 0.05,
          echo: 0.5
        });
      });
    }

    playNpcBlip(pitchBase = 480) {
      const jitter = pitchBase * (0.92 + Math.random() * 0.18);
      this.playTone(jitter, {
        type: 'sine',
        endFreq: jitter * 1.12,
        vol: 0.065,
        attack: 0.004,
        dur: 0.065
      });
    }

    playRescueCloud() {
      [392, 523.25, 659.25].forEach((f, i) => {
        this.playTone(f, {
          type: 'sine',
          vol: 0.12,
          attack: 0.02,
          dur: 0.5,
          delay: i * 0.08,
          echo: 0.3
        });
      });
    }
  }

  window.PastelAudio = new PastelAudioEngine();
})();
