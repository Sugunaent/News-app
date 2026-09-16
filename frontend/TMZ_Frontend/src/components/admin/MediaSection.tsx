import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Loader2, FileText, Image, Film, Music, File } from 'lucide-react';
import type { MediaItem } from '@/lib/admin/adminTypes';
import { fetchMedia, uploadMedia, deleteMedia } from '@/lib/admin/api';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function typeIcon(type: string): JSX.Element {
  const cls = 'w-6 h-6';
  if (type.startsWith('image/')) return <Image className={cls} style={{ color: 'var(--brand-primary)' }} />;
  if (type.startsWith('video/')) return <Film className={cls} style={{ color: 'var(--brand-primary)' }} />;
  if (type.startsWith('audio/')) return <Music className={cls} style={{ color: 'var(--brand-primary)' }} />;
  if (type.startsWith('text/')) return <FileText className={cls} style={{ color: 'var(--brand-primary)' }} />;
  return <File className={cls} style={{ color: 'var(--brand-primary)' }} />;
}

const PAGE_SIZE = 10;

export function MediaSection(): JSX.Element {
  const { showToast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchMedia()); }
    catch { showToast('Failed to load media', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const item = await uploadMedia(file);
        setItems((p) => [item, ...p]);
      }
      showToast(`${files.length} file(s) uploaded`, 'success');
    } catch { showToast('Upload failed', 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deleteMedia(deleteId); setItems((p) => p.filter((x) => x.id !== deleteId)); showToast('Deleted', 'success'); }
    catch { showToast('Failed to delete', 'error'); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>Media Library</h2>
        <div>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => void handleUpload(e.target.files)} />
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand-primary)' }} /></div>
      ) : items.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>No media files yet. Click Upload to add some.</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pageItems.map((m) => (
              <GlassCard key={m.id} className="p-4 space-y-3">
                <div className="aspect-square rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
                  {m.file_type.startsWith('image/') ? (
                    <img src={m.file_path} alt={m.filename} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    typeIcon(m.file_type)
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-body text-sm truncate" style={{ color: 'var(--text-primary)' }} title={m.filename}>{m.filename}</p>
                  <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{formatSize(m.file_size)}</p>
                  <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <input className="input-field text-[10px]" value={m.file_path} readOnly />
                  <button onClick={async () => { try { await navigator.clipboard.writeText(m.file_path); showToast('URL copied', 'success'); } catch { showToast('Copy failed', 'error'); } }} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-body transition-colors hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
                    Copy URL
                  </button>
                </div>
                <button onClick={() => setDeleteId(m.id)} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-body transition-colors hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </GlassCard>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)}>
        <div className="space-y-4">
          <h3 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Delete Media?</h3>
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={() => void confirmDelete()}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
