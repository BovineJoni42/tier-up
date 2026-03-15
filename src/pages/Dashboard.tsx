import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTierStore, type ListType } from '../store/useTierStore'
import { TIER_META, TIER_ORDER } from '../store/useTierStore'
import Button from '../components/Button'

export default function Dashboard() {
  const navigate = useNavigate()
  const { lists, createList, renameList, duplicateList, deleteList } = useTierStore()
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<ListType>('games')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    const id = createList(newName.trim(), newType)
    setNewName('')
    setNewType('games')
    setShowNewModal(false)
    navigate(`/list/${id}`)
  }

  const handleRename = (id: string) => {
    if (!renameValue.trim()) return
    renameList(id, renameValue.trim())
    setRenamingId(null)
  }

  const handleDelete = (id: string) => {
    deleteList(id)
    setConfirmDeleteId(null)
  }

  return (
    <div className="min-h-screen bg-[#08080f] text-white flex flex-col">
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px)'
        }}
      />

      {/* Navbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 h-[60px] bg-[#08080f]/90 border-b border-slate-800 backdrop-blur-xl">
        <span className="font-display text-3xl font-bold tracking-[3px] bg-gradient-to-br from-violet-400 to-purple-500 bg-clip-text text-transparent">
          TIERCRAFT
        </span>
        <Button variant="primary" onClick={() => setShowNewModal(true)}>
          + New List
        </Button>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <h1 className="font-display text-2xl font-bold tracking-wide mb-5">My Lists</h1>

        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-5xl">🎮</div>
            <p className="text-slate-400 font-mono text-sm">No tier lists yet</p>
            <Button variant="primary" onClick={() => setShowNewModal(true)}>
              Create your first list
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lists.map(list => {
              const totalGames = TIER_ORDER.reduce(
                (sum, tid) => sum + list.tiers[tid].length, 0
              )
              const tiersUsed = TIER_ORDER.filter(tid => list.tiers[tid].length > 0)

              return (
                <div
                  key={list.id}
                  className="group relative bg-[#1a1a2e] border border-slate-800 rounded-2xl p-4 cursor-pointer
                    hover:border-violet-700 hover:bg-[#1e1e38] hover:translate-x-0.5 transition-all duration-150
                    before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b
                    before:from-violet-600 before:to-purple-500 before:rounded-l-2xl"
                  onClick={() => navigate(`/list/${list.id}`)}
                >
                  {renamingId === list.id ? (
                    <div
                      className="flex gap-2"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(list.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        className="flex-1 bg-[#0e0e1a] border border-violet-600 rounded-lg px-3 py-1.5 text-sm outline-none"
                      />
                      <Button size="sm" onClick={() => handleRename(list.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                        <h2 className="font-display text-xl font-bold tracking-wide leading-tight">{list.name}</h2>
                        <span className="text-lg flex-shrink-0">
                          {list.type === 'movies' ? '🎬' : list.type === 'tv' ? '📺' : '🎮'}
                        </span>
                      </div>
                        {/* Actions - visible on hover */}
                        <div
                          className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <Button
                            variant="icon"
                            size="sm"
                            title="Rename"
                            onClick={() => {
                              setRenamingId(list.id)
                              setRenameValue(list.name)
                            }}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="icon"
                            size="sm"
                            title="Duplicate"
                            onClick={() => {
                              const newId = duplicateList(list.id)
                              navigate(`/list/${newId}`)
                            }}
                          >
                            📋
                          </Button>
                          <Button
                            variant="icon"
                            size="sm"
                            title="Delete"
                            onClick={() => setConfirmDeleteId(list.id)}
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 font-mono mb-3">
                        {totalGames} games · {tiersUsed.length} tiers used
                      </p>

                      {/* Tier badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {tiersUsed.map(tid => {
                          const m = TIER_META[tid]
                          return (
                            <span
                              key={tid}
                              className="text-[10px] font-bold px-2 py-0.5 rounded font-display tracking-wider"
                              style={{ backgroundColor: m.bg, color: m.color }}
                            >
                              {m.label} · {list.tiers[tid].length}
                            </span>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })}

            {/* Empty new list button */}
            <button
              onClick={() => setShowNewModal(true)}
              className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-700
                text-slate-500 font-semibold text-sm hover:border-violet-600 hover:text-violet-400
                hover:bg-violet-950/20 transition-all"
            >
              ＋ Create New List
            </button>
          </div>
        )}
      </main>

      {/* Ad Banner */}
      <div className="border-t border-slate-800 py-2.5 text-center text-xs text-slate-600 font-mono tracking-widest bg-[#08080f]">
        📢 ADVERTISEMENT — Your ad here
      </div>

      {/* New List Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowNewModal(false)}
        >
          <div className="bg-[#14142a] border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
            <h2 className="font-display text-xl font-bold text-center tracking-wide mb-5">New Tier List</h2>
            {/* Type picker */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {([['games','🎮','Games'],['movies','🎬','Movies'],['tv','📺','TV Shows']] as const).map(([type, emoji, label]) => (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all font-body
                    ${newType === type
                      ? 'border-violet-500 bg-violet-950/50 text-white'
                      : 'border-slate-700 bg-[#0e0e1a] text-slate-400 hover:border-slate-500'
                    }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>

            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={newType === 'movies' ? 'e.g. "Best Action Movies"' : newType === 'tv' ? 'e.g. "Top Drama Shows"' : 'e.g. "My Favorite RPGs"'}
              maxLength={50}
              className="w-full bg-[#0e0e1a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white
                placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 mb-4"
            />
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowNewModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-2 flex-1"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                Create List
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setConfirmDeleteId(null)}
        >
          <div className="bg-[#14142a] border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-display text-xl font-bold text-center mb-2">Delete List?</h2>
            <p className="text-slate-400 text-sm text-center mb-5">
              This can't be undone. All games in this list will be lost.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => handleDelete(confirmDeleteId)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
