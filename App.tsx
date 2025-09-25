
import React, { useState, useCallback, useEffect } from 'react';
import FileUploader from './components/FileUploader';
import PdfViewer from './components/PdfViewer';
import MergeConfigModal from './components/MergeConfigModal';

// Access PDF libraries from the window object (loaded via CDN)
const { pdfjsLib, PDFLib } = window as any;

export type PageSize = 'A4_portrait' | 'A4_landscape' | 'Letter_portrait' | 'Letter_landscape';
export type MergeBackgroundColor = 'white' | 'black';

export interface MergeConfig {
  pageSize: PageSize;
  backgroundColor: MergeBackgroundColor;
  invertColors: boolean;
}

export interface OriginalPage {
  type: 'original';
  id: string; // originalIndex as string
  originalIndex: number;
  imageUrl: string;
}

export interface MergedPage {
  type: 'merged';
  id: string; // unique id
  sourceIndices: number[];
  imageUrl: string;
  pageSize: PageSize;
  backgroundColor: MergeBackgroundColor;
  invertColors: boolean;
}

export type DocumentPage = OriginalPage | MergedPage;

const App: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [originalPageImages, setOriginalPageImages] = useState<string[]>([]);
  const [documentStructure, setDocumentStructure] = useState<DocumentPage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [isMergeModalOpen, setMergeModalOpen] = useState(false);
  const [globalInvert, setGlobalInvert] = useState(false);
  
  const resetState = useCallback(() => {
    setPdfFile(null);
    setOriginalPageImages([]);
    setDocumentStructure([]);
    setSelectedIds(new Set());
    setIsProcessing(false);
    setError(null);
    setProcessingMessage('');
    setMergeModalOpen(false);
    setGlobalInvert(false);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type === 'application/pdf') {
      resetState();
      setPdfFile(file);
    } else {
      setError('Please select a valid PDF file.');
    }
  }, [resetState]);

  const processPdfToImages = useCallback(async () => {
    if (!pdfFile || !pdfjsLib) return;

    setIsProcessing(true);
    setProcessingMessage('Loading your PDF...');
    setError(null);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const urls: string[] = [];
      const initialStructure: DocumentPage[] = [];

      for (let i = 1; i <= numPages; i++) {
        setProcessingMessage(`Rendering page ${i} of ${numPages}...`);
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
      setOriginalPageImages(urls);
      setDocumentStructure(initialStructure);
    } catch (e) {
      console.error(e);
      setError('Could not read or render the PDF file. It might be corrupted or protected.');
      resetState();
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, [pdfFile, resetState]);

  useEffect(() => {
    if(pdfFile && documentStructure.length === 0) {
      processPdfToImages();
    }
  }, [pdfFile, documentStructure, processPdfToImages]);

  const toggleSelection = useCallback((pageId: string) => {
    setSelectedIds(prevSelected => {
      const newSelection = new Set(prevSelected);
      if (newSelection.has(pageId)) {
        newSelection.delete(pageId);
      } else {
        newSelection.add(pageId);
      }
      return newSelection;
    });
  }, []);
  
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setDocumentStructure(prev => prev.filter(page => !selectedIds.has(page.id)));
    handleClearSelection();
  }, [selectedIds, handleClearSelection]);

  const handleDemergeSelected = useCallback(() => {
    if (selectedIds.size !== 1) return;

    const selectedId = selectedIds.values().next().value;
    const pageToDemerge = documentStructure.find(p => p.id === selectedId);

    if (!pageToDemerge || pageToDemerge.type !== 'merged') return;

    const originalPagesToRestore: OriginalPage[] = pageToDemerge.sourceIndices.map(originalIndex => ({
        type: 'original',
        id: `${originalIndex}`,
        originalIndex,
        imageUrl: originalPageImages[originalIndex],
    }));

    setDocumentStructure(prev => {
        const newStructure: DocumentPage[] = [];
        const indexToReplace = prev.findIndex(p => p.id === selectedId);
        
        if (indexToReplace === -1) return prev; // Should not happen

        // Replace the merged page with the original pages
        newStructure.push(...prev.slice(0, indexToReplace));
        newStructure.push(...originalPagesToRestore);
        newStructure.push(...prev.slice(indexToReplace + 1));
        
        return newStructure;
    });

    handleClearSelection();
  }, [selectedIds, documentStructure, originalPageImages, handleClearSelection]);

  const handleOpenMergeModal = useCallback(() => {
    if (selectedIds.size < 2 || selectedIds.size > 4) {
        setError("Please select 2 to 4 pages to merge.");
        return;
    }
    setError(null);
    setMergeModalOpen(true);
  }, [selectedIds]);

  const getPageSize = (pageSize: PageSize): {width: number, height: number} => {
    const A4 = PDFLib.PageSizes.A4; // [width, height]
    const Letter = PDFLib.PageSizes.Letter;
    switch(pageSize) {
        case 'A4_portrait': return { width: A4[0], height: A4[1] };
        case 'A4_landscape': return { width: A4[1], height: A4[0] };
        case 'Letter_portrait': return { width: Letter[0], height: Letter[1] };
        case 'Letter_landscape': return { width: Letter[1], height: Letter[0] };
    }
  }

  const calculateLayout = (count: number, pageWidth: number, pageHeight: number) => {
    const rects: {x: number, y: number, width: number, height: number}[] = [];
    const margin = 15;
    const gap = 10;
  
    switch(count) {
      case 2: { // 1x2 vertical stack
        const h = (pageHeight - 2 * margin - gap) / 2;
        const w = pageWidth - 2 * margin;
        rects.push({ x: margin, y: margin, width: w, height: h }); // Top
        rects.push({ x: margin, y: margin + h + gap, width: w, height: h }); // Bottom
        break;
      }
      case 3: { // 1x3 vertical stack
        const h = (pageHeight - 2 * margin - 2 * gap) / 3;
        const w = pageWidth - 2 * margin;
        rects.push({ x: margin, y: margin, width: w, height: h }); // Top
        rects.push({ x: margin, y: margin + h + gap, width: w, height: h }); // Middle
        rects.push({ x: margin, y: margin + 2 * (h + gap), width: w, height: h }); // Bottom
        break;
      }
      case 4: { // 2x2 grid
        const h = (pageHeight - 2 * margin - gap) / 2;
        const w = (pageWidth - 2 * margin - gap) / 2;
        rects.push({ x: margin, y: margin, width: w, height: h }); // Top-Left
        rects.push({ x: margin + w + gap, y: margin, width: w, height: h }); // Top-Right
        rects.push({ x: margin, y: margin + h + gap, width: w, height: h }); // Bottom-Left
        rects.push({ x: margin + w + gap, y: margin + h + gap, width: w, height: h }); // Bottom-Right
        break;
      }
      default: // Fallback for 1 page, though merge needs 2+
        rects.push({ x: margin, y: margin, width: pageWidth - 2*margin, height: pageHeight - 2*margin });
    }
    return rects;
  };

  const generateMergePreview = useCallback(async (sourceImageUrls: string[], config: MergeConfig): Promise<string> => {
    const { pageSize, backgroundColor, invertColors } = config;
    const pageDimensions = getPageSize(pageSize);
    const canvas = document.createElement('canvas');
    const scale = 1.5; // Generate a higher-resolution image for better quality
    canvas.width = pageDimensions.width * scale;
    canvas.height = pageDimensions.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
  
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (invertColors) {
      ctx.filter = 'invert(1)';
    }
  
    const imagePromises = sourceImageUrls.map(url => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    }));
  
    const images = await Promise.all(imagePromises);
    const layoutRects = calculateLayout(images.length, canvas.width, canvas.height);
  
    images.forEach((img, i) => {
      const rect = layoutRects[i];
      const imgAspectRatio = img.width / img.height;
      const rectAspectRatio = rect.width / rect.height;
      let drawWidth, drawHeight;
  
      if (imgAspectRatio > rectAspectRatio) {
        drawWidth = rect.width;
        drawHeight = drawWidth / imgAspectRatio;
      } else {
        drawHeight = rect.height;
        drawWidth = drawHeight * imgAspectRatio;
      }
  
      const drawX = rect.x + (rect.width - drawWidth) / 2;
      const drawY = rect.y + (rect.height - drawHeight) / 2;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    });

    if (invertColors) {
        ctx.filter = 'none'; // Reset filter
    }
  
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const handleConfirmMerge = useCallback(async (config: MergeConfig) => {
    const { pageSize, backgroundColor, invertColors } = config;

    const selectedPages = documentStructure.filter(p => selectedIds.has(p.id));
    const sourceIndices: number[] = [];
    const sourceImageUrls: string[] = [];

    for (const p of selectedPages) {
        if (p.type === 'original') {
            sourceIndices.push(p.originalIndex);
            sourceImageUrls.push(p.imageUrl);
        } else if (p.type === 'merged') {
            setError("Merging already merged pages is not supported yet. Please unselect merged pages.");
            setMergeModalOpen(false);
            return;
        }
    }

    if (error) return;

    setIsProcessing(true);
    setProcessingMessage('Creating merged page preview...');
    
    const newImageUrl = await generateMergePreview(sourceImageUrls, config);

    const newMergedPage: MergedPage = {
        type: 'merged',
        id: crypto.randomUUID(),
        sourceIndices,
        imageUrl: newImageUrl,
        pageSize,
        backgroundColor,
        invertColors,
    };

    setDocumentStructure(prev => {
        const newStructure: DocumentPage[] = [];
        const firstSelectedIndex = prev.findIndex(p => selectedIds.has(p.id));
        
        prev.forEach((page, index) => {
            if (!selectedIds.has(page.id)) {
                newStructure.push(page);
            } else if (index === firstSelectedIndex) {
                newStructure.push(newMergedPage);
            }
        });
        return newStructure;
    });

    handleClearSelection();
    setMergeModalOpen(false);
    setIsProcessing(false);
    setProcessingMessage('');
  }, [documentStructure, selectedIds, handleClearSelection, generateMergePreview, error]);
  
  const handleGenerateAndDownload = useCallback(async () => {
    if (!pdfFile || documentStructure.length === 0 || !PDFLib) return;

    setIsProcessing(true);
    setProcessingMessage('Generating your new PDF...');
    setError(null);

    try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const sourcePdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const newPdfDoc = await PDFLib.PDFDocument.create();

        for (const [index, page] of documentStructure.entries()) {
            setProcessingMessage(`Processing page ${index + 1} of ${documentStructure.length}...`);
            
            if (page.type === 'original') {
                if (globalInvert) {
                    const sourcePage = sourcePdfDoc.getPage(page.originalIndex);
                    const { width, height } = sourcePage.getSize();
                    const newPage = newPdfDoc.addPage([width, height]);

                    const img = new Image();
                    img.src = page.imageUrl;
                    await new Promise(r => { img.onload = r; });
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;

                    ctx.drawImage(img, 0, 0);
                    ctx.globalCompositeOperation = 'difference';
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    const invertedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    const jpgImageBytes = await fetch(invertedDataUrl).then(res => res.arrayBuffer());
                    const jpgImage = await newPdfDoc.embedJpg(jpgImageBytes);
                    
                    newPage.drawImage(jpgImage, { x: 0, y: 0, width, height });

                } else {
                    const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [page.originalIndex]);
                    newPdfDoc.addPage(copiedPage);
                }
            } else if (page.type === 'merged') {
                const shouldInvertFinal = page.invertColors !== globalInvert; // XOR
                const {width, height} = getPageSize(page.pageSize);
                const newPage = newPdfDoc.addPage([width, height]);

                newPage.drawRectangle({
                    x: 0, y: 0, width, height,
                    color: page.backgroundColor === 'black' ? PDFLib.rgb(0,0,0) : PDFLib.rgb(1,1,1),
                });
                
                if (shouldInvertFinal) {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = width * 1.5;
                    tempCanvas.height = height * 1.5;
                    const tempCtx = tempCanvas.getContext('2d');
                    if(!tempCtx) continue;

                    const sourceImageUrls = page.sourceIndices.map(i => originalPageImages[i]);
                    const imagePromises = sourceImageUrls.map(url => new Promise<HTMLImageElement>((resolve, reject) => {
                      const img = new Image();
                      img.onload = () => resolve(img);
                      img.onerror = reject;
                      img.src = url;
                    }));
                    const images = await Promise.all(imagePromises);
                    const layoutRects = calculateLayout(images.length, tempCanvas.width, tempCanvas.height);
                    
                    images.forEach((img, i) => {
                      const rect = layoutRects[i];
                      const imgAspectRatio = img.width / img.height;
                      const rectAspectRatio = rect.width / rect.height;
                      let drawWidth, drawHeight;
                      if (imgAspectRatio > rectAspectRatio) {
                        drawWidth = rect.width;
                        drawHeight = drawWidth / imgAspectRatio;
                      } else {
                        drawHeight = rect.height;
                        drawWidth = drawHeight * imgAspectRatio;
                      }
                      const drawX = rect.x + (rect.width - drawWidth) / 2;
                      const drawY = rect.y + (rect.height - drawHeight) / 2;
                      tempCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                    });

                    tempCtx.globalCompositeOperation = 'difference';
                    tempCtx.fillStyle = 'white';
                    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                    const invertedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
                    const jpgImageBytes = await fetch(invertedDataUrl).then(res => res.arrayBuffer());
                    const jpgImage = await newPdfDoc.embedJpg(jpgImageBytes);
                    newPage.drawImage(jpgImage, { x: 0, y: 0, width, height });

                } else {
                    const sourcePagesToEmbed = page.sourceIndices.map(index => sourcePdfDoc.getPage(index));
                    const embeddedPages = await newPdfDoc.embedPages(sourcePagesToEmbed);
                    const layoutRects = calculateLayout(embeddedPages.length, width, height);
                    
                    embeddedPages.forEach((p, i) => {
                      const rect = layoutRects[i];
                      const pSize = p.size();
                      const scale = Math.min(rect.width / pSize.width, rect.height / pSize.height);
                      const pWidth = pSize.width * scale;
                      const pHeight = pSize.height * scale;
    
                      newPage.drawPage(p, {
                        x: rect.x + (rect.width - pWidth) / 2,
                        y: rect.y + (rect.height - pHeight) / 2,
                        width: pWidth,
                        height: pHeight,
                      });
                    });
                }
            }
        }

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const originalName = pdfFile.name.replace(/\.pdf$/i, '');
        link.download = `${originalName}_modified.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        resetState();

    } catch (e) {
      console.error('PDF Generation Error:', e);
      setError(`Failed to process and download the PDF. Error: ${e instanceof Error ? e.message : String(e)}`);
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, [pdfFile, documentStructure, resetState, globalInvert, originalPageImages]);


  const selectedPagesForModal = documentStructure.filter(p => selectedIds.has(p.id) && p.type === 'original').map(p => p.imageUrl);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex flex-col items-center p-4 font-sans">
      <header className="w-full max-w-6xl text-center mb-6">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">PDF Page Editor</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          Delete, merge, and re-order pages from your PDF documents entirely in your browser.
        </p>
      </header>

      <main className="w-full max-w-6xl flex-grow flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
        {error && (
            <div className="m-4 p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 rounded-lg" role="alert">
                <p><span className="font-bold">Error:</span> {error}</p>
            </div>
        )}

        {isProcessing && (
            <div className="flex-grow flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                <p className="mt-4 text-lg font-semibold">{processingMessage}</p>
            </div>
        )}

        {!isProcessing && !pdfFile && <FileUploader onFileSelect={handleFileSelect} />}
        
        {!isProcessing && pdfFile && documentStructure.length > 0 && (
          <PdfViewer
            fileName={pdfFile.name}
            pages={documentStructure}
            selectedIds={selectedIds}
            onPageSelect={toggleSelection}
            onGenerateAndDownload={handleGenerateAndDownload}
            onClearSelection={handleClearSelection}
            onDeleteSelected={handleDeleteSelected}
            onMergeSelected={handleOpenMergeModal}
            onDemergeSelected={handleDemergeSelected}
            onNewFile={resetState}
            isProcessing={isProcessing}
            globalInvert={globalInvert}
            onGlobalInvertChange={setGlobalInvert}
          />
        )}
      </main>
      
      {isMergeModalOpen && (
        <MergeConfigModal
          isOpen={isMergeModalOpen}
          onClose={() => setMergeModalOpen(false)}
          onConfirm={handleConfirmMerge}
          pageImageUrls={selectedPagesForModal}
          generatePreview={generateMergePreview}
        />
      )}

      <footer className="w-full max-w-6xl text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
        <p>Your files are processed locally in your browser and are never uploaded to any server.</p>
        <p>&copy; {new Date().getFullYear()} PDF Page Editor. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
