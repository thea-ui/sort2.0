import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

/** Canonical search box (SMART `SearchInput` parity, SORT tokens). */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
  inputRef,
}) => (
  <div className={`relative ${className}`}>
    <Search
      size={14}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-strong)]/40 pointer-events-none"
    />
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white border border-[var(--primary)]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-strong)] outline-none focus:border-[var(--accent)] shadow-xs ${inputClassName}`}
    />
  </div>
);
