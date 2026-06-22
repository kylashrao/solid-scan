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

// New state management
let scanGallery = []; // This will store our objects: { id: Date.now(), data: imageBase64 }


// Update your existing upload/capture function:
async function addToGallery(imageData) {
    const copyBtn = document.getElementById('copy-text-btn');
    const statusDiv = document.getElementById('status-msg');

    // 1. Lock the button immediately
    if (copyBtn) copyBtn.disabled = true;
    if (statusDiv) statusDiv.innerText = "Processing text...";

    // 2. Perform OCR
    const text = await performOCR(imageData);

    // 3. Create the object with text
    const newPage = {
        id: Date.now(),
        data: imageData,
        text: text
    };

    // 4. Push to gallery and update UI
    scanGallery.push(newPage);
    renderGallery();

    // 5. Unlock and show completion
    if (statusDiv) statusDiv.innerText = "Scan complete.";
    if (copyBtn) copyBtn.disabled = false; // Only unlock AFTER text exists

    setTimeout(() => {
        if (statusDiv) statusDiv.innerText = "";
    }, 2000);
}

// Example of how your capture function likely looks now:
function onCapture() {
    // ... your existing code to grab the image from the camera ...

    const newImage = canvas.toDataURL('image/jpeg');

    // 1. Existing: Update your main preview
    document.getElementById('main-preview').src = newImage;

    // 2. NEW: Add this line to send that same image to your gallery!
    addToGallery(newImage);
}

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
            // 1. Setup canvas
            canvas.width = currentImage.width;
            canvas.height = currentImage.height;
            drawToCanvas();

            // 2. Switch UI Views
            dropZone.classList.add('hidden');
            previewSection.classList.remove('hidden');

            // 3. Add to Gallery
            const imageData = canvas.toDataURL('image/jpeg');
            addToGallery(imageData);

            // 4. Show the "Scan Next Page" button
            nextBtn.classList.remove('hidden');
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

function renderGallery() {
    const container = document.getElementById('gallery-container');
    container.innerHTML = ''; // Clear current view
    container.classList.toggle('hidden', scanGallery.length === 0);

    if (scanGallery.length > 0) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }

    scanGallery.forEach((page, index) => {
        const img = document.createElement('img');
        img.src = page.data;
        img.className = 'thumb';
        //if (index === currentPageIndex) img.classList.add('active');

        // --- ADDED LOGIC ---
        // Inside renderGallery() loop:
        img.onclick = () => {
            currentPageIndex = index;
            // Clear all 'active' classes, then highlight current one
            document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
            img.classList.add('active');

            // Update main preview canvas/image
            const mainPreview = document.getElementById('main-preview');
            if (mainPreview) mainPreview.src = page.data;

            // Status update
            const statusDiv = document.getElementById('status-msg');
            if (statusDiv) statusDiv.innerText = `Viewing page ${index + 1}`;
        };
        // -------------------

        container.appendChild(img);
    });
}

// OCR Engine
async function performOCR(imageData) {
    console.log("Starting OCR...");
    const { data: { text } } = await Tesseract.recognize(
        imageData,
        'eng', // Language
        { logger: m => console.log(m) } // Optional: track progress
    );
    return text;
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
// 4. SCAN NEXT PAGE FLOW (NEW)
// ==========================================

const nextBtn = document.getElementById('next-btn');

nextBtn.addEventListener('click', () => {
    // 1. Clear the canvas preview
    // We set src to a blank string or the empty placeholder
    const mainPreview = document.getElementById('main-preview');
    if (mainPreview) mainPreview.src = '';

    // 2. Hide the preview section and bring back the upload zone
    previewSection.classList.add('hidden');
    dropZone.classList.remove('hidden');

    // 3. Hide the "Scan Next" button again until the next successful scan
    nextBtn.classList.add('hidden');
});


// ==========================================
// 5. OCR TEXT EXTRACTION & COPY (UNIFIED)
// ==========================================
document.getElementById('copy-text-btn').addEventListener('click', async (e) => {
    // Determine target index: Active selection or the latest scan
    const indexToCopy = (typeof currentPageIndex !== 'undefined') ? currentPageIndex : scanGallery.length - 1;

    // Safety: Check if valid
    if (!scanGallery[indexToCopy] || !scanGallery[indexToCopy].text) {
        return alert("Text is still processing. Please wait a moment.");
    }

    const activeText = scanGallery[indexToCopy].text;
    const button = e.target;

    try {
        await navigator.clipboard.writeText(scanGallery[indexToCopy].text);

        // Visual Feedback
        const button = e.target;
        const originalText = button.innerText;
        button.innerText = "✅ Copied!";
        button.disabled = true;

        setTimeout(() => {
            button.innerText = originalText;
            button.disabled = false;
        }, 2000);
    } catch (err) {
        alert("Failed to copy text.");
    }
});

// ==========================================
// 3. SECURE PDF PACKAGING (Multi-Page Engine)
// ==========================================

downloadBtn.addEventListener('click', () => {
    if (scanGallery.length === 0) return alert("Nothing to save!");

    // Use A4 size for consistent PDF structure (or keep your custom dimensions if preferred)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    scanGallery.forEach((page, index) => {
        if (index > 0) pdf.addPage();

        // JPEG compression: 'FAST' and quality 0.7 significantly reduces size
        pdf.addImage(page.data, 'JPEG', 10, 10, pageWidth - 20, 0, undefined, 'FAST');
    });

    pdf.save('SolidScan-Document.pdf');

    // Auto-Reset
    scanGallery = [];
    currentPageIndex = 0;
    renderGallery();
    nextBtn.classList.add('hidden');
    previewSection.classList.add('hidden');
    dropZone.classList.remove('hidden');
});