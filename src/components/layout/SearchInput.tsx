import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * Page-level search field (SMART master handoff Part 5 §4): 14px icon inset
 * 12px, `pl-8`, 36px tall, 224px wide by default. The toolbar variant
 * (16px icon, `pl-9`, 256px) lives in `TableToolbar`.
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = 'w-56',
  inputClassName = '',
  inputRef,
}) => (
  <div className={`relative ${className}`}>
    <Search
      size={14}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
    />
    <Input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`pl-8 h-9 rounded-lg text-xs ${inputClassName}`}
    />
  </div>
);
