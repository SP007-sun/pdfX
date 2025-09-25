
// Access PDF libraries from the window object (loaded via CDN)
const { pdfjsLib, PDFLib } = window;

// --- DOM Element Selectors ---
const DOMElements = {
    app: document.getElementById('app'),
    errorBox: document.getElementById('error-box'),
    errorMessage: document.getElementById('error-message'),
    
    processingView: document.getElementById('processing-view'),
    processingMessage: document.getElementById('processing-message'),
    
    fileUploaderView: document.getElementById('file-uploader-view'),
    fileUploaderLabel: document.querySelector('#file-uploader-view label'),
    fileUploadInput: document.getElementById('file-upload-input'),

    pdfViewerView: document.getElementById('pdf-viewer-view'),
    fileName: document.getElementById('file-name'),
    selectionStatus: document.getElementById('selection-status'),
    clearSelectionBtn: document.getElementById('clear-selection-btn'),
    deleteBtn: document.getElementById('delete-btn'),
    demergeBtn: document.getElementById('demerge-btn'),
    mergeBtn: document.getElementById('merge-btn'),
    newFileBtn: document.getElementById('new-file-btn'),
    pagesGrid: document.getElementById('pages-grid'),
    globalInvertCheckbox: document.getElementById('global-invert-checkbox'),
    downloadBtn: document.getElementById('download-btn'),

    mergeModal: document.getElementById('merge-modal'),
    mergeModalContent: document.getElementById('merge-modal-content'),
    mergeModalCloseBtn: document.getElementById('merge-modal-close-btn'),
    pageSizeSelect: document.getElementById('page-size-select'),
    backgroundColorGroup: document.getElementById('background-color-group'),
    invertColorsCheckbox: document.getElementById('invert-colors-checkbox'),
    previewLoader: document.getElementById('preview-loader'),
    previewImage: document.getElementById('preview-image'),
    mergeModalCancelBtn: document.getElementById('merge-modal-cancel-btn'),
    mergeModalConfirmBtn: document.getElementById('merge-modal-confirm-btn'),
};

// --- Application State ---
let state = {
    pdfFile: null,
    originalPageImages: [], // Array of data URLs for original pages
    documentStructure: [], // Array of OriginalPage or MergedPage objects
    selectedIds: new Set(),
    isProcessing: false,
    processingMessage: '',
    error: null,
    mergeConfig: {
        pageSize: 'A4_portrait',
        backgroundColor: 'white',
        invertColors: false,
    },
    globalInvert: false,
};

// --- State Management and Rendering ---

function resetState() {
    state = {
        pdfFile: null,
        originalPageImages: [],
        documentStructure: [],
        selectedIds: new Set(),
        isProcessing: false,
        processingMessage: '',
        error: null,
        globalInvert: false,
        mergeConfig: {
            pageSize: 'A4_portrait',
            backgroundColor: 'white',
            invertColors: false,
        },
    };
    DOMElements.fileUploadInput.value = ''; // Clear file input
    render();
}

function render() {
    DOMElements.fileUploaderView.classList.add('hidden');
    DOMElements.pdfViewerView.classList.add('hidden');
    DOMElements.processingView.classList.add('hidden');
    DOMElements.errorBox.classList.add('hidden');

    if (state.error) {
        DOMElements.errorBox.classList.remove('hidden');
        DOMElements.errorMessage.textContent = state.error;
    }

    if (state.isProcessing) {
        DOMElements.processingView.classList.remove('hidden');
        DOMElements.processingMessage.textContent = state.processingMessage;
        return;
    }
    
    if (state.pdfFile && state.documentStructure.length > 0) {
        DOMElements.pdfViewerView.classList.remove('hidden');
        renderPdfViewer();
    } else {
        DOMElements.fileUploaderView.classList.remove('hidden');
    }
}

function renderPdfViewer() {
    DOMElements.fileName.textContent = state.pdfFile.name;
    DOMElements.fileName.title = state.pdfFile.name;
    DOMElements.globalInvertCheckbox.checked = state.globalInvert;
    updateHeaderControls();
    renderPagesGrid();
}

