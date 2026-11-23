// ⚠️ นำ URL ที่ได้จากการ Deploy Google Apps Script มาวางตรงนี้
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwFYFHgK609jm3aL6sY9OVu4_EO_qNuEmXjQVe6rnZlfS4dSDWWrtZuqCrzcj2Ns-iTmg/exec';

let allTorItems = [];
let filteredTorItems = [];
let activeFilteredIndex = 0;
let currentImageIndex = 0;
let selectedStatus = '';

// เริ่มทำงานเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  fetchTorData();

  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('searchInput').addEventListener('input', applyFilters);
});

// ดึงข้อมูลจาก Google Apps Script
async function fetchTorData() {
  const btnRefresh = document.getElementById('btnRefresh');
  btnRefresh.innerHTML = '<i class="bi bi-arrow-clockwise animate-spin"></i> กำลังโหลด...';
  btnRefresh.disabled = true;

  try {
    const response = await fetch(GAS_API_URL);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'ไม่สามารถดึงข้อมูลได้');
    }

    allTorItems = result.data || [];
    updateSummaryStats(result.totalDriveImages);
    applyFilters(true);

  } catch (error) {
    console.error('Error:', error);
    document.getElementById('torListContainer').innerHTML = `
      <div class="p-4 rounded-xl bg-red-50 text-red-600 text-sm text-center">
        <i class="bi bi-exclamation-triangle-fill mr-1"></i> เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}<br>
        <span class="text-xs text-red-500">ตรวจสอบว่าได้ตั้งค่า GAS_API_URL ถูกต้อง และ Deploy เป็น "ทุกคน (Anyone)" แล้ว</span>
      </div>`;
  } finally {
    btnRefresh.innerHTML = '<i class="bi bi-arrow-clockwise"></i> รีเฟรชข้อมูล';
    btnRefresh.disabled = false;
  }
}

// อัปเดตตัวเลขสถิติและ Progress Bar ด้านบน
function updateSummaryStats(totalDriveImages = 0) {
  const total = allTorItems.length;
  const reviewed = allTorItems.filter(item => item.status === 'ผ่าน' || item.status === 'ไม่ผ่าน').length;
  const percent = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  // นับจำนวนรูปภาพทั้งหมดที่ผูกไว้ใน TOR หรือจำนวนรูปใน Drive
  const linkedImagesCount = allTorItems.reduce((sum, item) => sum + item.images.length, 0);

  document.getElementById('statTotalTor').textContent = total;
  document.getElementById('statTotalImages').textContent = totalDriveImages || linkedImagesCount;
  document.getElementById('statReviewed').textContent = `${reviewed}/${total}`;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  document.getElementById('progressBar').style.width = `${percent}%`;
}

// กรองรายการตามสถานะและคำค้นหา
function applyFilters(resetIndex = false) {
  const filterValue = document.getElementById('statusFilter').value;
  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();

  filteredTorItems = allTorItems.filter(item => {
    const matchesStatus =
      filterValue === 'all' ||
      (filterValue === 'pending' && !item.status) ||
      item.status === filterValue;

    const matchesKeyword =
      !keyword ||
      item.tor_id.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword);

    return matchesStatus && matchesKeyword;
  });

  if (resetIndex || activeFilteredIndex >= filteredTorItems.length) {
    activeFilteredIndex = 0;
  }

  renderTorList();
  renderActiveTorDetail();
}

