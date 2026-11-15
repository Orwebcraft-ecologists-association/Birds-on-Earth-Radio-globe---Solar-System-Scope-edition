import React, { useState, useEffect, useRef } from 'react';

interface Item {
    value: string;
    label: string;
}

interface SearchableDropdownProps {
    items: Item[];
    placeholder: string;
    textValue: string;
    onTextChange: (value: string) => void;
    onItemSelect: (item: Item) => void;
    id: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    items,
    placeholder,
    textValue,
    onTextChange,
    onItemSelect,
    id
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredItems = textValue
        ? items.filter(item => item.label.toLowerCase().includes(textValue.toLowerCase()))
        : [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (item: Item) => {
        onItemSelect(item);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                id={id}
                type="text"
                placeholder={placeholder}
                value={textValue}
                onChange={e => onTextChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
                className="w-full bg-slate-700/50 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoComplete="off"
            />
            {isOpen && textValue && filteredItems.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md max-h-48 overflow-y-auto shadow-lg">
                    {filteredItems.slice(0, 50).map(item => ( // Limit to 50 results for performance
                        <li
                            key={item.value}
                            onClick={() => handleSelect(item)}
                            className="px-3 py-2 text-sm text-slate-200 hover:bg-blue-600 cursor-pointer truncate"
                             title={item.label}
                        >
                            {item.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchableDropdown;
