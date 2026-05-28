// ===== STATE =====
let selectedGrade = null;
let selectedSubject = 'auto';
let uploadedFile = null;
let uploadedBase64 = null;

// ===== ELEMENTS =====
const btnSettings   = document.getElementById('btnSettings');
const modalOverlay  = document.getElementById('modalOverlay');
const modalClose    = document.getElementById('modalClose');
const apiKeyInput   = document.getElementById('apiKeyInput');
const btnSaveKey    = document.getElementById('btnSaveKey');
const gradeGrid     = document.getElementById('gradeGrid');
const subjectGrid   = document.getElementById('subjectGrid');
const uploadZone    = document.getElementById('uploadZone');
const fileInput     = document.getElementById('fileInput');
const clickUpload   = document.getElementById('clickUpload');
const uploadInner   = document.getElementById('uploadInner');
const previewWrap   = document.getElementById('previewWrap');
const previewImg    = document.getElementById('previewImg');
const btnRemove     = document.getElementById('btnRemove');
const btnSolve      = document.getElementById('btnSolve');
const resultContainer = document.getElementById('resultContainer');
const resultBody    = document.getElementById('resultBody');
const resultMeta    = document.getElementById('resultMeta');
const btnCopy       = document.getElementById('btnCopy');
const btnNew        = document.getElementById('btnNew');
const loadingContainer = document.getElementById('loadingContainer');
const errorContainer   = document.getElementById('errorContainer');
const errorMsg         = document.getElementById('errorMsg');
const btnRetry         = document.getElementById('btnRetry');
const ls1 = document.getElementById('ls1');
const ls2 = document.getElementById('ls2');
const ls3 = document.getElementById('ls3');

// ===== API KEY =====
function getApiKey() {
  return localStorage.getItem('groq_api_key') || '';
}
function loadSavedKey() {
  const k = getApiKey();
  if (k) apiKeyInput.value = k;
}

btnSettings.addEventListener('click', () => {
  loadSavedKey();
  modalOverlay.classList.add('show');
});
modalClose.addEventListener('click', () => modalOverlay.classList.remove('show'));
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('show'); });

btnSaveKey.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) { alert('Vui lòng nhập API key!'); return; }
  localStorage.setItem('groq_api_key', key);
  modalOverlay.classList.remove('show');
  showToast('✅ Đã lưu API key!');
});

// ===== GRADE SELECTION =====
gradeGrid.querySelectorAll('.grade-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    gradeGrid.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedGrade = btn.dataset.grade;
    checkReady();
  });
});

// ===== SUBJECT SELECTION =====
subjectGrid.querySelectorAll('.subject-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    subjectGrid.querySelectorAll('.subject-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSubject = btn.dataset.subject;
  });
});

// ===== FILE UPLOAD =====
clickUpload.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
uploadZone.addEventListener('click', () => { if (!uploadedFile) fileInput.click(); });

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault(); uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) { alert('Vui lòng chọn file ảnh (PNG, JPG, WEBP)!'); return; }
  if (file.size > 10 * 1024 * 1024) { alert('Ảnh quá lớn! Vui lòng chọn ảnh dưới 10MB.'); return; }

  uploadedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedBase64 = e.target.result; // data:image/jpeg;base64,...
    previewImg.src = uploadedBase64;
    uploadInner.style.display = 'none';
    previewWrap.style.display = 'block';
    checkReady();
  };
  reader.readAsDataURL(file);
}

btnRemove.addEventListener('click', (e) => {
  e.stopPropagation();
  uploadedFile = null;
  uploadedBase64 = null;
  fileInput.value = '';
  uploadInner.style.display = '';
  previewWrap.style.display = 'none';
  previewImg.src = '';
  checkReady();
});

// ===== ENABLE SOLVE BUTTON =====
function checkReady() {
  btnSolve.disabled = !(selectedGrade && uploadedFile);
}

// ===== SOLVE =====
btnSolve.addEventListener('click', solveProblem);
btnRetry.addEventListener('click', solveProblem);