// แสดงรายการ TOR ในกล่องเลือก
function renderTorList() {
  const container = document.getElementById('torListContainer');

  if (filteredTorItems.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-slate-400 text-sm">ไม่พบรายการ TOR ตามเงื่อนไขที่เลือก</div>`;
    return;
  }

  container.innerHTML = filteredTorItems.map((item, index) => {
    const isActive = index === activeFilteredIndex;
    
    // Badge สถานะด้านขวา
    let statusBadge = `<span class="text-xs text-slate-400 flex items-center gap-1">รอตรวจ <i class="bi bi-chevron-right"></i></span>`;
    if (item.status === 'ผ่าน') {
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">ผ่าน</span>`;
    } else if (item.status === 'ไม่ผ่าน') {
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200">ไม่ผ่าน</span>`;
    }

    return `
      <div onclick="selectTor(${index})" 
        class="cursor-pointer p-3.5 rounded-xl border transition flex items-center justify-between gap-3
        ${isActive ? 'bg-blue-50/70 border-blue-400 shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'}">
        <div class="min-w-0 flex-1">
          <div class="font-prompt font-semibold text-sm ${isActive ? 'text-blue-600' : 'text-slate-900'}">${item.tor_id}</div>
          <div class="text-xs text-slate-500 truncate mt-0.5">${item.description}</div>
        </div>
        <div class="shrink-0">${statusBadge}</div>
      </div>
    `;
  }).join('');
}

// เลือกรายการ TOR
function selectTor(index) {
  activeFilteredIndex = index;
  currentImageIndex = 0;
  renderTorList();
  renderActiveTorDetail();
}

// แสดงรายละเอียดและรูปภาพของ TOR ข้อที่กำลังตรวจ
function renderActiveTorDetail() {
  const detailCard = document.getElementById('detailCard');

  if (filteredTorItems.length === 0) {
    detailCard.classList.add('hidden');
    return;
  }

  detailCard.classList.remove('hidden');
  const item = filteredTorItems[activeFilteredIndex];

  document.getElementById('detailTorId').textContent = `TOR ${item.tor_id}`;
  document.getElementById('detailIndexBadge').textContent = `${activeFilteredIndex + 1} / ${filteredTorItems.length}`;
  document.getElementById('detailDescription').textContent = item.description;
  document.getElementById('detailImageCount').textContent = `${item.images.length} รูป`;

  // ตั้งค่าสถานะและหมายเหตุเดิม
  selectStatus(item.status || '');
  document.getElementById('remarkInput').value = item.remark || '';
  document.getElementById('lastUpdatedText').textContent = item.updated_at 
    ? `บันทึกล่าสุดเมื่อ: ${item.updated_at}` 
    : 'ยังไม่มีการบันทึกผลการตรวจในข้อนี้';

  // ปุ่มข้อก่อนหน้า
  document.getElementById('btnPrevTor').disabled = activeFilteredIndex === 0;

  renderCurrentImage();
}

// แสดงรูปภาพปัจจุบันใน Viewer
function renderCurrentImage() {
  const item = filteredTorItems[activeFilteredIndex];
  const images = item.images || [];
  const viewer = document.getElementById('imageViewerContainer');
  const nameLabel = document.getElementById('currentImageName');
  const paginationLabel = document.getElementById('imagePagination');
  const btnOpenOriginal = document.getElementById('btnOpenOriginal');

  if (images.length === 0) {
    viewer.innerHTML = `
      <div class="text-center text-slate-400 p-6">
        <i class="bi bi-image text-3xl mb-2 block"></i>
        <span class="text-sm">ไม่มีรูปภาพหลักฐานระบุไว้ในข้อนี้</span>
      </div>`;
    nameLabel.textContent = 'ไม่มีรูปภาพ';
    paginationLabel.textContent = '0/0';
    btnOpenOriginal.classList.add('hidden');
    document.getElementById('btnPrevImg').disabled = true;
    document.getElementById('btnNextImg').disabled = true;
    return;
  }

  const currentImg = images[currentImageIndex];
  nameLabel.textContent = currentImg.name;
  paginationLabel.textContent = `${currentImageIndex + 1}/${images.length}`;

  document.getElementById('btnPrevImg').disabled = currentImageIndex === 0;
  document.getElementById('btnNextImg').disabled = currentImageIndex === images.length - 1;

  if (currentImg.url) {
    viewer.innerHTML = `
      <img src="${currentImg.url}" alt="${currentImg.name}" 
        onclick="openModal('${currentImg.url}')"
        class="max-h-[450px] w-auto object-contain cursor-zoom-in transition hover:opacity-95"
        onerror="this.parentElement.innerHTML='<div class=\\'p-6 text-center text-rose-500 text-sm\\'>ไม่สามารถโหลดรูปภาพได้ กรุณาตรวจสอบสิทธิ์การแชร์โฟลเดอร์ Google Drive</div>'">
      <span class="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full pointer-events-none">
        <i class="bi bi-zoom-in"></i> คลิกเพื่อขยาย
      </span>`;
    btnOpenOriginal.href = currentImg.viewUrl;
    btnOpenOriginal.classList.remove('hidden');
  } else {
    viewer.innerHTML = `
      <div class="text-center text-amber-600 p-6">
        <i class="bi bi-file-earmark-x text-3xl mb-2 block"></i>
        <span class="text-sm font-medium">ไม่พบไฟล์ "${currentImg.name}" ในโฟลเดอร์ Google Drive</span>
      </div>`;
    btnOpenOriginal.classList.add('hidden');
  }
}

