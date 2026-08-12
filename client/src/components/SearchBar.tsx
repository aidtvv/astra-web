interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = '搜索任务…' }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-transparent bg-white px-4 py-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}
