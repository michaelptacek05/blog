'use client';

import Link from 'next/link';
import { useActionState, useRef, useState } from 'react';
import type { Category, Media, Post } from '@/db/schema';
import { slugify } from '@/lib/slug';
import { MAX_UPLOAD_BYTES, formatBytes } from '@/lib/upload-limits';
import {
  createPostAction,
  deletePostAction,
  renderPreviewAction,
  updatePostAction,
  uploadImageAction,
  type PostFormState,
} from './actions';

const INITIAL_STATE: PostFormState = {};

type Props = {
  post?: Post;
  cover?: Media | null;
  categories: Category[];
};

export function PostForm({ post, cover, categories }: Props) {
  const isEdit = post !== undefined;
  const action = isEdit ? updatePostAction : createPostAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [content, setContent] = useState(post?.contentMd ?? '');
  // Once the slug is edited by hand, stop deriving it from the title.
  const [slugTouched, setSlugTouched] = useState(isEdit);

  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [coverId, setCoverId] = useState<number | null>(post?.coverMediaId ?? null);
  const [categoryId, setCategoryId] = useState(post?.categoryId?.toString() ?? '');
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  async function uploadCover(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setCoverError(
        `${file.name} je ${formatBytes(file.size)}, limit je ${formatBytes(MAX_UPLOAD_BYTES)}.`,
      );
      return;
    }

    setCoverError(null);
    setCoverUploading(true);

    try {
      const payload = new FormData();
      payload.set('file', file);
      const result = await uploadImageAction(payload);

      if (result.ok) {
        setCoverId(result.id);
      } else {
        setCoverError(result.error);
      }
    } catch {
      setCoverError(
        `Nahrání se nepodařilo. Bývá to velikostí souboru — limit je ${formatBytes(MAX_UPLOAD_BYTES)}.`,
      );
    } finally {
      setCoverUploading(false);
    }
  }

  /** Inserts markdown at the caret, keeping the caret after the inserted text. */
  function insertAtCaret(snippet: string): void {
    const textarea = contentRef.current;

    if (!textarea) {
      setContent((current) => `${current}${snippet}`);
      return;
    }

    const { selectionStart, selectionEnd } = textarea;
    const next = content.slice(0, selectionStart) + snippet + content.slice(selectionEnd);
    setContent(next);

    // Restore the caret after React has re-rendered with the new value.
    requestAnimationFrame(() => {
      const caret = selectionStart + snippet.length;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  async function uploadFiles(files: File[]): Promise<void> {
    const images = files.filter((file) => file.type.startsWith('image/'));

    if (images.length === 0) {
      setUploadError('Přetáhni sem obrázek.');
      return;
    }

    // Checked here as well as on the server: a file over the proxy's limit
    // would come back as a bare 413 with no usable message.
    const tooBig = images.find((file) => file.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      setUploadError(
        `${tooBig.name} má ${formatBytes(tooBig.size)}, limit je ${formatBytes(MAX_UPLOAD_BYTES)}.`,
      );
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      for (const image of images) {
        const payload = new FormData();
        payload.set('file', image);

        const result = await uploadImageAction(payload);

        if (!result.ok) {
          setUploadError(result.error);
          return;
        }

        insertAtCaret(`![${result.alt}](/media/${result.id})\n`);
      }
    } catch {
      // A rejected request (proxy 413, connection dropped) lands here — the
      // action itself never throws for a merely invalid file.
      setUploadError(
        `Nahrání se nepodařilo. Bývá to velikostí souboru — limit je ${formatBytes(MAX_UPLOAD_BYTES)}.`,
      );
    } finally {
      setUploading(false);
    }
  }

  async function showPreview(): Promise<void> {
    setPreviewing(true);
    try {
      setPreviewHtml(await renderPreviewAction(content));
      setTab('preview');
    } finally {
      setPreviewing(false);
    }
  }

  const derivedSlug = slugTouched ? slug : slugify(title);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        {isEdit ? <input type="hidden" name="id" value={post.id} /> : null}

        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            Titulek
          </label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            value={derivedSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="odvodí se z titulku"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Diakritika se odstraní automaticky. Kolize se řeší číselnou příponou.
          </p>
        </div>

        <div>
          <label htmlFor="excerpt" className="mb-1 block text-sm font-medium">
            Perex
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            defaultValue={post?.excerpt ?? ''}
            rows={2}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="categoryId" className="mb-1 block text-sm font-medium">
            Kategorie
          </label>
          <select
            id="categoryId"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">— bez kategorie —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium">Titulní obrázek</span>
          <input type="hidden" name="coverMediaId" value={coverId ?? ''} />

          {coverId ? (
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/media/${coverId}`}
                alt=""
                className="h-24 w-40 rounded-md border border-neutral-300 object-cover dark:border-neutral-700"
              />
              <button
                type="button"
                onClick={() => setCoverId(null)}
                className="text-sm text-neutral-500 underline decoration-dotted hover:text-neutral-900 dark:hover:text-white"
              >
                Odebrat
              </button>
            </div>
          ) : (
            <label className="inline-block cursor-pointer text-sm text-neutral-500 underline decoration-dotted hover:text-neutral-900 dark:hover:text-white">
              {coverUploading ? 'Nahrávám…' : 'Vybrat obrázek'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  void uploadCover(file);
                }}
              />
            </label>
          )}

          {coverError ? (
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {coverError}
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="contentMd" className="block text-sm font-medium">
              Obsah (markdown)
            </label>
            <div className="flex gap-1 text-sm">
              <button
                type="button"
                onClick={() => setTab('edit')}
                className={`rounded px-2 py-1 ${tab === 'edit' ? 'bg-neutral-200 dark:bg-neutral-800' : 'text-neutral-500'}`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={showPreview}
                disabled={previewing}
                className={`rounded px-2 py-1 disabled:opacity-50 ${tab === 'preview' ? 'bg-neutral-200 dark:bg-neutral-800' : 'text-neutral-500'}`}
              >
                {previewing ? 'Renderuji…' : 'Náhled'}
              </button>
            </div>
          </div>

          {/* The textarea stays mounted so its value is always submitted. */}
          <div className={tab === 'edit' ? '' : 'hidden'}>
            <textarea
              id="contentMd"
              name="contentMd"
              ref={contentRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                if (event.dataTransfer.files.length === 0) {
                  return;
                }
                event.preventDefault();
                void uploadFiles(Array.from(event.dataTransfer.files));
              }}
              required
              rows={22}
              spellCheck={false}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
            />

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <label className="cursor-pointer text-neutral-500 underline decoration-dotted hover:text-neutral-900 dark:hover:text-white">
                Nahrát obrázek
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = '';
                    void uploadFiles(files);
                  }}
                />
              </label>

              <span className="text-neutral-400">
                nebo obrázek přetáhni do textu (max {formatBytes(MAX_UPLOAD_BYTES)})
              </span>

              {uploading ? <span className="text-neutral-500">Nahrávám…</span> : null}
            </div>

            {uploadError ? (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {uploadError}
              </p>
            ) : null}
          </div>

          {tab === 'preview' ? (
            <div className="rounded-md border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <div
                className="prose prose-neutral dark:prose-invert max-w-none"
                // Sanitized server-side by the markdown pipeline (rehype-sanitize).
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : null}
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={pending}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
          >
            {post?.publishedAt ? 'Zrušit publikaci' : 'Uložit koncept'}
          </button>

          <button
            type="submit"
            name="intent"
            value="publish"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {post?.publishedAt ? 'Uložit publikovaný' : 'Publikovat'}
          </button>

          {pending ? <span className="text-sm text-neutral-500">Ukládám…</span> : null}
          {!pending && state.savedAt ? (
            <span className="text-sm text-neutral-500">
              Uloženo v {new Date(state.savedAt).toLocaleTimeString('cs-CZ')}
            </span>
          ) : null}

          {post?.publishedAt ? (
            <Link
              href={`/blog/${post.slug}`}
              className="ml-auto text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              Zobrazit na webu
            </Link>
          ) : null}
        </div>
      </form>

      {isEdit ? (
        <form
          action={deletePostAction}
          onSubmit={(event) => {
            if (!window.confirm('Opravdu smazat tenhle post?')) {
              event.preventDefault();
            }
          }}
          className="border-t border-neutral-200 pt-4 dark:border-neutral-800"
        >
          <input type="hidden" name="id" value={post.id} />
          <button type="submit" className="text-sm text-red-600 dark:text-red-400">
            Smazat post
          </button>
        </form>
      ) : null}
    </div>
  );
}
