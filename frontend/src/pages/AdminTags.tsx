/**
 * AdminTags.tsx - Create, rename, recolour and delete tags (admin only).
 * Deleting a tag removes it from every event and every user's interests.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { tagsApi, type TagInput } from '../api/tagsApi';
import { LoadingButton, LoadingSpinner } from '../components/ui/Loading';
import { getApiErrorMessage } from '../utils/helpers';
import { LIMITS, validateHexColor } from '../utils/validators';
import type { AppTag } from '../types';

const emptyForm = { name: '', description: '', color: '' };

const validateTagForm = (form: typeof emptyForm): string | null => {
  if (!form.name.trim()) return 'Tag name is required';
  if (form.name.trim().length > LIMITS.tagName) return `Tag name must be ${LIMITS.tagName} characters or fewer`;
  if (!validateHexColor(form.color)) return "Color must be a hex value like '#FF5733'";
  return null;
};

const toTagInput = (form: typeof emptyForm): TagInput => ({
  name: form.name.trim(),
  description: form.description.trim() || null,
  color: form.color || null,
});

const AdminTags = () => {
  const [tags, setTags] = useState<AppTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setTags(await tagsApi.getAllTags());
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load tags'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (tag: AppTag) => {
    setEditingId(tag.tag_id);
    setForm({ name: tag.name, description: tag.description ?? '', color: tag.color ?? '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateTagForm(form);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await tagsApi.updateTag(editingId, toTagInput(form));
        toast.success('Tag updated');
      } else {
        await tagsApi.createTag(toTagInput(form));
        toast.success('Tag created');
      }
      cancelEdit();
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save the tag'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: AppTag) => {
    if (!window.confirm(`Delete "${tag.name}"? It is removed from all events and interests.`)) return;
    try {
      await tagsApi.deleteTag(tag.tag_id);
      toast.success('Tag deleted');
      if (editingId === tag.tag_id) cancelEdit();
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete the tag'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Tags</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Tags are the categories for events and the interests on user profiles.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="tag-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input id="tag-name" className="input-field" maxLength={LIMITS.tagName} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="tag-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input id="tag-description" className="input-field" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label htmlFor="tag-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Colour</label>
            <input id="tag-color" className="input-field" placeholder="#FF5733" maxLength={7} value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
          <div className="md:col-span-4 flex gap-3 justify-end">
            {editingId && (
              <button type="button" onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            )}
            <LoadingButton type="submit" loading={saving} className="btn-primary">
              <span className="inline-flex items-center gap-2">
                {editingId ? <PencilIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                {editingId ? 'Save tag' : 'Add tag'}
              </span>
            </LoadingButton>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : (
          <ul className="bg-white dark:bg-gray-800 rounded-lg shadow-md divide-y divide-gray-200 dark:divide-gray-700">
            {tags.length === 0 && <li className="p-6 text-center text-gray-500 dark:text-gray-400">No tags yet</li>}
            {tags.map((tag) => (
              <li key={tag.tag_id} className="p-4 flex items-center gap-4">
                <span className="h-4 w-4 rounded-full flex-shrink-0 border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: tag.color ?? 'transparent' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{tag.name}</p>
                  {tag.description && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{tag.description}</p>}
                </div>
                <button onClick={() => startEdit(tag)} className="p-2 text-gray-400 hover:text-blue-600" title="Edit">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(tag)} className="p-2 text-gray-400 hover:text-red-600" title="Delete">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminTags;
