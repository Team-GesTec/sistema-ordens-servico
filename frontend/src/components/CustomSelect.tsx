import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
}: CustomSelectProps) {
  const [open, setOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div className="custom-select" ref={wrapperRef}>
      <button
        type="button"
        className="custom-select-button"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`}></i>
      </button>

      {open && (
        <div className="custom-select-options">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`custom-option${opt.value === value ? " selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
