interface Option {
  id: string;
  name: string;
}

export function MultiSelectChips({
  name,
  options,
  defaultValue = [],
}: {
  name: string;
  options: Option[];
  defaultValue?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((option) => {
        const checked = defaultValue.includes(option.id);
        return (
          <label
            key={option.id}
            className="has-checked:border-primary-500 has-checked:bg-primary-50 has-checked:text-primary-800 dark:has-checked:bg-primary-950 dark:has-checked:text-primary-200 flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <input
              type="checkbox"
              name={name}
              value={option.id}
              defaultChecked={checked}
              className="sr-only"
            />
            {option.name}
          </label>
        );
      })}
    </div>
  );
}

export function selectedChipValues(container: HTMLElement, name: string): string[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)).map(
    (input) => input.value,
  );
}
