import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CloseIcon, MergeIcon } from './icons';
import type { PageSize, MergeBackgroundColor, MergeConfig } from '../App';

interface MergeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: MergeConfig) => void;
  pageImageUrls: string[];
  generatePreview: (sourceImageUrls: string[], config: MergeConfig) => Promise<string>;
}

const MergeConfigModal: React.FC<MergeConfigModalProps> = ({ isOpen, onClose, onConfirm, pageImageUrls, generatePreview }) => {
  const [pageSize, setPageSize] = useState<PageSize>('A4_portrait');
  const [backgroundColor, setBackgroundColor] = useState<MergeBackgroundColor>('white');
  const [invertColors, setInvertColors] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentConfig = { pageSize, backgroundColor, invertColors };

  const updatePreview = useCallback(async () => {
    if (pageImageUrls.length > 0) {
      setIsLoadingPreview(true);
      try {
        const url = await generatePreview(pageImageUrls, currentConfig);
        setPreviewUrl(url);
      } catch (error) {
        console.error("Failed to generate merge preview:", error);
        setPreviewUrl('');
      } finally {
        setIsLoadingPreview(false);
      }
    }
  }, [pageImageUrls, generatePreview, pageSize, backgroundColor, invertColors]);

  useEffect(() => {
    if (isOpen) {
      updatePreview();
    }
  }, [isOpen, updatePreview]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(currentConfig);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      aria-labelledby="merge-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 id="merge-modal-title" className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MergeIcon className="w-6 h-6 text-blue-500"/>
            Merge Pages Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400"
            aria-label="Close modal"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="page-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Output Page Size
              </label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              >
                <option value="A4_portrait">A4 (Portrait)</option>
                <option value="A4_landscape">A4 (Landscape)</option>
                <option value="Letter_portrait">Letter (Portrait)</option>
                <option value="Letter_landscape">Letter (Landscape)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Background Color
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                  <button type="button" onClick={() => setBackgroundColor('white')} className={`relative inline-flex items-center justify-center w-1/2 px-4 py-2 rounded-l-md border text-sm font-medium focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${backgroundColor === 'white' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'}`}>
                      White
                  </button>
                  <button type="button" onClick={() => setBackgroundColor('black')} className={`relative -ml-px inline-flex items-center justify-center w-1/2 px-4 py-2 rounded-r-md border text-sm font-medium focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${backgroundColor === 'black' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'}`}>
                      Black
                  </button>
              </div>
            </div>
          </div>
          
          <div className="relative flex items-start">
            <div className="flex items-center h-5">
              <input
                id="invert-colors"
                aria-describedby="invert-colors-description"
                name="invert-colors"
                type="checkbox"
                checked={invertColors}
                onChange={e => setInvertColors(e.target.checked)}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="invert-colors" className="font-medium text-gray-700 dark:text-gray-300">
                Invert Page Colors
              </label>
              <p id="invert-colors-description" className="text-gray-500 dark:text-gray-400">
                Good for printing. May slightly reduce visual quality.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Layout Preview</h3>
            <div className="w-full h-80 bg-gray-200 dark:bg-gray-700/50 rounded-md flex items-center justify-center border border-dashed dark:border-gray-600 p-2">
              {isLoadingPreview ? (
                <div className="w-8 h-8 border-2 border-blue-500 border-dashed rounded-full animate-spin"></div>
              ) : (
                <img src={previewUrl} alt="Merge preview" className="max-w-full max-h-full object-contain shadow-md"/>
              )}
            </div>
          </div>
        </div>

        <footer className="flex justify-end p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              type="button"
              className="inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <MergeIcon className="w-5 h-5"/>
              Confirm Merge
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MergeConfigModal;
