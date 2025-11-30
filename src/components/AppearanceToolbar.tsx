import { useState, useEffect, useRef } from 'react';
import { ReaderSettings, FontFamily, FontSize } from '../types';

export const AppearanceToolbar = ({
  settings,
  onUpdate,
}: {
  settings: ReaderSettings;
  onUpdate: (s: Partial<ReaderSettings>) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    const sizes: FontSize[] = ['xs', 'small', 'medium', 'large', 'xl', '2xl'];
    if (sizes[val]) {
      onUpdate({ fontSize: sizes[val] });
    }
  };

  const getSliderValue = () => {
    const sizes: FontSize[] = ['xs', 'small', 'medium', 'large', 'xl', '2xl'];
    return sizes.indexOf(settings.fontSize);
  };

  return (
    <div className="relative" ref={toolbarRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-gray-800 text-gray-200' : 'hover:bg-gray-800 text-gray-400'}`}
        title="Appearance Settings"
      >
        <span className="text-xl font-serif">Aa</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-4 z-50 flex flex-col gap-4">
          {/* Font Family */}
          <div className="flex bg-gray-900 rounded-lg p-1">
            {(['sans', 'serif', 'mono'] as FontFamily[]).map((font) => (
              <button
                key={font}
                onClick={() => onUpdate({ fontFamily: font })}
                className={`flex-1 py-1 rounded-md text-sm capitalize transition-colors ${
                  settings.fontFamily === font
                    ? 'bg-gray-700 shadow-sm text-blue-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {font}
              </button>
            ))}
          </div>

          {/* Font Size */}
          <div className="flex flex-col px-2 gap-2">
            <div className="flex justify-between text-xs text-gray-400 font-medium uppercase tracking-wider">
              <span>Size</span>
              <span>{getSliderValue() * 20 + 60}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-bold">A</span>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={getSliderValue()}
                onChange={handleFontSizeChange}
                className="flex-grow h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xl text-gray-500 font-bold">A</span>
            </div>
          </div>

          {/* Theme */}
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ theme: 'light' })}
              className={`flex-1 h-8 rounded-full border ${settings.theme === 'light' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-600'} bg-white`}
              title="Light"
            />
            <button
              onClick={() => onUpdate({ theme: 'sepia' })}
              className={`flex-1 h-8 rounded-full border ${settings.theme === 'sepia' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[#e3dccb]'} bg-[#f4ecd8]`}
              title="Sepia"
            />
            <button
              onClick={() => onUpdate({ theme: 'dark' })}
              className={`flex-1 h-8 rounded-full border ${settings.theme === 'dark' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-600'} bg-gray-900`}
              title="Dark"
            />
          </div>
        </div>
      )}
    </div>
  );
};
