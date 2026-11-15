# Lumi & Quần Đảo Mây Hồng (Pastel 3D Adventure)

> **Dự án được thực hiện trong sự kiện Codelab tại DevFest 2026 - GDG Miền Trung (Google Developer Groups Miền Trung).**

![DevFest 2026 GDG Miền Trung](https://img.shields.io/badge/Event-DevFest%202026%20GDG%20Mi%E1%BB%81n%20Trung-4285F4?style=for-the-badge&logo=google)
![Three.js](https://img.shields.io/badge/Three.js-r149-black?style=for-the-badge&logo=three.js)
![Web Audio API](https://img.shields.io/badge/Web%20Audio-Procedural%20Sound-ff69b4?style=for-the-badge)
![HTML5 & CSS3](https://img.shields.io/badge/UI-Glassmorphism%20CSS3-E34F26?style=for-the-badge&logo=html5)
![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PC%20%26%20Mobile-blueviolet?style=for-the-badge)

---

## 1. Giới thiệu tổng quan

**Lumi & Quần Đảo Mây Hồng** là một tựa game phiêu lưu 3D thế giới mở mang phong cách nhẹ nhàng, thư giãn (*Cozy Wholesome 3D Exploration*), chạy trực tiếp trên nền tảng trình duyệt Web mà không cần cài đặt bất kỳ phần mềm nào.

Trong game, người chơi sẽ hóa thân thành **Lumi** — một tinh linh nhỏ bé mang đôi cánh bướm ánh sao, thức dậy giữa đại ngàn mây trôi bồng bềnh và bắt đầu chuyến hành trình đánh thức nguồn năng lượng cổ xưa của Quần Đảo Mây Hồng.

Trò chơi được xây dựng với triết lý **"Không áp lực - Thuần túy chữa lành"**:
- Không có thanh máu hay thời gian đếm ngược.
- Không có quái vật hay màn hình *Game Over*.
- Nếu vô tình trượt chân rơi khỏi đảo, những đám mây hồng êm dịu sẽ nhẹ nhàng nâng đỡ và đưa Lumi trở lại điểm an toàn gần nhất.

---

##  2. Xuất xứ dự án: Codelab DevFest 2026 GDG Miền Trung

Sản phẩm này được hình thành và hoàn thiện trong buổi **Codelab thực chiến tại Google Developer Groups (GDG) Miền Trung - DevFest 2026**.

- **Mục tiêu Codelab**: 
  - Khám phá sức mạnh đồ họa 3D hiện đại trên nền Web với **Three.js** và WebGL.
  - Tối ưu hiệu năng đồ họa thời gian thực (60+ FPS) trên cả thiết bị di động và máy tính cấu hình cơ bản.
  - Xây dựng trải nghiệm âm thanh động (Procedural Audio Synth) không phụ thuộc tài nguyên ngoài thông qua **Web Audio API**.
  - Thiết kế giao diện người dùng theo phong cách **Glassmorphism** chuẩn Responsive kết hợp thư viện biểu tượng vector **Lucide**.
  - Tiếp cận tư duy thiết kế trò chơi tương tác (Game Design, Movement Physics, Camera Orbit, NPC Dialogue System).

---

## 3. Khám phá Quần Đảo Mây Hồng

Thế giới game bao gồm 5 hòn đảo nổi độc đáo, liên kết với nhau bằng những luồng gió mây và Cầu Cầu Vồng thần kỳ:

| Hòn đảo | Tên gọi | Đặc điểm & Khung cảnh |
| :--- | :--- | :--- |
| 🌿 **Đảo 1** | **Đảo Mầm Mơ** *(Meadow Island)* | Thảo nguyên cỏ xanh ngọc bích êm ái, nơi bắt đầu chuyến hành trình và gặp gỡ Hiền Giả Bác Cú Mơ. |
| 🌸 **Đảo 2** | **Đảo Hoa Anh Đào** *(Sakura Island)* | Thung lũng cánh hoa rơi thơ mộng, hồ gương trong vắt phản chiếu rặng cây anh đào hồng phấn. |
| 🍯 **Đảo 3** | **Đảo Bánh Mây Vàng** *(Honey Island)* | Cối xay gió quay đều trong gió, ngát hương mật sao nướng và những tảng đá bơ vàng dịu ngọt. |
| 🔮 **Đảo 4** | **Đảo Pha Lê Tím** *(Crystal Island)* | Đài thiên văn cổ kính bao quanh bởi các cột thạch anh tím phát quang ngân vang giai điệu bầu trời. |
| ✨ **Đảo 5** | **Đỉnh Thiên Hà Mộng Mơ** *(Celestial Island)* | Thánh địa mây trắng ngự trên tầng trời cao nhất, nơi lưu giữ **Đại Hồng Chung Ngân Hà**. |

---

## 🎮 4. Cơ chế Gameplay đặc sắc

###  Cơ chế Bay lượn & Thể lực cánh
- **Chạy & Lướt gió (Dash)**: Tăng tốc lướt nhanh về phía trước xé toạc làn sương mây.
- **Vỗ cánh (Flap)**: Nhảy cao nhiều tầng trên không trung bằng năng lượng lông vũ.
- **Bung cánh lượn (Glide)**: Giữ phím nhảy trên không để bung đôi cánh bướm ánh sao, lướt êm ái giữa các tầng không.
- **Môi trường trợ lực**: 
  - *Cột Gió Xoáy (Updrafts)*: Đẩy Lumi vút lên cao và hồi phục tức thì toàn bộ thể lực cánh.
  - *Mây Hồng Bật Nảy (Bouncy Clouds)*: Tấm đệm nhún mây khổng lồ đưa người chơi vượt qua vực sâu.

### Nhiệm vụ & Cốt truyện tương tác
- **Hệ thống hội thoại NPC**: Trò chuyện với các nhân vật đáng yêu (Bác Cú Mơ, Thỏ Thần Gió, Mèo Thiên Văn, Cáo Ngắm Sao, Rùa Hoa,...).
- **Đánh thức Cổ Vật Ánh Sao**: Kích hoạt 4 Cổ Vật Cổ Đại để thắp sáng các nhịp Cầu Cầu Vồng rực rỡ nối liền quần đảo.
- **Thu thập Tinh Thể Sao**: Tìm kiếm 36 Tinh Thể Sao lấp lánh rải rác trên khắp các vách đá, vòm cây và mây nổi.
- **Đại tiệc Cực Quang & Cá Voi Mây**: Khi rung chuông Đại Hồng Chung, Tinh Linh Cá Voi Mây khổng lồ sẽ xuất hiện, ban tặng Lumi **Đôi Cánh Bướm Vĩnh Cửu** và mở tiệc Cực Quang rực sáng bầu trời.

###  Tính năng phong phú hỗ trợ trải nghiệm
- **Đổi sắc trời thời gian thực (Phím T)**: Chuyển đổi giữa 3 sắc thái màu nước: *Ban mai ửng hồng*, *Hoàng hôn tím mơ*, và *Đêm sao ngân hà*.
- **Chế độ Chụp Ảnh (Photo Mode - Phím P)**: Tự do căn góc máy, xóa bỏ giao diện và xuất ảnh chụp chất lượng cao (.PNG) lưu giữ khoảnh khắc.
- **Bản đồ Quần Đảo & Dịch Chuyển Tức Thời (Phím M)**: Bản đồ minh họa trực quan, cho phép dịch chuyển nhanh đến các hòn đảo đã ghé thăm.
- **Ghế nghỉ ngơi**: Ngồi thả lỏng ngắm mây trôi và nghe nhạc êm dịu tại các băng ghế gỗ ven đảo.
- **Hỗ trợ toàn diện Màn hình Cảm ứng**: Cung cấp cần điều khiển ảo (Virtual Joystick) và các nút thao tác mượt mà cho Smartphone / Tablet.

---

## ⌨ 5. Hướng dẫn Điều khiển

### Trên Máy tính (PC / Laptop):
| Phím | Thao tác |
| :--- | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / Phím mũi tên | Di chuyển nhân vật |
| <kbd>Space</kbd> (Nhấn) | Nhảy / Đập cánh bay lên |
| <kbd>Space</kbd> (Giữ trên không) | Bung cánh bướm lượn lờ |
| <kbd>Shift</kbd> | Lướt gió siêu tốc (Dash) |
| <kbd>E</kbd> | Tương tác (Nói chuyện, Kích hoạt cổ vật, Ngồi ghế) |
| <kbd>Kéo chuột</kbd> / <kbd>Q</kbd> | Xoay góc nhìn camera |
| <kbd>Con lăn chuột</kbd> | Phóng to / Thu nhỏ góc nhìn |
| <kbd>C</kbd> | Bật/tắt tự động xoay camera theo chuột (Mouse Lock) |
| <kbd>T</kbd> | Đổi sắc trời (Ban mai / Hoàng hôn / Đêm sao) |
| <kbd>M</kbd> | Mở Bản đồ quần đảo & Dịch chuyển nhanh |
| <kbd>P</kbd> | Chế độ ngắm cảnh & Chụp ảnh (Photo Mode) |
| <kbd>J</kbd> | Thu gọn / Mở rộng sổ tay nhiệm vụ |
| <kbd>H</kbd> | Xem bảng hướng dẫn điều khiển |

### Trên Thiết bị Di động (Mobile / Tablet):
- **Cần điều khiển bên trái**: Kéo để di chuyển nhân vật theo hướng mong muốn.
- **Nút "Bay" (Hồng)**: Nhấn để nhảy / đập cánh; giữ để lượn.
- **Nút "Lướt" (Tím)**: Lướt gió về phía trước.
- **Nút "E" (Xanh mint)**: Tương tác với cư dân và đồ vật xung quanh.
- **Chạm vuốt màn hình**: Xoay góc nhìn camera 360 độ linh hoạt.

---

## 6. Kiến trúc Kỹ thuật (Technical Architecture)

Dự án được cấu trúc dạng Web tĩnh thuần (Vanilla Web Architecture), tối ưu hóa dung lượng tải trang cực nhẹ:

```text
pastel-3d-adventure/
├── index.html          # Khung giao diện, Canvas WebGL, HUD & các Modal Glassmorphism
├── css/
│   └── style.css       # Tạo hình thẩm mỹ, hiệu ứng mờ kính, gradient màu pastel, responsive
├── js/
│   ├── world.js        # Khởi tạo Three.js: Quần đảo, mây bay, cầu vồng, shader bầu trời, cột gió
│   ├── entities.js     # Khởi tạo thực thể: Nhân vật Lumi, NPC, Tinh thể sao, Cổ vật, Mây nhún
│   ├── quests.js       # Quản lý cốt truyện, tương tác hội thoại, sổ tay nhiệm vụ & Bản đồ
│   ├── audio.js        # Web Audio API: Bộ tạo âm thanh tương tác và nhạc nền Procedural Synth
│   └── main.js         # Vòng lặp game (Game Loop), vật lý di chuyển, bắt sự kiện điều khiển
└── README.md           # Tài liệu giới thiệu dự án DevFest 2026 GDG Miền Trung
```

### Điểm nhấn công nghệ:
1. **Three.js Standalone**: Tận dụng triệt để hình học cơ bản (`BufferGeometry`) kết hợp biến đổi tham số để tạo ra các sinh vật, hòn đảo và kiến trúc pastel mà không phụ thuộc tệp 3D nặng nề (giúp game load ngay lập tức dưới 2 giây).
2. **Procedural Web Audio**: Tạo âm hưởng chuông gió, tiếng vỗ cánh, tiếng lượn gió và nhịp ngân thạch anh trực tiếp từ sóng âm `OscillatorNode` và bộ lọc `BiquadFilterNode` thời gian thực.
3. **Optimized Collision System**: Hệ thống kiểm tra va chạm hình học (Disc, Capsule, Cylinder) tự viết gọn nhẹ, duy trì tốc độ khung hình ổn định ở mức 60 FPS.

---

##  7. Cách trải nghiệm game

1. **Chạy trực tiếp qua trình duyệt**:
   - Mở trực tiếp tệp `index.html` bằng bất kỳ trình duyệt hiện đại nào (Google Chrome, Microsoft Edge, Safari, Firefox).
   - Hoặc chạy qua một Local Server bất kỳ:
     ```bash
     # Sử dụng Python HTTP Server:
     python -m http.server 8080
     
     # Hoặc sử dụng Node.js npx serve:
     npx serve .
     ```
   - Truy cập vào địa chỉ: `http://localhost:8080`.

2. Nhấn nút **"Bắt đầu hành trình"** trên màn hình mở đầu để thưởng thức thế giới Quần Đảo Mây Hồng!

---
