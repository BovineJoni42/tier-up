import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MoreVertical, Copy, Pencil, Trash2, Trophy, LayoutGrid } from 'lucide-react'
import { useTierStore } from '../store/useTierStore'
import { Button } from '../components/Button'
import { clsx } from 'clsx'

function NewListModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('')
  const submit = () => { if (name.trim()) { onCreate(name.trim()); onClose() } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold mb-4">New Tier List</h2>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. My All-Time Favorites"
          className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-sub outline-none focus:border-brand-accent transition-colors mb-4"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim()}>Create List</Button>
        </div>
      </div>
    </div>
  )
}

function RenameModal({ initial, onClose, onSave }: { initial: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial)
  const submit = () => { if (name.trim()) { onSave(name.trim()); onClose() } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold mb-4">Rename List</h2>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-accent transition-colors mb-4"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim()}>Save</Button>
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { lists, createList, deleteList, duplicateList, renameList } = useTierStore()
  const [showNew, setShowNew] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)

  const renameTarget = lists.find(l => l.id === renameId)

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Header */}
      <header className="border-b border-brand-border bg-brand-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center shadow-glow">
              <Trophy size={16} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tight">TierUp</span>
          </div>
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} /> New List
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {lists.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 rounded-2xl bg-brand-card border border-brand-border flex items-center justify-center mb-6">
              <LayoutGrid size={36} className="text-brand-muted" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No tier lists yet</h2>
            <p className="text-brand-sub mb-8 max-w-xs">Create your first tier list and start ranking your favorite games.</p>
            <Button size="lg" onClick={() => setShowNew(true)}>
              <Plus size={18} /> Create Your First List
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">My Tier Lists <span className="text-brand-sub font-normal text-lg">({lists.length})</span></h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map(list => {
                const gameCount = list.tiers.reduce((s, t) => s + t.games.length, 0)
                const previewGames = list.tiers.flatMap(t => t.games).slice(0, 6)
                return (
                  <div
                    key={list.id}
                    className="group bg-brand-card border border-brand-border rounded-2xl overflow-hidden hover:border-brand-accent transition-all duration-200 cursor-pointer relative"
                    onClick={() => navigate(`/list/${list.id}`)}
                  >
                    {/* Cover art preview */}
                    <div className="h-28 bg-brand-surface flex items-center justify-center overflow-hidden relative">
                      {previewGames.length > 0 ? (
                        <div className="flex gap-1 px-2">
                          {previewGames.map(g => (
                            <img key={g.id} src={g.coverUrl} alt={g.title}
                              className="w-12 h-16 object-cover rounded flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                          ))}
                        </div>
                      ) : (
                        <div className="text-brand-muted flex flex-col items-center gap-2">
                          <LayoutGrid size={28} />
                          <span className="text-xs">No games yet</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-transparent to-transparent" />
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-base truncate mb-1">{list.name}</h3>
                      <p className="text-brand-sub text-xs">
                        {gameCount} game{gameCount !== 1 ? 's' : ''}
                        {list.topFive.length > 0 && ` · ${list.topFive.length} in Top 5`}
                      </p>
                    </div>

                    {/* Actions menu */}
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === list.id ? null : list.id) }}
                        className={clsx(
                          'p-1.5 rounded-lg text-brand-sub hover:text-brand-text transition-colors',
                          menuOpenId === list.id ? 'bg-brand-surface text-brand-text' : 'opacity-0 group-hover:opacity-100 bg-brand-card/80'
                        )}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuOpenId === list.id && (
                        <div
                          className="absolute right-0 top-8 w-44 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-20 py-1 overflow-hidden"
                          onClick={e => e.stopPropagation()}
                        >
                          <button onClick={() => { setRenameId(list.id); setMenuOpenId(null) }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-brand-card text-brand-text transition-colors">
                            <Pencil size={14} className="text-brand-sub" /> Rename
                          </button>
                          <button onClick={() => { duplicateList(list.id); setMenuOpenId(null) }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-brand-card text-brand-text transition-colors">
                            <Copy size={14} className="text-brand-sub" /> Duplicate
                          </button>
                          <div className="border-t border-brand-border my-1" />
                          <button onClick={() => { deleteList(list.id); setMenuOpenId(null) }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-900/20 text-red-400 transition-colors">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* New list card */}
              <button
                onClick={() => setShowNew(true)}
                className="bg-brand-card/40 border-2 border-dashed border-brand-border hover:border-brand-accent rounded-2xl flex flex-col items-center justify-center gap-3 min-h-[11rem] transition-all text-brand-sub hover:text-brand-accent group"
              >
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={22} />
                </div>
                <span className="text-sm font-semibold">New Tier List</span>
              </button>
            </div>
          </>
        )}
      </main>

      {showNew && <NewListModal onClose={() => setShowNew(false)} onCreate={name => createList(name)} />}
      {renameTarget && (
        <RenameModal
          initial={renameTarget.name}
          onClose={() => setRenameId(null)}
          onSave={name => renameList(renameTarget.id, name)}
        />
      )}

      {/* Close menu on outside click */}
      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  )
}