function updateHeaderControls() {
    const selectionCount = state.selectedIds.size;
    DOMElements.selectionStatus.textContent = `${selectionCount} of ${state.documentStructure.length} pages selected`;
    
    const selectedPages = state.documentStructure.filter(p => state.selectedIds.has(p.id));
    const selectedPage = selectionCount === 1 ? selectedPages[0] : undefined;

    const canDelete = selectionCount > 0;
    const canMerge = selectionCount >= 2 && selectionCount <= 4 && selectedPages.every(p => p.type === 'original');
    const canDemerge = selectionCount === 1 && selectedPage?.type === 'merged';

    DOMElements.clearSelectionBtn.disabled = selectionCount === 0;
    DOMElements.deleteBtn.disabled = !canDelete;
    DOMElements.mergeBtn.disabled = !canMerge;
    DOMElements.demergeBtn.disabled = !canDemerge;
}

function renderPagesGrid() {
    DOMElements.pagesGrid.innerHTML = ''; // Clear existing pages
    state.documentStructure.forEach((page, index) => {
        const isSelected = state.selectedIds.has(page.id);
        const pageNumber = index + 1;
        let thumbnailHtml = '';

        if (page.type === 'original') {
            thumbnailHtml = `
                <div class="relative rounded-lg shadow-md overflow-hidden cursor-pointer group transition-all duration-200 transform hover:scale-105 ${isSelected ? 'ring-4 ring-blue-500' : 'ring-2 ring-transparent dark:ring-gray-700'}" data-page-id="${page.id}">
                    <img src="${page.imageUrl}" alt="Page ${pageNumber}" class="w-full h-auto" />
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
                    ${isSelected ? `<div class="absolute inset-0 bg-blue-500 bg-opacity-40 flex items-center justify-center"><svg class="w-12 h-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg></div>` : ''}
                    <div class="absolute bottom-0 left-0 bg-gray-800 bg-opacity-75 text-white text-xs font-bold px-2 py-1 rounded-tr-lg">${pageNumber}</div>
                </div>`;
        } else { // Merged page
            thumbnailHtml = `
                <div class="relative rounded-lg shadow-md overflow-hidden cursor-pointer group transition-all duration-200 transform hover:scale-105 ${isSelected ? 'ring-4 ring-blue-500' : 'ring-2 ring-transparent dark:ring-gray-700'}" data-page-id="${page.id}">
                    <img src="${page.imageUrl}" alt="Merged Page ${pageNumber}" class="w-full h-auto border-2 border-dashed border-blue-400" />
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
                    ${isSelected ? `<div class="absolute inset-0 bg-blue-500 bg-opacity-40 flex items-center justify-center"><svg class="w-12 h-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg></div>` : ''}
                    <div class="absolute top-1 right-1 bg-blue-500 text-white p-1 rounded-full"><svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6.75A2.25 2.25 0 0115.75 4.5h1.5a2.25 2.25 0 012.25 2.25v1.5m-4.5 0h4.5m-4.5 0a2.25 2.25 0 01-2.25-2.25V6.75" /></svg></div>
                    <div class="absolute bottom-0 left-0 bg-gray-800 bg-opacity-75 text-white text-xs font-bold px-2 py-1 rounded-tr-lg">${pageNumber}</div>
                    <div class="absolute top-1 left-1 bg-gray-800 bg-opacity-75 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Merged: ${page.sourceIndices.map(i => i + 1).join(', ')}</div>
                </div>`;
        }
        DOMElements.pagesGrid.insertAdjacentHTML('beforeend', thumbnailHtml);
    });
}

// --- Event Handlers & Business Logic ---

async function handleFileSelect(file) {
    if (file && file.type === 'application/pdf') {
        resetState();
        state.pdfFile = file;
        await processPdfToImages();
    } else {
        state.error = 'Please select a valid PDF file.';
    }
    render();
}

async function processPdfToImages() {
    if (!state.pdfFile || !pdfjsLib) return;
    state.isProcessing = true;
    state.processingMessage = 'Loading your PDF...';
    state.error = null;
    render();

    try {
        const arrayBuffer = await state.pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const urls = [];
        const initialStructure = [];

        for (let i = 1; i <= numPages; i++) {
            state.processingMessage = `Rendering page ${i} of ${numPages}...`;
            if(i % 5 === 0) render();
            
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
                urls.push(imageUrl);
                initialStructure.push({ type: 'original', id: `${i-1}`, originalIndex: i - 1, imageUrl });
            }
        }
        state.originalPageImages = urls;
        state.documentStructure = initialStructure;
    } catch (e) {
        console.error(e);
        state.error = 'Could not read or render the PDF file. It might be corrupted or protected.';
        resetState();
    } finally {
        state.isProcessing = false;
        state.processingMessage = '';
        render();
    }
}

function handlePageSelection(event) {
    const pageElement = event.target.closest('[data-page-id]');
    if (!pageElement) return;

    const pageId = pageElement.dataset.pageId;
    if (state.selectedIds.has(pageId)) {
        state.selectedIds.delete(pageId);
    } else {
        state.selectedIds.add(pageId);
    }
    renderPagesGrid();
    updateHeaderControls();
}

function handleClearSelection() {
    state.selectedIds.clear();
    renderPagesGrid();
    updateHeaderControls();
}

function handleDeleteSelected() {
    if (state.selectedIds.size === 0) return;
    state.documentStructure = state.documentStructure.filter(page => !state.selectedIds.has(page.id));
    handleClearSelection();
    render();
}

function handleDemergeSelected() {
    if (state.selectedIds.size !== 1) return;
    const selectedId = state.selectedIds.values().next().value;
    const pageToDemerge = state.documentStructure.find(p => p.id === selectedId);

    if (!pageToDemerge || pageToDemerge.type !== 'merged') return;

    const originalPagesToRestore = pageToDemerge.sourceIndices.map(originalIndex => ({
        type: 'original', id: `${originalIndex}`, originalIndex, imageUrl: state.originalPageImages[originalIndex],
    }));
    const indexToReplace = state.documentStructure.findIndex(p => p.id === selectedId);
    if (indexToReplace !== -1) {
        state.documentStructure.splice(indexToReplace, 1, ...originalPagesToRestore);
    }
    handleClearSelection();
    render();
}

// --- Merge Modal Logic ---

function openMergeModal() {
    const selectionCount = state.selectedIds.size;
    const selectedPages = state.documentStructure.filter(p => state.selectedIds.has(p.id));
    if (selectionCount < 2 || selectionCount > 4 || !selectedPages.every(p => p.type === 'original')) {
        state.error = "Please select 2 to 4 original pages to merge.";
        render();
        return;
    }
    state.error = null;
    DOMElements.mergeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    updateMergePreview();
}

function closeMergeModal() {
    DOMElements.mergeModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function handleMergeModalConfigChange() {
    state.mergeConfig.pageSize = DOMElements.pageSizeSelect.value;
    state.mergeConfig.invertColors = DOMElements.invertColorsCheckbox.checked;
    const selectedButton = DOMElements.backgroundColorGroup.querySelector('[data-value].bg-blue-600');
    state.mergeConfig.backgroundColor = selectedButton.dataset.value;
    updateMergePreview();
}

function handleBackgroundColorChange(event) {
    const clickedButton = event.target.closest('button[data-value]');
    if (!clickedButton) return;
    
    const allButtons = DOMElements.backgroundColorGroup.querySelectorAll('button');
    allButtons.forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('bg-white', 'text-gray-700', 'border-gray-300', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:border-gray-600', 'dark:hover:bg-gray-600');
    });
    clickedButton.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
    clickedButton.classList.remove('bg-white', 'text-gray-700', 'border-gray-300', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:border-gray-600', 'dark:hover:bg-gray-600');
    handleMergeModalConfigChange();
}

async function updateMergePreview() {
    DOMElements.previewLoader.classList.remove('hidden');
    DOMElements.previewImage.classList.add('hidden');
    const selectedPages = state.documentStructure.filter(p => state.selectedIds.has(p.id));
    const sourceImageUrls = selectedPages.map(p => p.imageUrl);
    const previewUrl = await generateMergePreview(sourceImageUrls, state.mergeConfig);
    DOMElements.previewImage.src = previewUrl;
    DOMElements.previewLoader.classList.add('hidden');
    DOMElements.previewImage.classList.remove('hidden');
}

async function handleConfirmMerge() {
    const selectedPages = state.documentStructure.filter(p => state.selectedIds.has(p.id));
    const sourceIndices = selectedPages.map(p => p.originalIndex);
    const sourceImageUrls = selectedPages.map(p => p.imageUrl);

    state.isProcessing = true;
    state.processingMessage = 'Creating merged page...';
    render();
    closeMergeModal();

    const newImageUrl = await generateMergePreview(sourceImageUrls, state.mergeConfig);
    const newMergedPage = {
        type: 'merged', id: crypto.randomUUID(), sourceIndices, imageUrl: newImageUrl, ...state.mergeConfig,
    };
    const firstSelectedIndex = state.documentStructure.findIndex(p => state.selectedIds.has(p.id));
    state.documentStructure = state.documentStructure.filter(p => !state.selectedIds.has(p.id));
    state.documentStructure.splice(firstSelectedIndex, 0, newMergedPage);

    handleClearSelection();
    state.isProcessing = false;
    state.processingMessage = '';
    render();
}

// --- PDF Generation & Layout Logic ---

function getPageSize(pageSize) {
    const A4 = PDFLib.PageSizes.A4, Letter = PDFLib.PageSizes.Letter;
    switch(pageSize) {
        case 'A4_portrait': return { width: A4[0], height: A4[1] };
        case 'A4_landscape': return { width: A4[1], height: A4[0] };
        case 'Letter_portrait': return { width: Letter[0], height: Letter[1] };
        case 'Letter_landscape': return { width: Letter[1], height: Letter[0] };
    }
}

function calculateLayout(count, pageWidth, pageHeight) {
    const rects = [], margin = 15, gap = 10;
    switch(count) {
      case 2: { // 1x2 vertical stack
        const h = (pageHeight - 2 * margin - gap) / 2, w = pageWidth - 2 * margin;
        rects.push({ x: margin, y: margin, width: w, height: h }); // Top
        rects.push({ x: margin, y: margin + h + gap, width: w, height: h }); // Bottom
        break;
      }
      case 3: { // 1x3 vertical stack
        const h = (pageHeight - 2 * margin - 2 * gap) / 3, w = pageWidth - 2 * margin;
        rects.push({ x: margin, y: margin, width: w, height: h }); // Top
        rects.push({ x: margin, y: margin + h + gap, width: w, height: h }); // Middle
        rects.push({ x: margin, y: margin + 2 * (h + gap), width: w, height: h }); // Bottom
        break;
      }
      case 4: { // 2x2 grid
        const h = (pageHeight - 2 * margin - gap) / 2, w = (pageWidth - 2 * margin - gap) / 2;
        rects.push({ x: margin, y: margin, width: w, height: h }); // Top-Left
        rects.push({ x: margin + w + gap, y: margin, width: w, height: h }); // Top-Right
        rects.push({ x: margin, y: margin + h + gap, width: w, height: h }); // Bottom-Left
        rects.push({ x: margin + w + gap, y: margin + h + gap, width: w, height: h }); // Bottom-Right
        break;
      }
      default: 
        rects.push({ x: margin, y: margin, width: pageWidth - 2*margin, height: pageHeight - 2*margin });
    }
    return rects;
}

async function generateMergePreview(sourceImageUrls, config) {
    const { pageSize, backgroundColor, invertColors } = config;
    const pageDimensions = getPageSize(pageSize);
    const canvas = document.createElement('canvas');
    const scale = 1.5;
    canvas.width = pageDimensions.width * scale;
    canvas.height = pageDimensions.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (invertColors) ctx.filter = 'invert(1)';
    const imagePromises = sourceImageUrls.map(url => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    }));
    const images = await Promise.all(imagePromises);
    const layoutRects = calculateLayout(images.length, canvas.width, canvas.height);
    images.forEach((img, i) => {
      const rect = layoutRects[i], imgAspectRatio = img.width / img.height, rectAspectRatio = rect.width / rect.height;
      let drawWidth, drawHeight;
      if (imgAspectRatio > rectAspectRatio) { drawWidth = rect.width; drawHeight = drawWidth / imgAspectRatio; } 
      else { drawHeight = rect.height; drawWidth = drawHeight * imgAspectRatio; }
      const drawX = rect.x + (rect.width - drawWidth) / 2, drawY = rect.y + (rect.height - drawHeight) / 2;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    });
    if (invertColors) ctx.filter = 'none';
    return canvas.toDataURL('image/jpeg', 0.9);
}

async function handleGenerateAndDownload() {
    if (!state.pdfFile || state.documentStructure.length === 0 || !PDFLib) return;
    state.isProcessing = true;
    state.processingMessage = 'Generating your new PDF...';
    state.error = null;
    render();
    try {
        const arrayBuffer = await state.pdfFile.arrayBuffer();
        const sourcePdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const newPdfDoc = await PDFLib.PDFDocument.create();

        for (const [index, page] of state.documentStructure.entries()) {
            state.processingMessage = `Processing page ${index + 1} of ${state.documentStructure.length}...`;
            if (index % 5 === 0) render();
            if (page.type === 'original') {
                if (state.globalInvert) {
                    const { width, height } = sourcePdfDoc.getPage(page.originalIndex).getSize();
                    const newPage = newPdfDoc.addPage([width, height]);
                    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'), img = new Image();
                    img.src = page.imageUrl;
                    await new Promise(r => { img.onload = r; });
                    canvas.width = img.width; canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    ctx.globalCompositeOperation = 'difference';
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    const jpgImage = await newPdfDoc.embedJpg(await fetch(canvas.toDataURL('image/jpeg', 0.9)).then(res => res.arrayBuffer()));
                    newPage.drawImage(jpgImage, { x: 0, y: 0, width, height });
                } else {
                    const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [page.originalIndex]);
                    newPdfDoc.addPage(copiedPage);
                }
            } else if (page.type === 'merged') {
                const {width, height} = getPageSize(page.pageSize);
                const newPage = newPdfDoc.addPage([width, height]);
                newPage.drawRectangle({ x:0, y:0, width, height, color: page.backgroundColor === 'black' ? PDFLib.rgb(0,0,0) : PDFLib.rgb(1,1,1) });
                const finalImage = await newPdfDoc.embedJpg(await fetch(page.imageUrl).then(r=>r.arrayBuffer()));
                if(page.invertColors !== state.globalInvert){ // XOR logic
                     const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
                     const img = new Image();
                     img.src = page.imageUrl;
                     await new Promise(r => { img.onload = r; });
                     canvas.width = img.width; canvas.height = img.height;
                     ctx.drawImage(img,0,0);
                     ctx.globalCompositeOperation = 'difference';
                     ctx.fillStyle = 'white';
                     ctx.fillRect(0,0,canvas.width, canvas.height);
                     const invertedFinal = await newPdfDoc.embedJpg(await fetch(canvas.toDataURL('image/jpeg', 0.9)).then(r=>r.arrayBuffer()));
                     newPage.drawImage(invertedFinal, {x:0, y:0, width, height});
                } else {
                     newPage.drawImage(finalImage, {x:0, y:0, width, height});
                }
            }
        }
        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${state.pdfFile.name.replace(/\.pdf$/i, '')}_modified.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
        link.remove();
        resetState();
    } catch (e) {
      console.error('PDF Generation Error:', e);
      state.error = `Failed to download PDF. Error: ${e instanceof Error ? e.message : String(e)}`;
      state.isProcessing = false;
      state.processingMessage = '';
      render();
    }
}

// --- Event Listener Setup ---
function initializeApp() {
    DOMElements.fileUploadInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    DOMElements.fileUploaderLabel.addEventListener('dragover', (e) => e.preventDefault());
    DOMElements.fileUploaderLabel.addEventListener('drop', (e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); });
    DOMElements.clearSelectionBtn.addEventListener('click', handleClearSelection);
    DOMElements.deleteBtn.addEventListener('click', handleDeleteSelected);
    DOMElements.demergeBtn.addEventListener('click', handleDemergeSelected);
    DOMElements.mergeBtn.addEventListener('click', openMergeModal);
    DOMElements.newFileBtn.addEventListener('click', resetState);
    DOMElements.pagesGrid.addEventListener('click', handlePageSelection);
    DOMElements.globalInvertCheckbox.addEventListener('change', (e) => { state.globalInvert = e.target.checked; });
    DOMElements.downloadBtn.addEventListener('click', handleGenerateAndDownload);
    DOMElements.mergeModal.addEventListener('click', (e) => { if (e.target === DOMElements.mergeModal) closeMergeModal(); });
    DOMElements.mergeModalCloseBtn.addEventListener('click', closeMergeModal);
    DOMElements.mergeModalCancelBtn.addEventListener('click', closeMergeModal);
    DOMElements.mergeModalConfirmBtn.addEventListener('click', handleConfirmMerge);
    DOMElements.pageSizeSelect.addEventListener('change', handleMergeModalConfigChange);
    DOMElements.invertColorsCheckbox.addEventListener('change', handleMergeModalConfigChange);
    DOMElements.backgroundColorGroup.addEventListener('click', handleBackgroundColorChange);
    document.getElementById('year').textContent = new Date().getFullYear();
    render();
}

document.addEventListener('DOMContentLoaded', initializeApp);
