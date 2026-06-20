// Ensure jsPDF is loaded from the window object
const { jsPDF } = window.jspdf;

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const previewSection = document.getElementById('preview-section');
const canvas = document.getElementById('doc-canvas');
const ctx = canvas.getContext('2d');
const filterBtn = document.getElementById('filter-btn');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

// State Management
let currentImage = new Image();
let isFiltered = false;

// ==========================================
// 1. FILE INGESTION (Camera, Drag, Browse)
// ==========================================

fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

// ==========================================
// 2. HTML5 CANVAS RENDERING
// ==========================================

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return alert('Please upload an image file.');

    const reader = new FileReader();
    reader.onload = (event) => {
        currentImage.onload = () => {
            // Setup canvas dimensions to match the physical image
            canvas.width = currentImage.width;
            canvas.height = currentImage.height;
            drawToCanvas();
            
            // Switch UI Views
            dropZone.classList.add('hidden');
            previewSection.classList.remove('hidden');
        };
        currentImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function drawToCanvas() {
    // Standard Draw
    ctx.filter = 'none';
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

    // Apply Document Scanner Enhancements (if toggled)
    if (isFiltered) {
        ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    }
}

// Toggle the scanner filter
filterBtn.addEventListener('click', () => {
    isFiltered = !isFiltered;
    filterBtn.innerText = isFiltered ? "🔄 Revert to Original" : "🌓 Enhance Contrast";
    drawToCanvas();
});

// Reset the workspace
resetBtn.addEventListener('click', () => {
    fileInput.value = '';
    isFiltered = false;
    filterBtn.innerText = "🌓 Enhance Contrast";
    previewSection.classList.add('hidden');
    dropZone.classList.remove('hidden');
});

// ==========================================
// 3. SECURE PDF PACKAGING
// ==========================================

downloadBtn.addEventListener('click', () => {
    // 1. Extract optimized JPEG data URI from our Canvas
    const imgData = canvas.toDataURL('image/jpeg', 0.85); // 0.85 compression saves massive file space

    // 2. Initialize PDF (A4 format size)
    const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height] 
    });

    // 3. Inject Canvas image into the PDF structure
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    
    // 4. Force local download
    pdf.save('Secure-Document-Scan.pdf');
});