async function solveProblem() {
  const apiKey = getApiKey();
  if (!apiKey) {
    loadSavedKey();
    modalOverlay.classList.add('show');
    showToast('⚠️ Vui lòng nhập Groq API key trước!');
    return;
  }

  // UI state: loading
  hideAll();
  loadingContainer.style.display = 'flex';
  setLoadingStep(1);

  try {
    // Extract base64 data only (without the "data:image/...;base64," prefix)
    const base64Data = uploadedBase64.split(',')[1];
    const mediaType = uploadedFile.type; // e.g. "image/jpeg"

    const subjectText = selectedSubject === 'auto'
      ? 'tự động nhận diện môn học'
      : `môn ${selectedSubject}`;

    const systemPrompt = `Bạn là gia sư AI thông minh, chuyên giải bài tập cho học sinh lớp ${selectedGrade} (${subjectText}). 
Nhiệm vụ của bạn:
1. Đọc và hiểu nội dung bài tập trong ảnh.
2. Xác định dạng bài và phương pháp giải phù hợp với trình độ lớp ${selectedGrade}.
3. Trình bày lời giải THEO TỪNG BƯỚC rõ ràng, chi tiết.
4. Cuối cùng, nêu đáp án kết luận rõ ràng.
5. Nếu có thể, hãy giải thích ngắn gọn tại sao dùng phương pháp đó.

Ngôn ngữ: Tiếng Việt.
Phong cách: Dễ hiểu, thân thiện, phù hợp với học sinh cấp 2-3.
Format: Sử dụng các ký hiệu như "Bước 1:", "Bước 2:", "=> Đáp án:" để dễ theo dõi.`;

    setLoadingStep(2);

    // Call Groq API (vision model)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64Data}`
                }
              },
              {
                type: 'text',
                text: `Đây là bài tập của học sinh lớp ${selectedGrade}${selectedSubject !== 'auto' ? ` môn ${selectedSubject}` : ''}. Hãy giải bài tập này một cách chi tiết, từng bước.`
              }
            ]
          }
        ]
      })
    });

    setLoadingStep(3);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content || '';

    if (!answer) throw new Error('Không nhận được phản hồi từ AI. Vui lòng thử lại.');

    // Format the answer
    const formatted = formatAnswer(answer);

    // Show result
    hideAll();
    resultMeta.textContent = `📚 Lớp ${selectedGrade} · ${selectedSubject === 'auto' ? 'Tự động nhận diện môn' : selectedSubject} · Model: LLaMA 4 Scout (Groq)`;
    resultBody.innerHTML = formatted;
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error(err);
    hideAll();
    let msg = err.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
    if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('invalid_api_key')) {
      msg = '🔑 API key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong phần Cài đặt.';
    } else if (msg.includes('429') || msg.includes('rate_limit')) {
      msg = '⏳ Đã vượt quá giới hạn request. Vui lòng chờ 1 phút rồi thử lại.';
    } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      msg = '🌐 Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
    }
    errorMsg.textContent = msg;
    errorContainer.style.display = 'block';
  }
}

// ===== FORMAT ANSWER =====
function formatAnswer(text) {
  // Escape HTML
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Bold headers like **text** or *text*
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Step labels highlight
  html = html.replace(/(Bước \d+[:\.])/g, '<strong style="color: var(--accent);">$1</strong>');
  html = html.replace(/(=> Đáp án[:\.]?)/gi, '<strong style="color: var(--accent3); font-size: 1.05em;">$1</strong>');
  html = html.replace(/(Kết luận[:\.]?)/gi, '<strong style="color: var(--accent3);">$1</strong>');
  html = html.replace(/(Phương pháp[:\.]?)/gi, '<strong style="color: var(--accent2);">$1</strong>');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}

// ===== LOADING STEPS =====
function setLoadingStep(step) {
  [ls1, ls2, ls3].forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 < step) el.classList.add('done');
    if (i + 1 === step) el.classList.add('active');
  });
}

// ===== HIDE ALL RESULT AREAS =====
function hideAll() {
  resultContainer.style.display = 'none';
  loadingContainer.style.display = 'none';
  errorContainer.style.display = 'none';
}

// ===== COPY =====
btnCopy.addEventListener('click', () => {
  const text = resultBody.innerText;
  navigator.clipboard.writeText(text).then(() => {
    btnCopy.textContent = '✅ Đã sao chép!';
    setTimeout(() => (btnCopy.textContent = '📋 Sao chép'), 2000);
  });
});

// ===== NEW PROBLEM =====
btnNew.addEventListener('click', () => {
  // Reset file
  uploadedFile = null; uploadedBase64 = null;
  fileInput.value = '';
  uploadInner.style.display = '';
  previewWrap.style.display = 'none';
  previewImg.src = '';

  // Reset grade
  gradeGrid.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
  selectedGrade = null;

  // Reset subject
  subjectGrid.querySelectorAll('.subject-btn').forEach(b => b.classList.remove('active'));
  subjectGrid.querySelector('[data-subject="auto"]').classList.add('active');
  selectedSubject = 'auto';

  hideAll();
  checkReady();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== TOAST =====
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text); padding: 12px 24px; border-radius: 100px;
    font-size: 0.9rem; font-weight: 600; z-index: 9999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: slideUp 0.25s ease;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Check if key is already set
  if (!getApiKey()) {
    setTimeout(() => {
      showToast('⚙️ Nhấn "Cài đặt" để nhập Groq API Key');
    }, 1200);
  }
});
