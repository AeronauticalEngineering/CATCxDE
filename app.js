
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwFYFHgK609jm3aL6sY9OVu4_EO_qNuEmXjQVe6rnZlfS4dSDWWrtZuqCrzcj2Ns-iTmg/exec';
// ⚠️ นำ URL ที่ได้จากการ Deploy Google Apps Script มาวางตรงนี้

let allTorItems = [];
let filteredTorItems = [];
let activeFilteredIndex = 0;
let currentImageIndex = 0;
let selectedStatus = '';
let isSaving = false;

document.addEventListener('DOMContentLoaded', () => {
  fetchTorData();

  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('searchInput').addEventListener('input', applyFilters);

  // ปุ่มลัดคีย์บอร์ดซ้าย/ขวา สำหรับเลื่อนรูป
  document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') changeImage(-1);
    if (e.key === 'ArrowRight') changeImage(1);
  });
});

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
      <div class="p-3 rounded-xl bg-red-50 text-red-600 text-xs text-center">
        <i class="bi bi-exclamation-triangle-fill mr-1"></i> โหลดข้อมูลไม่สำเร็จ: ${error.message}
      </div>`;
  } finally {
    btnRefresh.innerHTML = '<i class="bi bi-arrow-clockwise"></i> รีเฟรช';
    btnRefresh.disabled = false;
  }
}

function updateSummaryStats(totalDriveImages = 0) {
  const total = allTorItems.length;
  const reviewed = allTorItems.filter(item => item.status === 'ผ่าน' || item.status === 'ไม่ผ่าน').length;
  const percent = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  const linkedImagesCount = allTorItems.reduce((sum, item) => sum + item.images.length, 0);

  document.getElementById('statTotalTor').textContent = total;
  document.getElementById('statTotalImages').textContent = totalDriveImages || linkedImagesCount;
  document.getElementById('statReviewed').textContent = `${reviewed}/${total}`;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  document.getElementById('progressBar').style.width = `${percent}%`;
}

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

function renderTorList() {
  const container = document.getElementById('torListContainer');

  if (filteredTorItems.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">ไม่พบรายการ TOR ตามเงื่อนไข</div>`;
    return;
  }

  container.innerHTML = filteredTorItems.map((item, index) => {
    const isActive = index === activeFilteredIndex;

    let statusBadge = `<span class="text-[11px] text-slate-400 flex items-center gap-0.5">รอตรวจ <i class="bi bi-chevron-right text-[10px]"></i></span>`;
    if (item.status === 'ผ่าน') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">ผ่าน</span>`;
    } else if (item.status === 'ไม่ผ่าน') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600 border border-rose-200">ไม่ผ่าน</span>`;
    }

    return `
      <div id="tor-row-${index}" onclick="selectTor(${index})"
        class="cursor-pointer px-3 py-2 rounded-xl border transition flex items-center justify-between gap-2.5
        ${isActive ? 'bg-blue-50/80 border-blue-400' : 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/60'}">
        <div class="min-w-0 flex-1">
          <div class="font-prompt font-semibold text-xs ${isActive ? 'text-blue-600' : 'text-slate-900'}">${item.tor_id}</div>
          <div class="text-[11px] text-slate-500 truncate">${item.description}</div>
        </div>
        <div class="shrink-0">${statusBadge}</div>
      </div>
    `;
  }).join('');

  const activeRow = document.getElementById(`tor-row-${activeFilteredIndex}`);
  if (activeRow) {
    activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function selectTor(index) {
  activeFilteredIndex = index;
  currentImageIndex = 0;
  renderTorList();
  renderActiveTorDetail();
}

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

  applyStatusButtonStyle(item.status || '');
  document.getElementById('remarkInput').value = item.remark || '';
  document.getElementById('lastUpdatedText').textContent = item.updated_at
    ? `บันทึกล่าสุด: ${item.updated_at}`
    : 'กด "ผ่าน" เพื่อบันทึกและไปรูปถัดไปทันที';

  document.getElementById('btnPrevTor').disabled = activeFilteredIndex === 0;

  renderCurrentImage();
}

function renderCurrentImage() {
  const item = filteredTorItems[activeFilteredIndex];
  const images = item.images || [];
  const viewer = document.getElementById('imageViewerContainer');
  const nameLabel = document.getElementById('currentImageName');
  const paginationLabel = document.getElementById('imagePagination');
  const btnOpenOriginal = document.getElementById('btnOpenOriginal');

  if (images.length === 0) {
    viewer.innerHTML = `
      <div class="text-center text-slate-400 p-4">
        <i class="bi bi-image text-2xl mb-1 block"></i>
        <span class="text-xs">ไม่มีรูปภาพหลักฐานระบุไว้ในข้อนี้</span>
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
        class="w-full h-full object-contain cursor-zoom-in transition hover:opacity-95"
        onerror="this.parentElement.innerHTML='<div class=\\'p-4 text-center text-rose-500 text-xs\\'>ไม่สามารถโหลดรูปภาพได้ กรุณาตรวจสอบสิทธิ์โฟลเดอร์ Google Drive</div>'">
      <span class="absolute bottom-2 right-2 bg-black/65 text-white text-[11px] px-2.5 py-0.5 rounded-full pointer-events-none">
        <i class="bi bi-zoom-in"></i> ขยาย
      </span>`;
    btnOpenOriginal.href = currentImg.viewUrl;
    btnOpenOriginal.classList.remove('hidden');
  } else {
    viewer.innerHTML = `
      <div class="text-center text-amber-600 p-4">
        <i class="bi bi-file-earmark-x text-2xl mb-1 block"></i>
        <span class="text-xs font-medium">ไม่พบไฟล์ "${currentImg.name}" ใน Google Drive</span>
      </div>`;
    btnOpenOriginal.classList.add('hidden');
  }
}

