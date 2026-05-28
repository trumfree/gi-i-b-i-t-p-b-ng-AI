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
const errorMsg      = document.getElementById('errorMsg');
const btnRetry      = document.getElementById('btnRetry');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('groq_api_key');
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }
});

// ===== SETTINGS MODAL =====
btnSettings.addEventListener('click', () => modalOverlay.classList.add('active'));
modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});

btnSaveKey.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem('groq_api_key', key);
    showToast('🔑 Đã lưu API Key thành công!');
    modalOverlay.classList.remove('active');
  } else {
    localStorage.removeItem('groq_api_key');
    showToast('⚠️ Đã xóa API Key!');
  }
});

// ===== SELECTION LOGIC =====
gradeGrid.addEventListener('click', (e) => {
  if (e.target.classList.contains('grade-btn')) {
    gradeGrid.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedGrade = e.target.getAttribute('data-grade');
    checkReady();
  }
});

subjectGrid.addEventListener('click', (e) => {
  if (e.target.classList.contains('subject-btn')) {
    subjectGrid.querySelectorAll('.subject-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedSubject = e.target.getAttribute('data-subject');
    checkReady();
  }
});

// ===== UPLOAD LOGIC =====
clickUpload.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--accent)';
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.style.borderColor = 'var(--border)';
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--border)';
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Vui lòng chỉ chọn tệp hình ảnh!');
    return;
  }
  uploadedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedBase64 = e.target.result;
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

function checkReady() {
  if (selectedGrade && uploadedBase64) {
    btnSolve.removeAttribute('disabled');
  } else {
    btnSolve.setAttribute('disabled', 'true');
  }
}

function hideAll() {
  resultContainer.style.display = 'none';
  loadingContainer.style.display = 'none';
  errorContainer.style.display = 'none';
}

// ===== SOLVE PROBLEM =====
btnSolve.addEventListener('click', solveProblem);
btnRetry.addEventListener('click', solveProblem);

async function solveProblem() {
  const apiKey = localStorage.getItem('groq_api_key') || apiKeyInput.value.trim();
  if (!apiKey) {
    showToast('🔑 Vui lòng cài đặt Groq API Key trước!');
    modalOverlay.classList.add('active');
    return;
  }

  hideAll();
  loadingContainer.style.display = 'block';
  
  const ls1 = document.getElementById('ls1');
  const ls2 = document.getElementById('ls2');
  const ls3 = document.getElementById('ls3');

  ls1.className = 'loading-step active';
  ls2.className = 'loading-step';
  ls3.className = 'loading-step';

  setTimeout(() => { ls1.className = 'loading-step'; ls2.className = 'loading-step active'; }, 1200);
  setTimeout(() => { ls2.className = 'loading-step'; ls3.className = 'loading-step active'; }, 2800);

  try {
    const base64Data = uploadedBase64.split(',')[1];
    const mimeType = uploadedFile ? uploadedFile.type : 'image/jpeg';

    // Prompt tối ưu hóa để AI trả về đúng chuẩn bảng biểu và định dạng Toán LaTeX
    const promptText = `Bạn là một chuyên gia giáo dục đỉnh cao. Hãy giải chi tiết bài tập trong hình ảnh này dành cho học sinh Lớp ${selectedGrade}.
Môn học yêu cầu: ${selectedSubject === 'auto' ? 'Tự động nhận diện môn học qua hình ảnh' : selectedSubject}.

Yêu cầu trình bày lời giải:
1. Ghi rõ "Phương pháp:" để tóm tắt lý thuyết, công thức cần dùng.
2. Trình bày chi tiết từng "Bước 1:", "Bước 2:", ... một cách rõ ràng, dễ hiểu.
3. Nếu bài toán cần lập bảng giá trị hoặc bảng biến thiên, hãy sử dụng định dạng bảng Markdown chuẩn (| cột 1 | cột 2 |).
4. Sử dụng công thức toán học LaTeX chuẩn đặt trong dấu đô la đơn $...$ cho công thức nội dòng và dấu đô la kép $$...$$ cho khối công thức riêng biệt.
5. Kết luận bằng cụm từ "=> Đáp án:" kèm theo kết quả cuối cùng một cách nổi bật.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    // Tiến hành format xử lý cấu trúc
    const formatted = formatAnswer(answer);

    // Hiển thị nội dung
    hideAll();
    resultMeta.textContent = `📚 Lớp ${selectedGrade} · ${selectedSubject === 'auto' ? 'Tự động nhận diện môn' : selectedSubject} · Model: LLaMA Vision (Groq)`;
    resultBody.innerHTML = formatted;
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // KÍCH HOẠT MATHJAX ĐỂ QUÉT VÀ VẼ TOÁN HỌC KHÔNG BỊ LỖI CHỮ SẤY
    if (window.MathJax) {
      MathJax.typesetPromise([resultBody]).catch((err) => console.error('MathJax error:', err));
    }

  } catch (error) {
    console.error(error);
    hideAll();
    errorMsg.textContent = `Lỗi hệ thống: ${error.message}. Vui lòng kiểm tra lại API Key hoặc kết nối mạng.`;
    errorContainer.style.display = 'block';
  }
}

// ===== FORMAT ANSWER =====
function formatAnswer(text) {
  // 1. Tách các khối toán LaTeX ($ và $$) ra để tránh bị trình biên dịch Markdown của Marked.js làm hỏng cấu trúc ký tự đặc biệt
  const mathBlocks = [];
  let processedText = text.replace(/(\$\$[\s\S]+?\$\$|\$.+?\$)/g, (match) => {
    mathBlocks.push(match);
    return `__MATH_BLOCK_${mathBlocks.length - 1}__`;
  });

  // 2. Sử dụng Marked để compile mã Markdown sang các tag HTML chuẩn (như <table>, <ul>, <li>)
  let html = typeof marked !== 'undefined' ? marked.parse(processedText) : processedText;

  // 3. Khôi phục lại toàn bộ mã toán học LaTeX nguyên vẹn vào các vị trí ban đầu trong HTML
  mathBlocks.forEach((block, index) => {
    html = html.replace(`__MATH_BLOCK_${index}__`, block);
  });

  // 4. Áp dụng các class CSS custom highlight màu sắc rực rỡ từ code cũ của bạn
  html = html.replace(/(Bước \d+[:\.])/g, '<strong style="color: var(--accent);">$1</strong>');
  html = html.replace(/(=&gt; Đáp án[:\.]?|=> Đáp án[:\.]?)/gi, '<strong style="color: var(--accent3); font-size: 1.05em;">$1</strong>');
  html = html.replace(/(Kết luận[:\.]?)/gi, '<strong style="color: var(--accent3);">$1</strong>');
  html = html.replace(/(Phương pháp[:\.]?)/gi, '<strong style="color: var(--accent2);">$1</strong>');

  return html;
}

// ===== COPY TO CLIPBOARD =====
btnCopy.addEventListener('click', () => {
  navigator.clipboard.writeText(resultBody.innerText).then(() => {
    const oldText = btnCopy.innerHTML;
    btnCopy.innerHTML = '✨ Đã sao chép!';
    setTimeout(() => btnCopy.innerHTML = oldText, 2000);
  });
});

// ===== NEW PROBLEM =====
btnNew.addEventListener('click', () => {
  uploadedFile = null;
  uploadedBase64 = null;
  fileInput.value = '';
  uploadInner.style.display = '';
  previewWrap.style.display = 'none';
  previewImg.src = '';

  gradeGrid.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
  selectedGrade = null;

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
    animation: slideUp 0.2s ease;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
