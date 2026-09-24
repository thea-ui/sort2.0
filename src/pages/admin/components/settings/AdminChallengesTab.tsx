import React, { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Lock, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { AdminChallenge, ChallengeType } from '../../../../types';
import { useToast } from '../../../../hooks/useToast';
import { LoadingState } from '../../../../components/common/LoadingState';

const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  REPORT_COUNT: 'Report Count',
  WEIGHT_COLLECTED: 'Weight Collected',
  HAZARDOUS_REPORT: 'Hazardous Report',
};

const CODE_REGEX = /^[A-Z0-9_]+$/;

export const AdminChallengesTab: React.FC = () => {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminChallenge | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminChallenge | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<AdminChallenge | null>(null);
  const toast = useToast();

  const showToast = (type: 'success' | 'error', message: string) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const loadChallenges = async () => {
    try {
      const data = await apiService.getAdminChallenges();
      setChallenges(data);
    } catch (err) {
      console.warn('Failed to load challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadChallenges(); }, []);

  const handleToggle = async (challenge: AdminChallenge) => {
    if (challenge.isActive && challenge.hasProgress) {
      setDeactivateConfirm(challenge);
      return;
    }
    try {
      await apiService.updateChallenge(challenge.id, { isActive: !challenge.isActive });
      showToast('success', `Challenge ${challenge.isActive ? 'deactivated' : 'activated'}`);
      await loadChallenges();
    } catch (err) {
      showToast('error', 'Failed to update challenge');
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateConfirm) return;
    try {
      await apiService.updateChallenge(deactivateConfirm.id, { isActive: false });
      showToast('success', 'Challenge deactivated');
      setDeactivateConfirm(null);
      await loadChallenges();
    } catch {
      showToast('error', 'Failed to deactivate');
      setDeactivateConfirm(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await apiService.deleteChallenge(deleteConfirm.id);
      showToast('success', 'Challenge deleted');
      setDeleteConfirm(null);
      await loadChallenges();
    } catch (err: any) {
      if (err.code === 'HAS_PROGRESS') {
        showToast('error', 'Cannot delete — users have progress. Deactivate instead.');
      } else {
        showToast('error', 'Failed to delete challenge');
      }
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading challenges…" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-[var(--text-strong)] flex items-center gap-2">
            <Target size={22} className="text-[var(--accent)]" />
            Challenges
          </h3>
          <p className="text-sm text-[var(--text-strong)]/50 mt-0.5">Manage gamification challenges for students.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all">
          <Plus size={14} />
          Create Challenge
        </button>
      </div>

      {challenges.length === 0 ? (
        <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-12 text-center">
          <Target size={40} className="mx-auto text-[var(--text-strong)]/20 mb-3" />
          <p className="text-[var(--text-strong)]/50 font-medium mb-4">No challenges yet</p>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-sm font-bold rounded-xl cursor-pointer">
            Create your first challenge
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => (
            <div key={c.id} className={`rounded-2xl border bg-white p-5 transition-all ${c.isActive ? 'border-[var(--primary)]/10' : 'border-[var(--primary)]/5 opacity-60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-[var(--text-strong)] truncate">{c.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                      {CHALLENGE_TYPE_LABELS[c.challengeType]}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-strong)]/50 mb-2 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-strong)]/50">
                    <span>Target: <strong className="text-[var(--text-strong)]">{c.challengeType === 'WEIGHT_COLLECTED' ? `${(c.target / 1000).toFixed(1)} kg` : c.target}</strong></span>
                    <span>Reward: <strong className="text-[var(--text-strong)]">{c.pointsAwarded} pts</strong></span>
                    <span className="font-mono text-[10px] bg-gray-50 px-1.5 py-0.5 rounded">{c.code}</span>
                    {c.startDate || c.endDate ? (
                      <span>{c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'} → {c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}</span>
                    ) : (
                      <span className="text-[var(--text-strong)]/30">No window</span>
                    )}
                  </div>
                  {c.stats && (
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-strong)]/40">
                      <span>{c.stats.usersInProgress} in progress</span>
                      <span>{c.stats.completedCount} completed</span>
                      <span>{c.stats.totalContributions} contributions</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggle(c)} className="p-2 rounded-xl hover:bg-[var(--accent)]/10 transition-colors cursor-pointer" title={c.isActive ? 'Deactivate' : 'Activate'}>
                    {c.isActive ? <ToggleRight size={20} className="text-[var(--accent)]" /> : <ToggleLeft size={20} className="text-gray-400" />}
                  </button>
                  <button onClick={() => setEditing(c)} className="p-2 rounded-xl hover:bg-[var(--primary)]/10 transition-colors cursor-pointer" title="Edit">
                    <Edit2 size={16} className="text-[var(--text-strong)]" />
                  </button>
                  <button onClick={() => setDeleteConfirm(c)} className="p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer" title="Delete">
                    <Trash2 size={16} className="text-rose-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <ChallengeFormModal onClose={() => { setShowCreate(false); loadChallenges(); }} showToast={showToast} />}
      {editing && <ChallengeFormModal challenge={editing} onClose={() => { setEditing(null); loadChallenges(); }} showToast={showToast} />}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-[var(--text-strong)] mb-2">Delete Challenge?</h3>
            <p className="text-sm text-[var(--text-strong)]/60 mb-4">"{deleteConfirm.title}" will be permanently deleted. {deleteConfirm.hasProgress && 'Users have progress — consider deactivating instead.'}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-bold text-[var(--text-strong)]/60 rounded-xl hover:bg-gray-100 cursor-pointer">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {deactivateConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="text-lg font-bold text-[var(--text-strong)]">Deactivate Challenge?</h3>
            </div>
            <p className="text-sm text-[var(--text-strong)]/60 mb-4">{deactivateConfirm.stats?.usersInProgress || 0} users are mid-progress. Deactivating hides it from their list but preserves their progress.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeactivateConfirm(null)} className="px-4 py-2 text-sm font-bold text-[var(--text-strong)]/60 rounded-xl hover:bg-gray-100 cursor-pointer">Cancel</button>
              <button onClick={handleConfirmDeactivate} className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl cursor-pointer">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ChallengeFormModal: React.FC<{
  challenge?: AdminChallenge;
  onClose: () => void;
  showToast: (type: 'success' | 'error', msg: string) => void;
}> = ({ challenge, onClose, showToast }) => {
  const isEdit = !!challenge;
  const hasProgress = challenge?.hasProgress ?? false;

  const [title, setTitle] = useState(challenge?.title || '');
  const [code, setCode] = useState(challenge?.code || '');
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(!!challenge);
  const [challengeType, setChallengeType] = useState<ChallengeType>(challenge?.challengeType || 'REPORT_COUNT');
  const [target, setTarget] = useState(challenge?.target?.toString() || '');
  const [pointsAwarded, setPointsAwarded] = useState(challenge?.pointsAwarded?.toString() || '0');
  const [iconName, setIconName] = useState(challenge?.iconName || 'Target');
  const [startDate, setStartDate] = useState(challenge?.startDate?.slice(0, 10) || '');
  const [endDate, setEndDate] = useState(challenge?.endDate?.slice(0, 10) || '');
  const [description, setDescription] = useState(challenge?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!codeManuallyEdited && !isEdit) {
      const auto = title.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
      setCode(auto);
    }
  }, [title, codeManuallyEdited, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Title is required'); return; }
    if (!code.trim() || !CODE_REGEX.test(code)) { setError('Code must be uppercase letters, numbers, and underscores'); return; }
    if (!target || parseInt(target) <= 0) { setError('Target must be a positive integer'); return; }
    const pts = parseInt(pointsAwarded) || 0;
    if (pts < 0) { setError('Points must be non-negative'); return; }
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) { setError('Start date must be before end date'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        const data: Record<string, any> = { title, description, iconName, startDate: startDate || null, endDate: endDate || null };
        if (!hasProgress) {
          Object.assign(data, { code, challengeType, target: parseInt(target), pointsAwarded: pts });
        }
        await apiService.updateChallenge(challenge!.id, data);
        showToast('success', 'Challenge updated');
      } else {
        await apiService.createChallenge({ title, code, challengeType, target: parseInt(target), pointsAwarded: pts, iconName, startDate: startDate || undefined, endDate: endDate || undefined, description });
        showToast('success', 'Challenge created');
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save challenge');
    } finally {
      setSaving(false);
    }
  };

  const targetHelp = challengeType === 'WEIGHT_COLLECTED'
    ? `${parseInt(target) || 0} g = ${((parseInt(target) || 0) / 1000).toFixed(1)} kg`
    : `${parseInt(target) || 0} reports`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--text-strong)]">{isEdit ? 'Edit Challenge' : 'Create Challenge'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer"><X size={18} /></button>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/60 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--accent)]" />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider flex items-center gap-1">
              Code
              {hasProgress && <Lock size={10} className="text-amber-500" />}
            </label>
            <input value={code} onChange={e => { setCode(e.target.value); setCodeManuallyEdited(true); }} disabled={hasProgress}
              className={`w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 text-sm font-mono outline-none focus:border-[var(--accent)] ${hasProgress ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[var(--background)]/60 text-[var(--text-strong)]'}`} />
            {hasProgress && <p className="text-[10px] text-amber-600 mt-1">Locked — users have progress on this challenge</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider flex items-center gap-1">
              Type
              {hasProgress && <Lock size={10} className="text-amber-500" />}
            </label>
            <select value={challengeType} onChange={e => setChallengeType(e.target.value as ChallengeType)} disabled={hasProgress}
              className={`w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 text-sm outline-none focus:border-[var(--accent)] ${hasProgress ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[var(--background)]/60 text-[var(--text-strong)]'}`}>
              <option value="REPORT_COUNT">Report Count</option>
              <option value="WEIGHT_COLLECTED">Weight Collected</option>
              <option value="HAZARDOUS_REPORT">Hazardous Report</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider flex items-center gap-1">
              Target
              {hasProgress && <Lock size={10} className="text-amber-500" />}
            </label>
            <input type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} disabled={hasProgress}
              className={`w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 text-sm outline-none focus:border-[var(--accent)] ${hasProgress ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[var(--background)]/60 text-[var(--text-strong)]'}`} />
            <p className="text-[10px] text-[var(--text-strong)]/40 mt-1">{targetHelp}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider flex items-center gap-1">
              Reward Points
              {hasProgress && <Lock size={10} className="text-amber-500" />}
            </label>
            <input type="number" min="0" value={pointsAwarded} onChange={e => setPointsAwarded(e.target.value)} disabled={hasProgress}
              className={`w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 text-sm outline-none focus:border-[var(--accent)] ${hasProgress ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[var(--background)]/60 text-[var(--text-strong)]'}`} />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">Icon Name</label>
            <input value={iconName} onChange={e => setIconName(e.target.value)} className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/60 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--accent)]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/60 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/60 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--accent)]" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-wider">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/60 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--accent)] resize-none" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-[var(--text-strong)]/60 rounded-xl hover:bg-gray-100 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