function changeImage(step) {
  const item = filteredTorItems[activeFilteredIndex];
  const newIndex = currentImageIndex + step;
  if (newIndex >= 0 && newIndex < item.images.length) {
    currentImageIndex = newIndex;
    renderCurrentImage();
  }
}

// อัปเดตหน้าตาปุ่ม ผ่าน / ไม่ผ่าน
function applyStatusButtonStyle(status) {
  selectedStatus = status;
  const btnPass = document.getElementById('btnPass');
  const btnFail = document.getElementById('btnFail');

  btnPass.className = 'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer';
  btnFail.className = 'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer';

  if (status === 'ผ่าน') {
    btnPass.className = 'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-xs font-semibold text-emerald-700 transition cursor-pointer';
  } else if (status === 'ไม่ผ่าน') {
    btnFail.className = 'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border-2 border-rose-500 bg-rose-50 text-xs font-semibold text-rose-700 transition cursor-pointer';
  }
}

// กดปุ่ม "ผ่าน" -> บันทึกลง Google Sheets ทันที และเลื่อนไปรูปถัดไป (หรือข้อถัดไปเมื่อจบรูป)
async function selectStatus(status) {
  if (isSaving) return;

  if (status === 'ไม่ผ่าน') {
    applyStatusButtonStyle('ไม่ผ่าน');
    return;
  }

  // กรณี status === 'ผ่าน'
  applyStatusButtonStyle('ผ่าน');
  const item = filteredTorItems[activeFilteredIndex];
  const remark = document.getElementById('remarkInput').value.trim();
  const btnPass = document.getElementById('btnPass');

  isSaving = true;
  btnPass.disabled = true;
  document.getElementById('lastUpdatedText').textContent = 'กำลังบันทึกผล "ผ่าน"...';

  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        rowIndex: item.rowIndex,
        status: 'ผ่าน',
        remark: remark
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    item.status = 'ผ่าน';
    item.remark = remark;
    item.updated_at = result.updated_at;

    updateSummaryStats();
    renderTorList();

    // เช็คว่ายังมีรูปถัดไปใน TOR ข้อนี้หรือไม่
    const hasNextImage = item.images && currentImageIndex < item.images.length - 1;
    if (hasNextImage) {
      currentImageIndex++;
      renderCurrentImage();
      document.getElementById('lastUpdatedText').textContent = `บันทึก "ผ่าน" แล้ว (${result.updated_at}) • ไปรูปที่ ${currentImageIndex + 1}/${item.images.length}`;
    } else if (activeFilteredIndex < filteredTorItems.length - 1) {
      // หากเป็นรูปสุดท้ายของข้อนี้ ให้ไป TOR ข้อถัดไป
      activeFilteredIndex++;
      currentImageIndex = 0;
      renderTorList();
      renderActiveTorDetail();
    } else {
      document.getElementById('lastUpdatedText').textContent = `บันทึก "ผ่าน" แล้ว (${result.updated_at}) • ครบทุกรายการแล้ว`;
    }

  } catch (error) {
    alert('บันทึกข้อมูลไม่สำเร็จ: ' + error.message);
  } finally {
    isSaving = false;
    btnPass.disabled = false;
  }
}

// ปุ่ม "บันทึกและไปข้อถัดไป" (ใช้กรณีบันทึก "ไม่ผ่าน" + หมายเหตุ หรือบันทึกข้อปัจจุบันแล้วไปข้อถัดไป)
async function saveCurrentAndNext() {
  if (isSaving) return;

  const item = filteredTorItems[activeFilteredIndex];
  const remark = document.getElementById('remarkInput').value.trim();
  const btnSave = document.getElementById('btnSaveAndNext');
  const saveBtnText = document.getElementById('saveBtnText');

  if (!selectedStatus && !remark) {
    navigateTor(1);
    return;
  }

  isSaving = true;
  btnSave.disabled = true;
  saveBtnText.textContent = 'กำลังบันทึก...';

  try {
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

    item.status = selectedStatus;
    item.remark = remark;
    item.updated_at = result.updated_at;

    updateSummaryStats();

    if (activeFilteredIndex < filteredTorItems.length - 1) {
      activeFilteredIndex++;
      currentImageIndex = 0;
    }

    renderTorList();
    renderActiveTorDetail();

  } catch (error) {
    alert('บันทึกข้อมูลไม่สำเร็จ: ' + error.message);
  } finally {
    isSaving = false;
    btnSave.disabled = false;
    saveBtnText.textContent = 'บันทึกและไปข้อถัดไป';
  }
}

function navigateTor(step) {
  const newIndex = activeFilteredIndex + step;
  if (newIndex >= 0 && newIndex < filteredTorItems.length) {
    activeFilteredIndex = newIndex;
    currentImageIndex = 0;
    renderTorList();
    renderActiveTorDetail();
  }
}

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
