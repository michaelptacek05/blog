'use client';

import { useActionState, useState } from 'react';
import { CategoryIcon } from '@/components/category-icon';
import type { Category } from '@/db/schema';
import { ICON_KEYS } from '@/lib/category-icons';
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryFormState,
} from './actions';

const INITIAL: CategoryFormState = {};

const inputClass =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900';

function IconPicker({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [selected, setSelected] = useState(defaultValue ?? ICON_KEYS[0]);

  return (
    <div className="flex flex-wrap gap-1">
      <input type="hidden" name={name} value={selected} />
      {ICON_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setSelected(key)}
          aria-label={key}
          aria-pressed={selected === key}
          className={`rounded-md border p-2 transition-colors ${
            selected === key
              ? 'border-neutral-900 dark:border-white'
              : 'border-neutral-300 text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:hover:text-white'
          }`}
        >
          <CategoryIcon icon={key} />
        </button>
      ))}
    </div>
  );
}

function EditRow({ category, postCount }: { category: Category; postCount: number }) {
  const [state, formAction, pending] = useActionState(updateCategoryAction, INITIAL);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <li className="flex items-center gap-3 border-b border-neutral-200 py-3 dark:border-neutral-800">
        <CategoryIcon icon={category.icon} className="text-neutral-500" />
        <span className="font-medium">{category.name}</span>
        <span className="font-mono text-xs text-neutral-400">/{category.slug}</span>
        <span className="ml-auto text-sm text-neutral-500">
          {postCount} {postCount === 1 ? 'post' : 'postů'}
        </span>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          Upravit
        </button>

        <form
          action={deleteCategoryAction}
          onSubmit={(event) => {
            const message =
              postCount > 0
                ? `Smazat „${category.name}"? ${postCount} postů zůstane, jen bez kategorie.`
                : `Smazat „${category.name}"?`;
            if (!window.confirm(message)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={category.id} />
          <button type="submit" className="text-sm text-red-600 dark:text-red-400">
            Smazat
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="border-b border-neutral-200 py-3 dark:border-neutral-800">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={category.id} />

        <div className="flex items-center gap-3">
          <input name="name" defaultValue={category.name} required className={inputClass} />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {pending ? 'Ukládám…' : 'Uložit'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            Zrušit
          </button>
        </div>

        <IconPicker name="icon" defaultValue={category.icon} />

        {state.error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
      </form>
    </li>
  );
}

type Props = {
  categories: Category[];
  counts: Record<number, number>;
};

export function CategoryManager({ categories, counts }: Props) {
  const [state, formAction, pending] = useActionState(createCategoryAction, INITIAL);

  return (
    <div className="space-y-8">
      <ul className="border-t border-neutral-200 dark:border-neutral-800">
        {categories.length === 0 ? (
          <li className="py-4 text-sm text-neutral-500">Zatím žádné kategorie.</li>
        ) : (
          categories.map((category) => (
            <EditRow key={category.id} category={category} postCount={counts[category.id] ?? 0} />
          ))
        )}
      </ul>

      <form action={formAction} className="max-w-md space-y-3">
        <h2 className="text-sm font-medium">Nová kategorie</h2>

        <input name="name" placeholder="Název" required className={inputClass} />
        <IconPicker name="icon" />

        {state.error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {pending ? 'Přidávám…' : 'Přidat'}
        </button>
        <p className="text-xs text-neutral-500">Slug se odvodí z názvu.</p>
      </form>
    </div>
  );
}
