import { create } from 'zustand';

/** Screen-level UI that isn't saved: which chest is being opened. */
interface UiStore {
  chestId: string | null;
  openChest(id: string): void;
  closeChest(): void;
}

export const useUiStore = create<UiStore>()((set) => ({
  chestId: null,
  openChest: (id) => set({ chestId: id }),
  closeChest: () => set({ chestId: null }),
}));
