(function () {
  'use strict';

  class QuestAndUIManager {
    constructor(game) {
      this.game = game;

      // Progression State
      this.starCount = 0;
      this.totalStars = game.entities.stars.length;
      this.relicsAwakened = 0;
      this.totalRelics = game.entities.relics.length;

      this.counts = {
        sakura_bloom: 0,
        honey_drop: 0,
        prism_shard: 0,
        wind_chime: 0
      };
      this.totals = {
        sakura_bloom: 5,
        honey_drop: 5,
        prism_shard: 3,
        wind_chime: 3
      };

      // Quest Flags
      this.quests = {
        owlBlessingDone: false,
        bunnyStarted: false,
        bunnyDone: false,
        frogStarted: false,
        frogDone: false,
        foxStarted: false,
        foxDone: false,
        turtleStarted: false,
        turtleDone: false,
        bellRung: false
      };

      this.dialogueOpen = false;
      this.typingTimer = null;
      this.toastTimeout = null;
      this.questCollapsed = false;

      this.cacheDOM();
      this.bindStaticUI();
      this.refreshAllHUD();
      this.refreshNPCMarkers();
    }

    cacheDOM() {
      this.elStars = document.getElementById('hud-stars');
      this.elRelics = document.getElementById('hud-relics');
      this.elFeatherCount = document.getElementById('hud-feathers-count');
      this.elIslandName = document.getElementById('hud-island-name');
      this.elFeatherIcons = document.getElementById('feather-icons');
      this.elBuffBadge = document.getElementById('buff-badge');
      this.elQuestList = document.getElementById('quest-list');
      this.elQuestBody = document.getElementById('quest-body');
      this.elBtnToggleQuest = document.getElementById('btn-toggle-quest');

      this.elToast = document.getElementById('discovery-toast');
      this.elToastSub = document.getElementById('toast-sub');
      this.elToastTitle = document.getElementById('toast-title');
      this.elToastDesc = document.getElementById('toast-desc');

      this.elDialogue = document.getElementById('dialogue-box');
      this.elNpcAvatar = document.getElementById('npc-avatar');
      this.elNpcName = document.getElementById('npc-name');
      this.elNpcRole = document.getElementById('npc-role');
      this.elDialogueText = document.getElementById('dialogue-text');
      this.elDialogueChoices = document.getElementById('dialogue-choices');

      this.elMapModal = document.getElementById('map-modal');
      this.elMapCanvas = document.getElementById('map-canvas');
      this.elMapTeleportBar = document.getElementById('map-teleport-bar');
    }

    bindStaticUI() {
      document.getElementById('quest-header').addEventListener('click', () => {
        this.toggleQuestCollapse();
      });

      document.getElementById('btn-close-map').addEventListener('click', () => {
        this.toggleMap(false);
      });

      // Click on Map Canvas to teleport to visited island
      this.elMapCanvas.addEventListener('click', (e) => {
        const rect = this.elMapCanvas.getBoundingClientRect();
        const scaleX = this.elMapCanvas.width / rect.width;
        const scaleY = this.elMapCanvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        for (const isl of this.game.world.islands) {
          const pt = this.worldToMap(isl.center.x, isl.center.z);
          if (Math.hypot(mx - pt.x, my - pt.y) <= 34) {
            if (isl.visited) {
              this.teleportToIsland(isl);
            } else {
              this.showToast('CHƯA KHÁM PHÁ', isl.name, 'Hãy bay lượn hoặc mở Cầu Cầu Vồng để ghé thăm hòn đảo này lần đầu.');
            }
            break;
          }
        }
      });
    }

    toggleQuestCollapse() {
      this.questCollapsed = !this.questCollapsed;
      this.elQuestBody.classList.toggle('hidden', this.questCollapsed);
      this.elBtnToggleQuest.textContent = this.questCollapsed ? '+' : '−';
    }

    showToast(sub, title, desc, duration = 3600) {
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.elToastSub.textContent = sub;
      this.elToastTitle.textContent = title;
      this.elToastDesc.textContent = desc;
      this.elToast.classList.remove('hidden');
      this.elToast.style.animation = 'none';
      void this.elToast.offsetWidth;
      this.elToast.style.animation = '';

      this.toastTimeout = setTimeout(() => {
        this.elToast.classList.add('hidden');
      }, duration);
    }

    refreshAllHUD() {
      this.elStars.textContent = `${this.starCount} / ${this.totalStars}`;
      this.elRelics.textContent = `${this.relicsAwakened} / ${this.totalRelics}`;
      this.elFeatherCount.textContent = this.game.infiniteFeathers ? '∞' : String(this.game.maxFeathers);
      this.elBuffBadge.classList.toggle('hidden', !this.game.glideBuff);
      this.renderFeatherPips();
      this.renderQuestJournal();
    }

    renderFeatherPips() {
      const maxF = this.game.maxFeathers;
      const curF = this.game.feathersLeft;
      const inf = this.game.infiniteFeathers;

      this.elFeatherIcons.innerHTML = '';
      const count = inf ? Math.max(5, maxF) : maxF;
      for (let i = 0; i < count; i++) {
        const span = document.createElement('span');
        span.className = 'feather-pip' + (inf ? ' infinite' : (i >= curF ? ' spent' : ''));
        this.elFeatherIcons.appendChild(span);
      }
    }

    renderQuestJournal() {
      const items = [];

      items.push({
        done: this.relicsAwakened >= this.totalRelics,
        title: `Đánh thức Cổ Vật Ánh Sao (${this.relicsAwakened}/${this.totalRelics})`,
        desc: this.relicsAwakened >= this.totalRelics
          ? 'Tất cả Cầu Cầu Vồng tới Đỉnh Thiên Hà đã rộng mở.'
          : 'Khám phá các hòn đảo và nhấn [E] tại Đài Cổ Vật để dệt Cầu Cầu Vồng.'
      });

      if (!this.quests.owlBlessingDone) {
        items.push({
          done: false,
          title: 'Gặp Bác Cú Mơ tại Đảo Mầm Mơ',
          desc: 'Trò chuyện bên Đài Ánh Sao trung tâm để nhận lời chúc đầu tiên.'
        });
      }

      if (this.quests.bunnyStarted || this.counts.sakura_bloom > 0) {
        items.push({
          done: this.quests.bunnyDone,
          title: `Cánh Hoa Cho Thỏ Mochi (${this.counts.sakura_bloom}/${this.totals.sakura_bloom})`,
          desc: this.quests.bunnyDone
            ? 'Cây Anh Đào Cổ Thụ đã bung nở rực rỡ.'
            : 'Thu thập Đóa Anh Đào Phát Sáng trên Đảo Hoa Anh Đào rồi báo cho Bé Mochi.'
        });
      }

      if (this.quests.foxStarted || this.counts.honey_drop > 0) {
        items.push({
          done: this.quests.foxDone,
          title: `Mật Sao Cối Xay Gió (${this.counts.honey_drop}/${this.totals.honey_drop})`,
          desc: this.quests.foxDone
            ? 'Đã thưởng thức Bánh Mây Mật Sao lượn êm.'
            : 'Nhặt Giọt Mật Sao quanh Đảo Bánh Mây Vàng giúp Tiểu Hồ Bơ.'
        });
      }

      if (this.quests.frogStarted || this.counts.wind_chime > 0) {
        items.push({
          done: this.quests.frogDone,
          title: `Khúc Ca Chuông Pha Lê (${this.counts.wind_chime}/${this.totals.wind_chime})`,
          desc: this.quests.frogDone
            ? 'Giai điệu chuông gió đã ngân vang êm đềm.'
            : 'Gõ 3 Chuông Gió Pha Lê trên Đảo Pha Lê Tím rồi kể cho Nhạc Sĩ Ếch Cốm.'
        });
      }

      if (this.quests.turtleStarted || this.counts.prism_shard > 0) {
        items.push({
          done: this.quests.turtleDone,
          title: `Thấu Kính Tinh Vân (${this.counts.prism_shard}/${this.totals.prism_shard})`,
          desc: this.quests.turtleDone
            ? 'Kính viễn vọng của Cụ Rùa đã hướng về dải ngân hà.'
            : 'Tìm 3 Mảnh Tinh Thạch trên mỏm đá Đảo Pha Lê Tím giúp Cụ Rùa.'
        });
      }

      if (this.relicsAwakened >= 1 || this.quests.bellRung) {
        items.push({
          done: this.quests.bellRung,
          title: 'Ngân Vang Đại Hồng Chung Ngân Hà',
          desc: this.quests.bellRung
            ? 'Cực Quang Mây Hồng và Đôi Cánh Vĩnh Cửu đã thức tỉnh.'
            : 'Bay lên Đỉnh Thiên Hà Mộng Mơ phía Bắc và rung Đại Hồng Chung.'
        });
      }

      this.elQuestList.innerHTML = items.map(it => `
        <li class="quest-item ${it.done ? 'done' : ''}">
          <strong>${it.title}</strong>
          <span>${it.desc}</span>
        </li>
      `).join('');
    }

    refreshNPCMarkers() {
      const ents = this.game.entities;
      ents.npcs.forEach(npc => {
        let show = true;
        let hex = '#ffe082';

        if (npc.id === 'npc_owl') {
          show = !this.quests.owlBlessingDone;
        } else if (npc.id === 'npc_bunny') {
          if (this.quests.bunnyDone) show = false;
          else if (this.counts.sakura_bloom >= this.totals.sakura_bloom) hex = '#76e5c2';
          else if (this.quests.bunnyStarted) hex = '#ffb3c6';
        } else if (npc.id === 'npc_frog') {
          if (this.quests.frogDone) show = false;
          else if (this.counts.wind_chime >= this.totals.wind_chime) hex = '#76e5c2';
          else if (this.quests.frogStarted) hex = '#a8e6cf';
        } else if (npc.id === 'npc_fox') {
          if (this.quests.foxDone) show = false;
          else if (this.counts.honey_drop >= this.totals.honey_drop) hex = '#76e5c2';
          else if (this.quests.foxStarted) hex = '#ffd166';
        } else if (npc.id === 'npc_turtle') {
          if (this.quests.turtleDone) show = false;
          else if (this.counts.prism_shard >= this.totals.prism_shard) hex = '#76e5c2';
          else if (this.quests.turtleStarted) hex = '#b197fc';
        } else if (npc.id === 'npc_spirit') {
          show = !this.quests.bellRung;
          hex = '#9bf6ff';
        }

        npc.marker.visible = show;
        if (show) {
          npc.marker.material.color.set(hex);
          npc.marker.material.emissive.set(hex);
        }
      });
    }

    grantGoldenFeather(reasonText) {
      this.game.maxFeathers = Math.min(8, this.game.maxFeathers + 1);
      this.game.feathersLeft = this.game.maxFeathers;
      window.PastelAudio.playFeatherGet();
      this.game.entities.spawnBurst(
        this.game.player.pos.x,
        this.game.player.pos.y + 1.5,
        this.game.player.pos.z,
        '#ffe082',
        20
      );
      this.refreshAllHUD();
      this.showToast('NĂNG LƯỢNG CÁNH BƯỚM', `Đôi Cánh Cấp ${this.game.maxFeathers}`, reasonText, 4200);
    }

    onCollectQuestItem(item) {
      this.counts[item.type] = (this.counts[item.type] || 0) + 1;
      const cur = this.counts[item.type];
      const tot = this.totals[item.type];

      const labels = {
        sakura_bloom: ['Đóa Anh Đào Phát Sáng', 'Hãy mang về tặng Bé Thỏ Mochi trên Đảo Hoa Anh Đào.'],
        honey_drop: ['Giọt Mật Sao Thơm Lừng', 'Tiểu Hồ Bơ ở Cối Xay Gió đang chờ mẻ mật ngọt ngào này.'],
        prism_shard: ['Mảnh Tinh Thạch Tím', 'Cụ Rùa Tinh Vân có thể lắp mảnh này vào kính viễn vọng.']
      };
      const [title, finishHint] = labels[item.type] || ['Vật phẩm nhiệm vụ', ''];
      this.showToast(
        'VẬT PHẨM SƯU TẦM',
        `${title} (${cur}/${tot})`,
        cur >= tot ? finishHint : 'Tiếp tục dạo quanh hòn đảo để tìm những mảnh còn lại.',
        3000
      );
      this.refreshAllHUD();
      this.refreshNPCMarkers();
    }

    onRingWindChime(chime) {
      window.PastelAudio.playChimeNote(chime.index);
      chime.sway = 1.0;
      this.game.entities.spawnBurst(chime.x, chime.y + 1.9, chime.z, '#9bf6ff', 14);

      if (!chime.harmonized) {
        chime.harmonized = true;
        chime.chimeMat.color.set('#ffe082');
        chime.chimeMat.emissive.set('#ffd166');
        chime.chimeMat.emissiveIntensity = 0.65;
        this.counts.wind_chime++;

        const cur = this.counts.wind_chime;
        const tot = this.totals.wind_chime;
        this.showToast(
          'GIAI ĐIỆU PHA LÊ',
          `Chuông Gió Ngân Vang (${cur}/${tot})`,
          cur >= tot
            ? 'Cả 3 Chuông Gió đã hòa âm. Hãy quay lại kể cho Nhạc Sĩ Ếch Cốm bên Hồ Gương.'
            : 'Tiếng chuông trong trẻo lan tỏa khắp tầng mây tím.',
          3400
        );
        this.refreshAllHUD();
        this.refreshNPCMarkers();
      }
    }

    onAwakenRelic(relic) {
      if (relic.awakened) return;
      relic.awakened = true;
      relic.beam.visible = true;
      relic.coreMat.emissiveIntensity = 0.9;
      this.relicsAwakened++;

      if (relic.unlockBridges) {
        relic.unlockBridges.forEach(bid => this.game.world.setBridgeActive(bid, true));
      }
      if (relic.unlockUpdraft) {
        this.game.world.setUpdraftActive(relic.unlockUpdraft, true);
      }

      window.PastelAudio.playRelicAwaken();
      this.game.entities.spawnBurst(relic.x, relic.y + 2.0, relic.z, relic.color, 26);
      this.showToast('CỔ VẬT THỨC TỈNH', `${relic.name} (${this.relicsAwakened}/4)`, relic.desc, 4400);
      this.refreshAllHUD();
    }

    onRingGrandBell(bell) {
      window.PastelAudio.playGrandBell();
      bell.swing = 1.0;
      this.game.entities.spawnBurst(bell.x, bell.y + 2.8, bell.z, '#ffe082', 36);
      this.game.world.activateAurora();

      if (!this.quests.bellRung) {
        this.quests.bellRung = true;
        bell.rung = true;
        this.game.infiniteFeathers = true;
        this.refreshAllHUD();
        this.refreshNPCMarkers();

        setTimeout(() => {
          this.openCelebrationModal();
        }, 1300);
      } else {
        this.showToast('ĐẠI HỒNG CHUNG NGÂN VANG', 'Khúc Hát Cực Quang', 'Những dải lụa ánh sáng pastel nhảy múa trên bầu trời.', 3400);
      }
    }

    openCelebrationModal() {
      const statsEl = document.getElementById('celebration-stats');
      statsEl.innerHTML = `
        <span class="chip">Tinh Thể Sao: ${this.starCount} / ${this.totalStars}</span>
        <span class="chip">Cổ Vật: ${this.relicsAwakened} / ${this.totalRelics}</span>
        <span class="chip">Đôi Cánh: Vô Hạn Ánh Sao</span>
      `;
      document.getElementById('celebration-modal').classList.remove('hidden');
      this.dialogueOpen = true;
    }

    // =========================================================================
    // NPC CONVERSATIONS (Clean Vietnamese Typography)
    // =========================================================================
    openNPCDialogue(npc) {
      this.dialogueOpen = true;
      this.elDialogue.classList.remove('hidden');
      this.elNpcAvatar.textContent = npc.avatar;
      this.elNpcAvatar.style.background = npc.bodyColor || '#ece4ff';
      this.elNpcName.textContent = npc.name;
      this.elNpcRole.textContent = npc.role;

      const script = this.buildNPCScript(npc);
      this.presentDialogueNode(npc, script);
    }

    buildNPCScript(npc) {
      if (npc.id === 'npc_owl') {
        if (!this.quests.owlBlessingDone) {
          return {
            text: 'Chào mừng tinh linh nhỏ Lumi đến với Quần Đảo Mây Hồng. Ngày xưa, 4 Cổ Vật Ánh Sao từng dệt những cây Cầu Cầu Vồng nối liền các tầng mây tới tận Đỉnh Thiên Hà. Ta gửi tặng cháu nguồn năng lượng gió đầu tiên—hãy nhấn [E] bên Đài Cổ Vật ngay cạnh ta để bắt đầu nhé.',
            choices: [
              {
                label: 'Cảm ơn Bác Cú Mơ',
                primary: true,
                action: () => {
                  this.quests.owlBlessingDone = true;
                  this.closeDialogue();
                  this.grantGoldenFeather('Món quà khởi hành từ Bác Cú Mơ giúp đôi cánh bướm của Lumi bay cao hơn.');
                  this.refreshNPCMarkers();
                }
              }
            ]
          };
        }
        return {
          text: this.relicsAwakened >= 4
            ? 'Tuyệt diệu lắm Lumi ơi. Cả 4 Cổ Vật Ánh Sao đều đã rực sáng. Cháu hãy bay lên Đỉnh Thiên Hà phía Bắc để ngân vang Đại Hồng Chung cùng Cá Voi Mây Hồng nhé.'
            : `Cháu đã đánh thức ${this.relicsAwakened}/4 Cổ Vật rồi. Nếu muốn nghỉ chân, cháu có thể ngồi lên những chiếc ghế gỗ ven đảo hoặc mở Bản Đồ [M] để di chuyển theo gió bất cứ lúc nào.`,
          choices: [{ label: 'Cháu nhớ rồi ạ', primary: true, action: () => this.closeDialogue() }]
        };
      }

      if (npc.id === 'npc_bunny') {
        if (this.quests.bunnyDone) {
          return {
            text: 'Nhờ những đóa hoa phát sáng Lumi mang về, Cây Anh Đào Cổ Thụ trên đồi thượng cứ tỏa hương dịu ngọt mãi thôi. Chúc Lumi sải cánh thật vui nhé.',
            choices: [{ label: 'Tạm biệt Bé Mochi', primary: true, action: () => this.closeDialogue() }]
          };
        }
        if (this.counts.sakura_bloom >= this.totals.sakura_bloom) {
          return {
            text: 'Lumi đã tìm đủ cả 5 Đóa Anh Đào Phát Sáng rồi ư? Nhìn chúng lấp lánh đẹp quá! Mochi gửi tặng Lumi nguồn sáng mùa xuân nhặt được dưới gốc cây cổ thụ nhé.',
            choices: [
              {
                label: 'Trao 5 Đóa Hoa & Nhận chúc phúc',
                primary: true,
                action: () => {
                  this.quests.bunnyStarted = true;
                  this.quests.bunnyDone = true;
                  this.closeDialogue();
                  this.grantGoldenFeather('Bé Thỏ Mochi trao tặng thêm sức mạnh cho đôi cánh bướm của bạn.');
                  this.refreshNPCMarkers();
                }
              }
            ]
          };
        }
        this.quests.bunnyStarted = true;
        this.refreshAllHUD();
        this.refreshNPCMarkers();
        return {
          text: `Chào người bạn mới. Cơn gió sớm nay vừa thổi bay 5 Đóa Anh Đào Phát Sáng quanh mặt hồ gương và sườn đồi mất rồi (${this.counts.sakura_bloom}/5). Lumi vừa bay dạo vừa nhặt giúp Mochi với nhé.`,
          choices: [{ label: 'Để mình tìm giúp Mochi', primary: true, action: () => this.closeDialogue() }]
        };
      }

      if (npc.id === 'npc_frog') {
        if (this.quests.frogDone) {
          return {
            text: 'Tiếng Chuông Gió Pha Lê từ tầng mây tím vọng xuống mặt hồ nghe êm như một bản dạ khúc vậy. Cảm ơn đôi cánh của Lumi nhiều lắm.',
            choices: [{ label: 'Nghe thật bình yên', primary: true, action: () => this.closeDialogue() }]
          };
        }
        if (this.counts.wind_chime >= this.totals.wind_chime) {
          return {
            text: 'Tuyệt vời quá! Mình nghe thấy cả 3 chiếc Chuông Gió Pha Lê ngân vang hòa quyện từ tận đây luôn. Xin gửi tặng người bạn yêu âm nhạc món quà gió mát này nhé.',
            choices: [
              {
                label: 'Nhận quà từ Ếch Cốm',
                primary: true,
                action: () => {
                  this.quests.frogStarted = true;
                  this.quests.frogDone = true;
                  this.closeDialogue();
                  this.grantGoldenFeather('Khúc hòa tấu Chuông Pha Lê tiếp thêm nhịp đập cho đôi cánh Lumi.');
                  this.refreshNPCMarkers();
                }
              }
            ]
          };
        }
        this.quests.frogStarted = true;
        this.refreshAllHUD();
        this.refreshNPCMarkers();
        return {
          text: `Mình đang sáng tác bản nhạc cho mặt hồ, nhưng còn thiếu tiếng ngân của 3 chiếc Chuông Gió Pha Lê trên Đảo Pha Lê Tím (${this.counts.wind_chime}/3). Khi nào bay lên đó, Lumi nhấn [E] gõ nhẹ vào 3 chiếc chuông giúp mình nhé.`,
          choices: [{ label: 'Mình sẽ gõ chuông giúp bạn', primary: true, action: () => this.closeDialogue() }]
        };
      }

      if (npc.id === 'npc_fox') {
        if (this.quests.foxDone) {
          return {
            text: 'Mẻ Bánh Mây Mật Sao vừa ra lò thơm lừng cả bầu trời. Nhờ thưởng thức bánh nóng nên đôi cánh bướm của Lumi lúc nào cũng lượn nhanh và nhẹ bẫng đó.',
            choices: [{ label: 'Cảm ơn Tiểu Hồ Bơ', primary: true, action: () => this.closeDialogue() }]
          };
        }
        if (this.counts.honey_drop >= this.totals.honey_drop) {
          return {
            text: 'Đủ cả 5 Giọt Mật Sao vàng óng rồi! Mời Lumi thưởng thức chiếc Bánh Mây nóng hổi giúp lượn nhanh hơn 25%, kèm thêm một tầng năng lượng cánh mới nhé.',
            choices: [
              {
                label: 'Thưởng thức Bánh Mây & Nhận quà',
                primary: true,
                action: () => {
                  this.quests.foxStarted = true;
                  this.quests.foxDone = true;
                  this.game.glideBuff = true;
                  this.closeDialogue();
                  this.grantGoldenFeather('Tăng cấp đôi cánh bướm và mở khóa hiệu ứng Bánh Mây lượn nhanh.');
                  this.refreshNPCMarkers();
                }
              }
            ]
          };
        }
        this.quests.foxStarted = true;
        this.refreshAllHUD();
        this.refreshNPCMarkers();
        return {
          text: `Chào nhà thám hiểm nhỏ. Lò bánh Cối Xay Gió của mình đang cần 5 Giọt Mật Sao (${this.counts.honey_drop}/5) đậu trên các bậc mây quanh đảo. Bạn nhảy lên Đám Mây Hồng để bật lên cao là lấy được ngay.`,
          choices: [{ label: 'Để mình đi gom mật sao', primary: true, action: () => this.closeDialogue() }]
        };
      }

      if (npc.id === 'npc_turtle') {
        if (this.quests.turtleDone) {
          return {
            text: 'Nhìn qua thấu kính tinh thạch mới lắp, lão thấy Tinh Linh Cá Voi Mây đang bơi lượn quanh Đỉnh Thiên Hà chờ đón cháu đó, Lumi à.',
            choices: [{ label: 'Cháu sẽ bay lên đỉnh mây ngay', primary: true, action: () => this.closeDialogue() }]
          };
        }
        if (this.counts.prism_shard >= this.totals.prism_shard) {
          return {
            text: 'Quý hóa quá, đủ 3 Mảnh Tinh Thạch Tím trong vắt rồi. Kính viễn vọng đã sáng rõ đường lên Đỉnh Thiên Hà. Hãy nhận lấy ánh sao chiêm tinh cổ xưa của lão nhé.',
            choices: [
              {
                label: 'Lắp Tinh Thạch & Nhận chúc phúc',
                primary: true,
                action: () => {
                  this.quests.turtleStarted = true;
                  this.quests.turtleDone = true;
                  this.closeDialogue();
                  this.grantGoldenFeather('Cụ Rùa Tinh Vân tiếp thêm sức mạnh chiêm tinh cho đôi cánh của bạn.');
                  this.refreshNPCMarkers();
                }
              }
            ]
          };
        }
        this.quests.turtleStarted = true;
        this.refreshAllHUD();
        this.refreshNPCMarkers();
        return {
          text: `Chậm mà chắc nha cháu nhỏ. Chiếc kính ngắm sao của lão bị gió cuốn lạc 3 Mảnh Tinh Thạch Tím (${this.counts.prism_shard}/3) trên các mỏm đá pha lê quanh đảo này. Cháu hãy dùng Cột Gió Xoáy gần đây để bay lên cao nhé.`,
          choices: [{ label: 'Vâng, cháu đi tìm giúp Cụ Rùa', primary: true, action: () => this.closeDialogue() }]
        };
      }

      return {
        text: this.quests.bellRung
          ? 'Ánh cực quang pastel trên bầu trời hôm nay rực rỡ biết bao. Đôi cánh bướm của Lumi giờ đã mang phép màu vĩnh cửu—hãy tự do sải cánh khắp muôn tầng mây nhé.'
          : 'Chào mừng Lumi đã đặt chân tới Đỉnh Thiên Hà Mộng Mơ. Đại Hồng Chung ngay dưới cổng vòm vàng đang chờ bạn ngân vang khúc ca hội tụ của mây trời.',
        choices: [{ label: 'Cảm ơn Tinh Linh Ngân Hà', primary: true, action: () => this.closeDialogue() }]
      };
    }

    presentDialogueNode(npc, node) {
      if (this.typingTimer) clearInterval(this.typingTimer);
      this.elDialogueText.textContent = '';
      this.elDialogueChoices.innerHTML = '';

      const fullText = node.text;
      let idx = 0;
      this.typingTimer = setInterval(() => {
        idx += 2;
        this.elDialogueText.textContent = fullText.slice(0, idx);
        if (idx % 6 === 0) {
          window.PastelAudio.playNpcBlip(npc.voicePitch || 480);
        }
        if (idx >= fullText.length) {
          clearInterval(this.typingTimer);
          this.typingTimer = null;
        }
      }, 18);

      (node.choices || []).forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn' + (ch.primary ? ' primary' : '');
        btn.textContent = ch.label;
        btn.addEventListener('click', () => ch.action());
        this.elDialogueChoices.appendChild(btn);
      });
    }

    closeDialogue() {
      if (this.typingTimer) {
        clearInterval(this.typingTimer);
        this.typingTimer = null;
      }
      this.elDialogue.classList.add('hidden');
      document.getElementById('celebration-modal').classList.add('hidden');
      this.dialogueOpen = false;
    }

    // =========================================================================
    // CLEAN MINIMALIST ARCHIPELAGO MAP & INSTANT WIND TELEPORT
    // =========================================================================
    worldToMap(wx, wz) {
      const x = 75 + ((wx + 85) / 175) * 530;
      const y = 52 + ((wz + 115) / 165) * 300;
      return { x, y };
    }

    toggleMap(forceState) {
      const open = forceState !== undefined ? forceState : this.elMapModal.classList.contains('hidden');
      this.elMapModal.classList.toggle('hidden', !open);
      if (open) {
        this.renderMapCanvas();
        this.renderTeleportChips();
      }
    }

    renderTeleportChips() {
      this.elMapTeleportBar.innerHTML = '';
      this.game.world.islands.forEach(isl => {
        const btn = document.createElement('button');
        btn.className = 'teleport-chip';
        btn.disabled = !isl.visited;
        btn.textContent = isl.visited ? isl.name : `${isl.name} (Chưa mở)`;
        btn.addEventListener('click', () => this.teleportToIsland(isl));
        this.elMapTeleportBar.appendChild(btn);
      });
    }

    teleportToIsland(isl) {
      this.toggleMap(false);
      const p = this.game.player;
      p.pos.set(isl.spawn.x, isl.spawn.y + 1.2, isl.spawn.z);
      p.vel.set(0, 0, 0);
      this.game.feathersLeft = this.game.maxFeathers;
      window.PastelAudio.playDash();
      this.game.entities.spawnBurst(p.pos.x, p.pos.y + 0.8, p.pos.z, '#9bf6ff', 18);
      this.showToast('DI CHUYỂN THEO GIÓ', isl.name, isl.subtitle, 3000);
      this.refreshAllHUD();
    }

    renderMapCanvas() {
      const ctx = this.elMapCanvas.getContext('2d');
      const W = this.elMapCanvas.width;
      const H = this.elMapCanvas.height;

      // Soft Pastel Sky Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#e5ecff');
      grad.addColorStop(0.55, '#fde9f2');
      grad.addColorStop(1, '#fff7ed');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle Ambient Cloud Circles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      [[110, 80, 36], [560, 75, 42], [590, 320, 34], [95, 330, 38], [340, 200, 46]].forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.68, cy + 5, r * 0.72, 0, Math.PI * 2);
        ctx.arc(cx - r * 0.68, cy + 6, r * 0.68, 0, Math.PI * 2);
        ctx.fill();
      });

      // Rainbow Bridges
      this.game.world.bridgeColliders.forEach(b => {
        const p1 = this.worldToMap(b.x1, b.z1);
        const p2 = this.worldToMap(b.x2, b.z2);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        if (b.active) {
          const bGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          bGrad.addColorStop(0, '#ec7ea2');
          bGrad.addColorStop(0.5, '#ffd875');
          bGrad.addColorStop(1, '#7fd8ff');
          ctx.strokeStyle = bGrad;
          ctx.lineWidth = 4.5;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgba(128, 108, 158, 0.28)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 6]);
        }
        ctx.stroke();
        ctx.restore();
      });

      // Clean Vector Islands
      this.game.world.islands.forEach(isl => {
        const pt = this.worldToMap(isl.center.x, isl.center.z);
        const r = Math.max(22, isl.radius * 1.15);

        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y + 3, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(72, 52, 98, 0.09)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isl.visited ? isl.grassColor : '#eae4f2';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Subtle inner core dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isl.visited ? 'rgba(52, 41, 70, 0.35)' : 'rgba(130, 115, 155, 0.3)';
        ctx.fill();

        ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif';
        ctx.fillStyle = '#342946';
        ctx.textAlign = 'center';
        ctx.fillText(isl.name, pt.x, pt.y + r + 16);
        ctx.restore();
      });

      // Clean Diamond Marker for Sky Whale
      if (this.game.world.skyWhale) {
        const wp = this.game.world.skyWhale.group.position;
        const mwp = this.worldToMap(wp.x, wp.z);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(mwp.x, mwp.y - 6);
        ctx.lineTo(mwp.x + 6, mwp.y);
        ctx.lineTo(mwp.x, mwp.y + 6);
        ctx.lineTo(mwp.x - 6, mwp.y);
        ctx.closePath();
        ctx.fillStyle = '#9b84ec';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();
      }

      // Clean Live Marker for Lumi
      const lp = this.worldToMap(this.game.player.pos.x, this.game.player.pos.z);
      ctx.save();
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ec5b8c';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif';
      ctx.fillStyle = '#342946';
      ctx.textAlign = 'center';
      ctx.fillText('Lumi', lp.x, lp.y - 12);
      ctx.restore();
    }
  }

  window.QuestAndUIManager = QuestAndUIManager;
})();
