import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import type { Task, Column } from '../types';
import SortableTaskCard from '../components/SortableTaskCard';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import SearchBar from '../components/SearchBar';

function ColumnDropZone({ columnId, children }: { columnId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[240px] flex-col rounded-2xl p-3 transition-colors ${
        isOver
          ? 'bg-[color:var(--accent-muted)] ring-2 ring-[color:var(--accent-color)]/40'
          : 'bg-[color:var(--card-glass-bg)] backdrop-blur-sm'
      }`}
      style={{ minHeight: 240 }}
    >
      {children}
    </div>
  );
}

export default function KanbanPage() {
  const columns = useStore((s) => s.columns);
  const tasks = useStore((s) => s.tasks);
  const loading = useStore((s) => s.loading);
  const loadAll = useStore((s) => s.loadAll);
  const moveTaskToIndex = useStore((s) => s.moveTaskToIndex);
  const addColumn = useStore((s) => s.addColumn);
  const updateColumn = useStore((s) => s.updateColumn);
  const deleteColumn = useStore((s) => s.deleteColumn);

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredTasks = useMemo(
    () => (query.trim() ? tasks.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase())) : tasks),
    [tasks, query]
  );

  function tasksInColumn(columnId: string): Task[] {
    return filteredTasks.filter((t) => t.columnId === columnId).sort((a, b) => a.order - b.order);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overId = String(over.id);

    const targetColumn = columns.find((c) => c.id === overId);
    if (targetColumn) {
      const count = filteredTasks.filter((t) => t.columnId === targetColumn.id).length;
      await moveTaskToIndex(activeIdStr, targetColumn.id, count);
      return;
    }

    const overTask = filteredTasks.find((t) => t.id === overId);
    if (!overTask) return;
    const destColumnId = overTask.columnId;
    const withoutActive = filteredTasks.filter((t) => t.id !== activeIdStr);
    const targetColTasks = withoutActive
      .filter((t) => t.columnId === destColumnId)
      .sort((a, b) => a.order - b.order);
    const overIndex = targetColTasks.findIndex((t) => t.id === overId);
    const index = overIndex === -1 ? targetColTasks.length : overIndex;
    await moveTaskToIndex(activeIdStr, destColumnId, index);
  }

  const activeTask = activeId != null ? tasks.find((t) => t.id === activeId) : null;

  async function handleAddColumn() {
    const title = newColumnTitle.trim();
    if (!title) {
      setAddingColumn(false);
      return;
    }
    await addColumn(title);
    setNewColumnTitle('');
    setAddingColumn(false);
  }

  async function handleRenameColumn(id: string) {
    const title = editingColumnTitle.trim();
    if (!title) {
      setEditingColumnId(null);
      return;
    }
    await updateColumn(id, { title });
    setEditingColumnId(null);
    setEditingColumnTitle('');
  }

  async function handleDeleteColumn(column: Column) {
    const count = tasks.filter((t) => t.columnId === column.id).length;
    const msg = count > 0
      ? `确定删除清单「${column.title}」吗？该清单下有 ${count} 个任务将被移至默认清单。`
      : `确定删除清单「${column.title}」吗？`;
    if (!window.confirm(msg)) return;
    await deleteColumn(column.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">任务看板</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">拖拽卡片管理你的任务流程</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56"><SearchBar value={query} onChange={setQuery} /></div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="rounded-full bg-[color:var(--accent-color)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-hover)] active:scale-95"
          >
            ＋ 新建任务
          </button>
          <button
            onClick={() => setAddingColumn(true)}
            className="rounded-full border border-[color:var(--border-color)] bg-[color:var(--surface-color)] px-5 py-2.5 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:bg-[color:var(--hover-bg)] active:scale-95"
          >
            ＋ 新建清单
          </button>
        </div>
      </div>

      {addingColumn && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[color:var(--accent-color)]/30 bg-[color:var(--accent-muted)] p-3">
          <input
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') setAddingColumn(false); }}
            placeholder="清单名称"
            autoFocus
            className="flex-1 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--surface-color)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-color)]"
          />
          <button onClick={handleAddColumn} className="rounded-full bg-[color:var(--accent-color)] px-4 py-2 text-sm font-medium text-white">添加</button>
          <button onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }} className="rounded-full px-4 py-2 text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--hover-bg)]">取消</button>
        </div>
      )}

      {loading ? (
        <div className="mt-16 text-center text-sm text-[color:var(--text-muted)]">加载中…</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {columns.map((column: Column) => {
              const colTasks = tasksInColumn(column.id);
              const isEditingColumn = editingColumnId === column.id;
              return (
                <ColumnDropZone key={column.id} columnId={column.id}>
                  <header className="flex items-center justify-between px-1 pb-3">
                    {isEditingColumn ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          value={editingColumnTitle}
                          onChange={(e) => setEditingColumnTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameColumn(column.id); if (e.key === 'Escape') setEditingColumnId(null); }}
                          autoFocus
                          className="flex-1 rounded-md border border-[color:var(--accent-color)] bg-[color:var(--surface-color)] px-2 py-1 text-sm text-[color:var(--text-primary)] outline-none"
                        />
                        <button onClick={() => handleRenameColumn(column.id)} className="rounded px-2 py-1 text-xs text-[color:var(--accent-color)] hover:bg-[color:var(--accent-muted)]">保存</button>
                        <button onClick={() => setEditingColumnId(null)} className="rounded px-2 py-1 text-xs text-[color:var(--text-muted)] hover:bg-[color:var(--hover-bg)]">取消</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <h2
                          onDoubleClick={() => { setEditingColumnId(column.id); setEditingColumnTitle(column.title); }}
                          className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[color:var(--text-primary)] hover:text-[color:var(--accent-color)] transition"
                          title="双击重命名"
                        >
                          <span>{column.title}</span>
                          <span className="rounded-full bg-[color:var(--bg-secondary)] px-2 py-0.5 text-xs text-[color:var(--text-muted)]">{colTasks.length}</span>
                        </h2>
                      </div>
                    )}
                    <div className="group flex items-center gap-0.5">
                      <button
                        onClick={() => { setEditing(null); setModalOpen(true); useStore.setState({ modalDefaultColumn: column.id }); }}
                        aria-label={`添加到${column.title}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md p-1 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--hover-bg)] hover:text-[color:var(--text-primary)] active:scale-95"
                      >
                        <Plus size={14} strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => { setEditingColumnId(column.id); setEditingColumnTitle(column.title); }}
                        className="flex h-7 w-7 items-center justify-center rounded-md p-1 text-[color:var(--text-muted)] opacity-0 transition-all duration-200 hover:bg-[color:var(--hover-bg)] hover:text-[color:var(--accent-color)] group-hover:opacity-100 active:scale-95"
                        title="重命名"
                      >
                        <Pencil size={14} strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => handleDeleteColumn(column)}
                        className="flex h-7 w-7 items-center justify-center rounded-md p-1 text-[color:var(--text-muted)] opacity-0 transition-all duration-200 hover:bg-[color:var(--tag-red)]/10 hover:text-[color:var(--tag-red)] group-hover:opacity-100 active:scale-95"
                        title="删除清单"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                  </header>

                  <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-1 flex-col gap-3">
                      <AnimatePresence>
                        {colTasks.map((task) => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                          >
                            <SortableTaskCard task={task} onEdit={(t) => { setEditing(t); setModalOpen(true); }} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {colTasks.length === 0 && (
                        <div className="flex min-h-[160px] flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-[color:var(--border-color)] py-10 text-xs text-[color:var(--text-muted)] transition-colors pointer-events-none">
                          拖拽任务到这里
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </ColumnDropZone>
              );
            })}
          </div>
          <DragOverlay>
            {activeTask ? <div className="rotate-3"><TaskCard task={activeTask} onEdit={() => {}} /></div> : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editing}
        columns={columns}
      />
    </div>
  );
}
