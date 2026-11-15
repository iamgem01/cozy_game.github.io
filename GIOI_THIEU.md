# GIỚI THIỆU TRÒ CHƠI: LUMI & QUẦN ĐẢO MÂY HỒNG
### Sản phẩm Codelab tại DevFest 2026 — Google Developer Groups (GDG) Miền Trung

---

## 🎐 1. Giới thiệu dự án
- **Tên trò chơi**: Lumi & Quần Đảo Mây Hồng (*Pastel 3D Adventure*)
- **Thể loại**: Phiêu lưu 3D thế giới mở / Trải nghiệm thư giãn chữa lành (*Cozy & Wholesome Exploration*)
- **Bối cảnh sáng tạo**: Dự án được xây dựng và trình bày trong khuôn khổ **phiên Codelab thực chiến tại sự kiện DevFest 2026 - GDG Miền Trung**.
- **Thông điệp cốt lõi**: Khám phá một thế giới không có áp lực thời gian, không có quái vật hay màn hình thất bại. Mọi chuyển động — từ vỗ cánh, lướt gió, nhảy mây nhún cho đến ngắm hoàng hôn — đều được thiết kế để mang lại cảm giác bình yên và thư thái.

---

##  2. Cốt truyện & Nhân vật
Bạn đồng hành cùng **Lumi**, một sinh linh nhỏ bé được đánh thức giữa biển mây hồng pastel. Nhận lời gửi gắm từ Hiền Giả **Bác Cú Mơ**, Lumi mang trên vai sứ mệnh thắp sáng lại 4 Cổ Vật Ánh Sao cổ xưa, bắc những nhịp Cầu Cầu Vồng kết nối 5 hòn đảo nổi, và ngân vang **Đại Hồng Chung Ngân Hà** để đánh thức Tinh Linh Cá Voi Mây huyền thoại.

### 5 Vùng đất trong quần đảo:
1. **Đảo Mầm Mơ (Meadow Island)**: Đồng cỏ xanh ngát, rực rỡ hoa dại và tiếng chuông gió dịu dàng.
2. **Đảo Hoa Anh Đào (Sakura Island)**: Hồ gương tĩnh lặng với muôn ngàn cánh hoa đào phấp phới trong gió.
3. **Đảo Bánh Mây Vàng (Honey Island)**: Cối xay gió quay êm đềm bên những tảng đá mật sao ngọt ngào.
4. **Đảo Pha Lê Tím (Crystal Island)**: Thánh địa của những trụ thạch anh tím phát quang và đài quan trắc vũ trụ.
5. **Đỉnh Thiên Hà Mộng Mơ (Celestial Summit)**: Tầng mây cao nhất, nơi ngự trị của Đại Hồng Chung Ngân Hà và cực quang lấp lánh.

---

##  3. Các tính năng & Điểm nhấn đặc sắc

1. **Cơ chế bay lượn tự do & Lướt gió**:
   - Nhảy và vỗ cánh trên không trung bằng năng lượng lông vũ.
   - Bung cánh bướm ánh sao lướt êm ái qua các hòn đảo.
   - Lướt nhanh phía trước (Dash) với vệt sáng lấp lánh.
   - Tận dụng Cột Gió Xoáy (Updrafts) để phóng vút lên trời cao và hồi đầy thể lực.
   - Nhún nhảy trên các Đám Mây Hồng để bật nảy vượt qua vực sâu.

2. **Cơ chế an toàn không lo thua cuộc (Cozy Respawn)**:
   - Nếu Lumi trượt chân rơi khỏi đảo, một đám mây hồng êm ái sẽ xuất hiện nâng đỡ và đưa bạn trở về mỏm đá an toàn gần nhất mà không mất vật phẩm hay tiến trình.

3. **Thế giới sống động & Hệ thống nhiệm vụ**:
   - Gặp gỡ và trò chuyện cùng cư dân thân thiện: Bác Cú Mơ, Thỏ Thần Gió, Mèo Thiên Văn, Chú Rùa Hoa,...
   - Thu thập 36 Tinh Thể Sao và đánh thức 4 Cổ Vật Ngân Hà để kích hoạt Cầu Cầu Vồng.
   - Đánh thức Tinh Linh Cá Voi Mây và nhận Đôi Cánh Bướm Vĩnh Cửu (bay lượn không giới hạn).

4. **Chế độ ngắm cảnh & Đổi sắc trời thời gian thực**:
   - Phím `T`: Chuyển đổi giữa 3 sắc thái bầu trời mỹ lệ: *Ban mai đào ấm*, *Hoàng hôn tím mơ*, và *Đêm sao ngân hà*.
   - Phím `P`: Bật chế độ Chụp Ảnh (Photo Mode) ẩn giao diện, xoay góc tự do và lưu ảnh kỷ niệm định dạng PNG.
   - Phím `M`: Mở Bản đồ tương tác và dịch chuyển tức thời (Fast Travel) giữa các đảo đã khám phá.

5. **Âm thanh chữa lành (Procedural Soundscapes)**:
   - Toàn bộ hiệu ứng âm thanh (vỗ cánh, lướt gió, chuông pha lê, tiếng sóng âm ngân hà) được tổng hợp trực tiếp bằng Web Audio API, mang đến giai điệu du dương, thư giãn tinh thần.

6. **Tương thích đa nền tảng**:
   - Chạy mượt mà trên cả máy tính (bàn phím/chuột) và điện thoại/máy tính bảng (cần điều khiển ảo và nút cảm ứng).

---

## 💻 4. Công nghệ sử dụng trong Codelab DevFest 2026
- **WebGL & Three.js (r149)**: Dựng hình 3D, đổ bóng, chất liệu Toon/Standard và hiệu ứng ánh sáng thời gian thực.
- **Web Audio API**: Bộ phát nhạc nền ambient và âm thanh tương tác được tổng hợp từ mã nguồn (procedural synthesis), không tốn dung lượng tải file audio ngoài.
- **Vanilla JavaScript (ES6+) & Modern CSS3**: Giao diện Glassmorphism mờ kính tinh tế, hoàn toàn thuần không phụ thuộc framework nặng nề.
- **Lucide Icons**: Bộ biểu tượng vector hiện đại, sắc nét.

---

##  5. Bảng phím tắt điều khiển nhanh

- `W / A / S / D`: Di chuyển
- `Space`: Nhảy / Đập cánh (Giữ trên không để Bung cánh lượn)
- `Shift`: Lướt gió (Dash)
- `E`: Tương tác / Nói chuyện / Kích hoạt cổ vật / Ngồi ghế nghỉ
- `Chuột / Q`: Xoay góc nhìn camera
- `C`: Tự động xoay camera theo chuột
- `T`: Đổi sắc trời
- `M`: Bản đồ & Dịch chuyển nhanh
- `P`: Chế độ Chụp ảnh
- `H`: Hướng dẫn điều khiển

---

*Chúc các bạn có những phút giây thư thái và bay lượn tuyệt vời cùng Lumi trên Quần Đảo Mây Hồng!*  
*DevFest 2026 — Google Developer Groups (GDG) Miền Trung.*
