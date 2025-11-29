import { memo, useMemo } from "react";
import createDOMPurify from "dompurify";
import { ReaderSettings, Theme, FontFamily, FontSize } from "../types";

// --- Helper: Style Generators ---
export const getThemeClasses = (theme: Theme) => {
  switch (theme) {
    case 'dark': return 'bg-gray-900 text-gray-100 prose-invert';
    case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636] prose-amber';
    default: return 'bg-white text-gray-900 prose-gray';
  }
};

const getFontClasses = (font: FontFamily) => {
  switch (font) {
    case 'serif': return 'font-serif';
    case 'mono': return 'font-mono';
    default: return 'font-sans';
  }
};

const getSizeClasses = (size: FontSize) => {
  switch (size) {
    case 'xs': return 'prose-sm'; // Tailwind doesn't have prose-xs, map to sm or custom
    case 'small': return 'prose-base'; // Shift up slightly
    case 'medium': return 'prose-lg';
    case 'large': return 'prose-xl';
    case 'xl': return 'prose-2xl';
    case '2xl': return 'prose-2xl'; // Cap at 2xl for now
    default: return 'prose-base';
  }
};

let domPurifyInstance: ReturnType<typeof createDOMPurify> | null = null;

const getDomPurify = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!domPurifyInstance) {
    domPurifyInstance = createDOMPurify(window);
    domPurifyInstance.addHook('afterSanitizeAttributes', (node) => {
      if ('target' in node) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }
  return domPurifyInstance;
};

const ReaderViewComponent = ({
  content,
  title,
  byline,
  settings
}: {
  content: string;
  title: string;
  byline?: string | null;
  settings: ReaderSettings;
}) => {
  const sanitizedContent = useMemo(() => {
    const domPurify = getDomPurify();
    return domPurify ? domPurify.sanitize(content) : content;
  }, [content]);
  const themeClasses = getThemeClasses(settings.theme);
  const fontClasses = getFontClasses(settings.fontFamily);
  const sizeClasses = getSizeClasses(settings.fontSize);

  return (
    <div className={`min-h-full transition-colors duration-300 ${themeClasses}`}>
      <div className={`max-w-3xl mx-auto py-12 px-8 ${fontClasses}`}>
        <h1 className={`text-4xl font-bold mb-4 ${settings.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
        {byline && <p className={`mb-8 italic ${settings.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{byline}</p>}
        <div
          className={`prose max-w-none transition-all duration-300 ${sizeClasses} ${themeClasses}`}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>
    </div>
  );
};

export const ReaderView = memo(ReaderViewComponent);
