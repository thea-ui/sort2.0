import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../../../services/api';
import { PageHeader } from '../../../components/layout/PageHeader';

interface NewsArticle {
  id: string;
  title: string;
  body: string;
  tag: string;
  tagColor: string;
  iconColor: string;
  isPublished: boolean;
  createdAt: string;
}

const TAG_OPTIONS = [
  { tag: 'ACHIEVEMENT', tagColor: 'bg-[color-mix(in_srgb,var(--gold)_15%,white)] text-[var(--gold)] border-[var(--gold)]/30', iconColor: 'bg-[var(--gold)]' },
  { tag: 'MRF UPDATE', tagColor: 'bg-[color-mix(in_srgb,var(--accent)_15%,white)] text-[var(--accent)] border-[var(--accent)]/30', iconColor: 'bg-[var(--accent)]' },
  { tag: 'EVENT', tagColor: 'bg-rose-100 text-rose-700 border-rose-200', iconColor: 'bg-rose-500' },
  { tag: 'NEW FACILITY', tagColor: 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] border-[var(--primary)]/25', iconColor: 'bg-[var(--primary)]' },
  { tag: 'PROGRAM', tagColor: 'bg-[color-mix(in_srgb,var(--gold)_10%,white)] text-[var(--gold)] border-[var(--gold)]/25', iconColor: 'bg-[var(--gold)]' },
  { tag: 'RESEARCH', tagColor: 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] border-[var(--primary)]/25', iconColor: 'bg-[var(--primary)]' },
  { tag: 'UPDATE', tagColor: 'bg-gray-100 text-gray-700 border-gray-200', iconColor: 'bg-gray-500' },
];

export const AdminCampusNewsTab: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTag, setSelectedTag] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCampusNews();
      if (Array.isArray(data)) setArticles(data);
    } catch (err) {
      console.warn('Failed to fetch campus news:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadNews(); }, []);

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    const tagConfig = TAG_OPTIONS[selectedTag];
    try {
      await apiService.createCampusNews({
        title, body, tag: tagConfig.tag, tagColor: tagConfig.tagColor, iconColor: tagConfig.iconColor,
      });
      setShowModal(false);
      setTitle('');
      setBody('');
      setSelectedTag(0);
      await loadNews();
    } catch (err) {
      console.error('Failed to create news:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingArticle || !title.trim() || !body.trim()) return;
    const tagConfig = TAG_OPTIONS[selectedTag];
    try {
      await apiService.updateCampusNews(editingArticle.id, {
        title, body, tag: tagConfig.tag, tagColor: tagConfig.tagColor, iconColor: tagConfig.iconColor,
      });
      setEditingArticle(null);
      setTitle('');
      setBody('');
      setSelectedTag(0);
      await loadNews();
    } catch (err) {
      console.error('Failed to update news:', err);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    try {
      await apiService.deleteCampusNews(showDeleteModal);
      setShowDeleteModal(null);
      await loadNews();
    } catch (err) {
      console.error('Failed to delete news:', err);
    }
  };

  const handleTogglePublish = async (article: NewsArticle) => {
    try {
      await apiService.updateCampusNews(article.id, { isPublished: !article.isPublished });
      await loadNews();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    }
  };

  const openEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setTitle(article.title);
    setBody(article.body);
    const tagIdx = TAG_OPTIONS.findIndex(t => t.tag === article.tag);
    setSelectedTag(tagIdx >= 0 ? tagIdx : 0);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingArticle(null);
    setTitle('');
    setBody('');
    setSelectedTag(0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingArticle(null);
    setTitle('');
    setBody('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Campus News"
        description="Manage news articles visible to students and teachers"
        actions={
          <button
            onClick={openCreate}
            className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-sm font-bold rounded-2xl shadow-lg shadow-[var(--accent)]/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> New Article
          </button>
        }
      />

      {/* Articles List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-[var(--text-strong)]/40">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center">
            <Newspaper size={32} className="text-[var(--text-strong)]/20 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-strong)]/40">No articles yet. Create your first one!</p>
          </div>
        ) : articles.map((article) => (
          <div key={article.id} className={`bg-white rounded-2xl border p-5 transition-all ${article.isPublished ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${article.tagColor}`}>{article.tag}</span>
                  {!article.isPublished && <span className="text-[10px] text-gray-400 font-bold">DRAFT</span>}
                </div>
                <h3 className="text-base font-bold text-[var(--text-strong)]">{article.title}</h3>
                <p className="text-sm text-[var(--text-strong)]/60 mt-1 line-clamp-2">{article.body}</p>
                <p className="text-[11px] text-[var(--text-strong)]/30 mt-2">{new Date(article.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleTogglePublish(article)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[var(--accent)] cursor-pointer" title={article.isPublished ? 'Unpublish' : 'Publish'}>
                  {article.isPublished ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => openEdit(article)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[var(--text-strong)] cursor-pointer" title="Edit">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => setShowDeleteModal(article.id)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-red-600 cursor-pointer" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-5 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-[var(--text-strong)]">{editingArticle ? 'Edit Article' : 'New Article'}</h3>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-[var(--text-strong)]/60">Tag</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {TAG_OPTIONS.map((opt, i) => (
                    <button key={i} onClick={() => setSelectedTag(i)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedTag === i ? opt.tagColor + ' ring-2 ring-offset-1 ring-[var(--accent)]/30' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                      {opt.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-[var(--text-strong)]/60">Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title..."
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-[var(--text-strong)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>

              <div>
                <label className="text-sm font-bold text-[var(--text-strong)]/60">Body</label>
                <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your article..."
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-[var(--text-strong)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeModal} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 cursor-pointer">Cancel</button>
              <button onClick={editingArticle ? handleUpdate : handleCreate} className="px-6 py-2.5 bg-[var(--accent)] text-white font-extrabold rounded-2xl shadow-lg shadow-[var(--accent)]/20 hover:bg-[var(--accent-dark)] cursor-pointer">
                {editingArticle ? 'Save Changes' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-5 animate-fade-in text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[var(--text-strong)]">Delete Article?</h3>
              <p className="text-sm text-[var(--text-strong)]/50 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 cursor-pointer">Cancel</button>
              <button onClick={handleDelete} className="px-6 py-2.5 bg-red-500 text-white font-extrabold rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
