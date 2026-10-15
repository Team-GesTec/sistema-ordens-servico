import { useEffect, useRef, useState } from "react";

export interface SelectOption {
    value: string | number;
    label: string;
}

interface CustomSelectProps {
    options: SelectOption[];
    value: string | number | null;
    onChange: (value: string | number) => void;
    placeholder: string;
    className?: string;
}

export default function CustomSelect({
    options,
    value,
    onChange,
    placeholder,
    className = "",
}: CustomSelectProps) {
    const [open, setOpen] = useState<boolean>(false);

    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(
                    event.target as Node,
                )
            ) {
                setOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleClickOutside,
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside,
            );
        };
    }, []);

    const selected = options.find(
        (option) => option.value === value,
    );

    return (
        <div
            className={`custom-select ${className}`}
            ref={wrapperRef}
        >
            <button
                type="button"
                className="custom-select-button"
                onClick={() => setOpen((prev) => !prev)}
            >
                <span>
                    {selected
                        ? selected.label
                        : placeholder}
                </span>

                <i
                    className={`fa-solid fa-chevron-${
                        open ? "up" : "down"
                    }`}
                ></i>
            </button>

            {open && (
                <div className="custom-select-options">
                    {options.map((option) => (
                        <button
                            type="button"
                            key={option.value}
                            className={`custom-option${
                                option.value === value
                                    ? " selected"
                                    : ""
                            }`}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}