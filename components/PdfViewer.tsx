
import React from 'react';
import { TrashIcon, DownloadIcon, CheckCircleIcon, PdfFileIcon, MergeIcon, DemergeIcon } from './icons';
import type { DocumentPage, MergedPage, OriginalPage } from '../App';

interface PageThumbnailProps {
  pageNumber: number;
  imageUrl: string;
  isSelected: boolean;
  onSelect: () => void;
}

const PageThumbnail: React.FC<PageThumbnailProps> = ({ pageNumber, imageUrl, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`relative rounded-lg shadow-md overflow-hidden cursor-pointer group transition-all duration-200 transform hover:scale-105 ${isSelected ? 'ring-4 ring-blue-500' : 'ring-2 ring-transparent dark:ring-gray-700'}`}
    >
      <img src={imageUrl} alt={`Page ${pageNumber}`} className="w-full h-auto" />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-40 flex items-center justify-center">
          <CheckCircleIcon className="w-12 h-12 text-white" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 bg-gray-800 bg-opacity-75 text-white text-xs font-bold px-2 py-1 rounded-tr-lg">
        {pageNumber}
      </div>
    </div>
  );
};


interface MergedPageThumbnailProps {
  pageNumber: number;
  page: MergedPage;
  isSelected: boolean;
  onSelect: () => void;
}

const MergedPageThumbnail: React.FC<MergedPageThumbnailProps> = ({ pageNumber, page, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`relative rounded-lg shadow-md overflow-hidden cursor-pointer group transition-all duration-200 transform hover:scale-105 ${isSelected ? 'ring-4 ring-blue-500' : 'ring-2 ring-transparent dark:ring-gray-700'}`}
    >
      <img src={page.imageUrl} alt={`Merged Page ${pageNumber}`} className="w-full h-auto border-2 border-dashed border-blue-400" />
       <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200"></div>
       {isSelected && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-40 flex items-center justify-center">
          <CheckCircleIcon className="w-12 h-12 text-white" />
        </div>
      )}
      <div className="absolute top-1 right-1 bg-blue-500 text-white p-1 rounded-full">
        <MergeIcon className="w-4 h-4" />
      </div>
      <div className="absolute bottom-0 left-0 bg-gray-800 bg-opacity-75 text-white text-xs font-bold px-2 py-1 rounded-tr-lg">
        {pageNumber}
      </div>
       <div className="absolute top-1 left-1 bg-gray-800 bg-opacity-75 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
        Merged: {page.sourceIndices.map(i => i + 1).join(', ')}
      </div>
    </div>
  );
};


interface PdfViewerProps {
  fileName: string;
  pages: DocumentPage[];
  selectedIds: Set<string>;
  onPageSelect: (pageId: string) => void;
  onGenerateAndDownload: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onMergeSelected: () => void;
  onDemergeSelected: () => void;
  onNewFile: () => void;
  isProcessing: boolean;
  globalInvert: boolean;
  onGlobalInvertChange: (inverted: boolean) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  fileName,
  pages,
  selectedIds,
  onPageSelect,
  onGenerateAndDownload,
  onClearSelection,
  onDeleteSelected,
  onMergeSelected,
  onDemergeSelected,
  onNewFile,
  isProcessing,
  globalInvert,
  onGlobalInvertChange,
}) => {
  const selectionCount = selectedIds.size;
  const selectedPage = selectionCount === 1 ? pages.find(p => selectedIds.has(p.id)) : undefined;

  const canMerge = selectionCount >= 2 && selectionCount <= 4 && Array.from(selectedIds).every(id => pages.find(p => p.id === id)?.type === 'original');
  const canDelete = selectionCount > 0;
  const canDemerge = selectionCount === 1 && selectedPage?.type === 'merged';

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 z-10 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <PdfFileIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
            <p className="font-semibold text-lg truncate" title={fileName}>{fileName}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {selectionCount} of {pages.length} pages selected
            </span>
            <button
                onClick={onClearSelection}
                disabled={selectionCount === 0}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
                Clear Selection
            </button>
             <button
                onClick={onDeleteSelected}
                disabled={!canDelete}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-600 dark:hover:bg-red-700 transition-colors flex items-center gap-1.5"
            >
                <TrashIcon className="w-4 h-4" /> Delete
            </button>
            <button
                onClick={onDemergeSelected}
                disabled={!canDemerge}
                className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-orange-600 dark:hover:bg-orange-700 transition-colors flex items-center gap-1.5"
            >
                <DemergeIcon className="w-4 h-4" /> Demerge
            </button>
             <button
                onClick={onMergeSelected}
                disabled={!canMerge}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
                <MergeIcon className="w-4 h-4" /> Merge
            </button>
            <button
              onClick={onNewFile}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors"
            >
              Load New PDF
            </button>
          </div>
        </div>
      </header>

      <div className="flex-grow p-4 md:p-8 overflow-y-auto bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pages.map((page, index) => {
            if (page.type === 'original') {
              return (
                <PageThumbnail
                  key={page.id}
                  pageNumber={index + 1}
                  imageUrl={page.imageUrl}
                  isSelected={selectedIds.has(page.id)}
                  onSelect={() => onPageSelect(page.id)}
                />
              );
            } else { // 'merged'
              return (
                 <MergedPageThumbnail
                  key={page.id}
                  pageNumber={index + 1}
                  page={page}
                  isSelected={selectedIds.has(page.id)}
                  onSelect={() => onPageSelect(page.id)}
                />
              )
            }
          })}
        </div>
      </div>
      
      <footer className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 z-10 shadow-up">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex items-start">
                <div className="flex items-center h-5">
                    <input
                        id="global-invert"
                        aria-describedby="global-invert-description"
                        name="global-invert"
                        type="checkbox"
                        checked={globalInvert}
                        onChange={e => onGlobalInvertChange(e.target.checked)}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="global-invert" className="font-medium text-gray-700 dark:text-gray-300">
                        Invert Colors for Entire PDF
                    </label>
                    <p id="global-invert-description" className="text-gray-500 dark:text-gray-400 text-xs">
                        Good for printing. May slightly reduce quality.
                    </p>
                </div>
            </div>
            <button
              onClick={onGenerateAndDownload}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 text-lg font-bold text-white bg-green-600 rounded-lg shadow-lg hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
              <span>Apply Changes & Download</span>
              <DownloadIcon className="w-6 h-6" />
            </button>
        </div>
      </footer>
    </div>
  );
};

export default PdfViewer;
