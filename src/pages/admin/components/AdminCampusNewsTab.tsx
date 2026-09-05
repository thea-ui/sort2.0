import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../../../services/api';

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
  { tag: 'ACHIEVEMENT', tagColor: 'bg-[#C69B26]/15 text-[#C69B26] border-[#C69B26]/30', iconColor: 'bg-[#C69B26]' },
  { tag: 'MRF UPDATE', tagColor: 'bg-[#00A77C]/15 text-[#00A77C] border-[#00A77C]/30', iconColor: 'bg-[#00A77C]' },
  { tag: 'EVENT', tagColor: 'bg-rose-100 text-rose-700 border-rose-200', iconColor: 'bg-rose-500' },
  { tag: 'NEW FACILITY', tagColor: 'bg-sky-100 text-sky-800 border-sky-200', iconColor: 'bg-sky-500' },
  { tag: 'PROGRAM', tagColor: 'bg-purple-100 text-purple-700 border-purple-200', iconColor: 'bg-purple-500' },
  { tag: 'RESEARCH', tagColor: 'bg-cyan-100 text-cyan-700 border-cyan-200', iconColor: 'bg-cyan-600' },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#00271D] flex items-center gap-3">
            <Newspaper size={28} className="text-[#00A77C]" />
            Campus News
          </h2>
          <p className="text-sm text-[#00271D]/50 mt-1">Manage news articles visible to students and teachers</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2.5 bg-[#00A77C] hover:bg-[#008f6a] text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#00A77C]/20 flex items-center gap-2 cursor-pointer">
          <Plus size={16} /> New Article
        </button>
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-[#00271D]/40">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center">
            <Newspaper size={32} className="text-[#00271D]/20 mx-auto mb-3" />
            <p className="text-sm text-[#00271D]/40">No articles yet. Create your first one!</p>
          </div>
        ) : articles.map((article) => (
          <div key={article.id} className={`bg-white rounded-2xl border p-5 transition-all ${article.isPublished ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${article.tagColor}`}>{article.tag}</span>
                  {!article.isPublished && <span className="text-[10px] text-gray-400 font-bold">DRAFT</span>}
                </div>
                <h3 className="text-base font-bold text-[#00271D]">{article.title}</h3>
                <p className="text-sm text-[#00271D]/60 mt-1 line-clamp-2">{article.body}</p>
                <p className="text-[11px] text-[#00271D]/30 mt-2">{new Date(article.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleTogglePublish(article)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#00A77C] cursor-pointer" title={article.isPublished ? 'Unpublish' : 'Publish'}>
                  {article.isPublished ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => openEdit(article)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-blue-600 cursor-pointer" title="Edit">
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
              <h3 className="text-xl font-black text-[#00271D]">{editingArticle ? 'Edit Article' : 'New Article'}</h3>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-[#00271D]/60">Tag</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {TAG_OPTIONS.map((opt, i) => (
                    <button key={i} onClick={() => setSelectedTag(i)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedTag === i ? opt.tagColor + ' ring-2 ring-offset-1 ring-[#00A77C]/30' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                      {opt.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-[#00271D]/60">Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title..."
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-[#00271D] outline-none focus:border-[#00A77C] focus:ring-2 focus:ring-[#00A77C]/20" />
              </div>

              <div>
                <label className="text-sm font-bold text-[#00271D]/60">Body</label>
                <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your article..."
                  className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-[#00271D] outline-none focus:border-[#00A77C] focus:ring-2 focus:ring-[#00A77C]/20 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeModal} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 cursor-pointer">Cancel</button>
              <button onClick={editingArticle ? handleUpdate : handleCreate} className="px-6 py-2.5 bg-[#00A77C] text-white font-extrabold rounded-2xl shadow-lg shadow-[#00A77C]/20 hover:bg-[#008f6a] cursor-pointer">
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
              <h3 className="text-xl font-black text-[#00271D]">Delete Article?</h3>
              <p className="text-sm text-[#00271D]/50 mt-1">This action cannot be undone.</p>
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
