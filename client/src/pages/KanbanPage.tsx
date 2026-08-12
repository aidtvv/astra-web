import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import type { Task, Column } from '../types';
import SortableTaskCard from '../components/SortableTaskCard';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import SearchBar from '../components/SearchBar';

export default function KanbanPage() {
  const columns = useStore((s) => s.columns);
  const tasks = useStore((s) => s.tasks);
  const loading = useStore((s) => s.loading);
  const loadAll = useStore((s) => s.loadAll);
  const moveTaskToIndex = useStore((s) => s.moveTaskToIndex);

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredTasks = useMemo(
    () => (query.trim() ? tasks.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase())) : tasks),
    [tasks, query]
  );

  function tasksInColumn(columnId: number): Task[] {
    return filteredTasks.filter((t) => t.columnId === columnId).sort((a, b) => a.order - b.order);
  }

  function handleDragStart(e: { active: { id: React.ReactText } }) {
    setActiveId(Number(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdNum = Number(active.id);
    const overId = Number(over.id);

    const targetColumn = columns.find((c) => c.id === overId);
    if (targetColumn) {
      // Dropped directly on an empty column area → append at the end.
      const count = filteredTasks.filter((t) => t.columnId === targetColumn.id).length;
      await moveTaskToIndex(activeIdNum, targetColumn.id, count);
      return;
    }

    // Dropped on another task (same or different column).
    const overTask = filteredTasks.find((t) => t.id === overId);
    if (!overTask) return;
    const destColumnId = overTask.columnId;
    const withoutActive = filteredTasks.filter((t) => t.id !== activeIdNum);
    const targetColTasks = withoutActive
      .filter((t) => t.columnId === destColumnId)
      .sort((a, b) => a.order - b.order);
    const overIndex = targetColTasks.findIndex((t) => t.id === overId);
    const index = overIndex === -1 ? targetColTasks.length : overIndex;
    await moveTaskToIndex(activeIdNum, destColumnId, index);
  }

  const activeTask = activeId != null ? tasks.find((t) => t.id === activeId) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">任务看板</h1>
          <p className="mt-1 text-sm text-neutral-500">拖拽卡片管理你的任务流程</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56"><SearchBar value={query} onChange={setQuery} /></div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-95"
          >
            ＋ 新建任务
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-16 text-center text-sm text-neutral-400">加载中…</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {columns.map((column: Column) => {
              const colTasks = tasksInColumn(column.id);
              return (
                <section key={column.id} className="flex min-h-[240px] flex-col rounded-2xl bg-white/60 p-3 backdrop-blur-sm">
                  <header className="flex items-center justify-between px-1 pb-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                      <span>{column.emoji}</span>
                      {column.title}
                      <span className="rounded-full bg-appbg px-2 py-0.5 text-xs text-neutral-500">{colTasks.length}</span>
                    </h2>
                    <button
                      onClick={() => { setEditing(null); setModalOpen(true); useStore.setState({ modalDefaultColumn: column.id }); }}
                      aria-label={`添加到${column.title}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition hover:bg-appbg hover:text-neutral-700 active:scale-95"
                    >
                      ＋
                    </button>
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
                        <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 py-10 text-xs text-neutral-400">
                          拖拽任务到这里
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </section>
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
