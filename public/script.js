// ============================================
//   HD UPSCALE — Frontend Script
// ============================================

let selectedFile = null;

// ---- DROP ZONE ----
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processFile(file);
    }
});

function handleFile(input) {
    const file = input.files[0];
    if (file) processFile(file);
}

function processFile(file) {
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
        showError('File terlalu besar! Maksimal 10MB.');
        return;
    }

    selectedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('dropContent').classList.add('hidden');
        document.getElementById('previewWrap').classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    // Show file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatBytes(file.size);
    document.getElementById('fileInfo').classList.remove('hidden');

    // Update format stat
    const ext = file.name.split('.').pop().toUpperCase();
    document.getElementById('statFormat').textContent = ext;

    // Enable button
    document.getElementById('enhanceBtn').disabled = false;

    // Reset result
    resetResult();
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ---- UPSCALE ----
async function doUpscale() {
    if (!selectedFile) return;

    setLoading(true);
    resetResult();

    try {
        // Step 1: Upload
        setStep(1);

        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('scale', '2');

        // Step 2: AI Processing
        setTimeout(() => setStep(2), 1500);

        const res = await fetch('/api/upscale', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Enhancement failed');
        }

        // Step 3: Done
        setStep(3);

        // Get result as blob URL
        const blob = await res.blob();
        const resultUrl = URL.createObjectURL(blob);

        // Show result
        showResult(resultUrl);

    } catch (err) {
        showError(err.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
        setLoading(false);
    }
}

function showResult(resultUrl) {
    // Before = preview from upload
    document.getElementById('beforeImg').src = document.getElementById('previewImg').src;

    // After = enhanced result
    document.getElementById('afterImg').src = resultUrl;

    // Set download link
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.href = resultUrl;
    downloadBtn.download = 'hdupscale-' + (selectedFile?.name || 'enhanced.jpg');

    document.getElementById('result').classList.remove('hidden');
    document.getElementById('error-msg').classList.add('hidden');

    setTimeout(() => {
        document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function showError(msg) {
    document.getElementById('error-text').textContent = msg;
    document.getElementById('error-msg').classList.remove('hidden');
    document.getElementById('result').classList.add('hidden');
}

function resetResult() {
    document.getElementById('result').classList.add('hidden');
    document.getElementById('error-msg').classList.add('hidden');
}

function resetAll() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('previewImg').src = '';
    document.getElementById('dropContent').classList.remove('hidden');
    document.getElementById('previewWrap').classList.add('hidden');
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('enhanceBtn').disabled = true;
    resetResult();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- LOADING STEPS ----
function setLoading(state) {
    const btn = document.getElementById('enhanceBtn');
    const loading = document.getElementById('loading');
    if (state) {
        btn.disabled = true;
        btn.querySelector('.btn-text').textContent = 'Processing...';
        loading.classList.remove('hidden');
        // Reset steps
        ['step1','step2','step3'].forEach(id => {
            document.getElementById(id).className = 'lstep';
        });
    } else {
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'Enhance Image';
        loading.classList.add('hidden');
    }
}

function setStep(num) {
    const texts = ['', 'Uploading image...', 'AI is enhancing...', 'Done! Preparing result...'];
    document.getElementById('loadingText').textContent = texts[num];
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById('step' + i);
        if (i < num) el.className = 'lstep done';
        else if (i === num) el.className = 'lstep active';
        else el.className = 'lstep';
    }
}

// ---- NAVBAR SCROLL ----
window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    document.getElementById('scrollBtns').classList.toggle('visible', window.scrollY > 200);
});

// ---- REVEAL ON SCROLL ----
const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