// เลื่อนดูรูปก่อนหน้า / ถัดไป
function changeImage(step) {
  const item = filteredTorItems[activeFilteredIndex];
  const newIndex = currentImageIndex + step;
  if (newIndex >= 0 && newIndex < item.images.length) {
    currentImageIndex = newIndex;
    renderCurrentImage();
  }
}

// เลือกปุ่ม ผ่าน / ไม่ผ่าน
function selectStatus(status) {
  selectedStatus = status;
  const btnPass = document.getElementById('btnPass');
  const btnFail = document.getElementById('btnFail');

  // รีเซ็ตสไตล์ปุ่ม
  btnPass.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition';
  btnFail.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition';

  if (status === 'ผ่าน') {
    btnPass.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border-2 border-emerald-500 bg-emerald-50 text-sm font-semibold text-emerald-700 transition';
  } else if (status === 'ไม่ผ่าน') {
    btnFail.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border-2 border-rose-500 bg-rose-50 text-sm font-semibold text-rose-700 transition';
  }
}

// บันทึกผลลง Google Sheets และเลื่อนไปข้อถัดไป
async function saveCurrentAndNext() {
  const item = filteredTorItems[activeFilteredIndex];
  const remark = document.getElementById('remarkInput').value.trim();
  const btnSave = document.getElementById('btnSaveAndNext');
  const saveBtnText = document.getElementById('saveBtnText');

  // หากไม่ได้เลือกสถานะใดๆ เลย ให้เลื่อนไปข้อถัดไปเฉยๆ
  if (!selectedStatus && !remark) {
    navigateTor(1);
    return;
  }

  btnSave.disabled = true;
  saveBtnText.textContent = 'กำลังบันทึก...';

  try {
    // ใช้ text/plain เพื่อหลีกเลี่ยง CORS Preflight (OPTIONS) ของ Google Apps Script
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        rowIndex: item.rowIndex,
        status: selectedStatus,
        remark: remark
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    // อัปเดตข้อมูลในหน่วยความจำทันทีโดยไม่ต้องโหลดใหม่ทั้งหน้า
    item.status = selectedStatus;
    item.remark = remark;
    item.updated_at = result.updated_at;

    updateSummaryStats();
    
    // เลื่อนไปข้อถัดไปอัตโนมัติ (ถ้ายังไม่ถึงข้อสุดท้าย)
    if (activeFilteredIndex < filteredTorItems.length - 1) {
      activeFilteredIndex++;
      currentImageIndex = 0;
    }
    
    renderTorList();
    renderActiveTorDetail();

  } catch (error) {
    alert('บันทึกข้อมูลไม่สำเร็จ: ' + error.message);
  } finally {
    btnSave.disabled = false;
    saveBtnText.textContent = 'บันทึกและไปข้อถัดไป';
  }
}

// เลื่อนข้อ TOR ก่อนหน้า / ถัดไป
function navigateTor(step) {
  const newIndex = activeFilteredIndex + step;
  if (newIndex >= 0 && newIndex < filteredTorItems.length) {
    activeFilteredIndex = newIndex;
    currentImageIndex = 0;
    renderTorList();
    renderActiveTorDetail();
  }
}

// เปิด-ปิด Modal ขยายรูป
function openModal(imgUrl) {
  document.getElementById('modalImg').src = imgUrl;
  const modal = document.getElementById('imageModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
