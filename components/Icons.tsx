
import React from 'react';

interface IconProps {
  className?: string;
}

const EmojiIcon: React.FC<{ emoji: string, className?: string }> = ({ emoji, className = "" }) => (
  <span className={`inline-flex items-center justify-center leading-none select-none transition-transform duration-200 hover:scale-110 ${className}`} role="img" aria-hidden="true">
    {emoji}
  </span>
);

// SVG-based Chevron for a clean, professional look
const ChevronIcon: React.FC<{ className?: string, points: string }> = ({ className = "", points }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.0" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`w-3 h-3 transition-transform duration-200 ${className}`}
  >
    <polyline points={points} />
  </svg>
);

export const FolderIcon = (props: IconProps) => <EmojiIcon emoji="📂" {...props} />;
export const FileIcon = (props: IconProps) => <EmojiIcon emoji="📄" {...props} />;
export const ChevronRight = ({ className = "" }: IconProps) => (
  <ChevronIcon points="12 18 15 12 12 6" className={className} />
);
export const ChevronDown = ({ className = "" }: IconProps) => (
  <ChevronIcon points="9 10 12 15 15 10" className={className} />
);
export const SaveIcon = (props: IconProps) => <EmojiIcon emoji="💾" {...props} />;
export const PlusIcon = (props: IconProps) => <EmojiIcon emoji="➕" {...props} />;
export const TrashIcon = (props: IconProps) => <EmojiIcon emoji="🗑️" {...props} />;
export const SearchIcon = (props: IconProps) => <EmojiIcon emoji="🔍" {...props} />;
export const EyeIcon = (props: IconProps) => <EmojiIcon emoji="👁️" {...props} />;
export const LinkIcon = (props: IconProps) => <EmojiIcon emoji="🔗" {...props} />;
export const DragHandleIcon = (props: IconProps) => <EmojiIcon emoji="⠿" {...props} />;
export const ChartBarIcon = (props: IconProps) => <EmojiIcon emoji="📊" {...props} />;
export const ChartPieIcon = (props: IconProps) => <EmojiIcon emoji="🥧" {...props} />;
export const FilterIcon = (props: IconProps) => <EmojiIcon emoji="🌪️" {...props} />;
export const CheckCircleIcon = (props: IconProps) => <EmojiIcon emoji="✅" {...props} />;
export const LibraryIcon = (props: IconProps) => <EmojiIcon emoji="📚" {...props} />;
export const CubeIcon = (props: IconProps) => <EmojiIcon emoji="📦" {...props} />;
export const ArrowUpTrayIcon = (props: IconProps) => <EmojiIcon emoji="📤" {...props} />;
export const ArrowDownTrayIcon = (props: IconProps) => <EmojiIcon emoji="📥" {...props} />;
export const ArrowPathIcon = (props: IconProps) => <EmojiIcon emoji="🔄" {...props} />;
export const LockClosedIcon = (props: IconProps) => <EmojiIcon emoji="🔒" {...props} />;
export const UserIcon = (props: IconProps) => <EmojiIcon emoji="👤" {...props} />;
export const ArrowRightOnRectangleIcon = (props: IconProps) => <EmojiIcon emoji="🚪" {...props} />;
export const UserGroupIcon = (props: IconProps) => <EmojiIcon emoji="👥" {...props} />;
export const XMarkIcon = (props: IconProps) => <EmojiIcon emoji="❌" {...props} />;
export const Cog6ToothIcon = (props: IconProps) => <EmojiIcon emoji="⚙️" {...props} />;
export const ClipboardDocumentIcon = (props: IconProps) => <EmojiIcon emoji="📋" {...props} />;
export const ClipboardDocumentCheckIcon = (props: IconProps) => <EmojiIcon emoji="📝" {...props} />;
export const ZoomInIcon = (props: IconProps) => <EmojiIcon emoji="➕" {...props} />;
export const ZoomOutIcon = (props: IconProps) => <EmojiIcon emoji="➖" {...props} />;
export const ResetIcon = (props: IconProps) => <EmojiIcon emoji="🎯" {...props} />;
export const ExclamationTriangleIcon = (props: IconProps) => <EmojiIcon emoji="⚠️" {...props} />;
export const GridIcon = (props: IconProps) => <EmojiIcon emoji="▦" {...props} />;
export const TagIcon = (props: IconProps) => <EmojiIcon emoji="🏷️" {...props} />;
