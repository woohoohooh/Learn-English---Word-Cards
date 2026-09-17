import { ContentType, WordList } from '../types';

export const DataService = {
  async fetchFileList(type: ContentType): Promise<string[]> {
    try {
      const url = `/english/${type}/list.json?t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async fetchListItem(type: ContentType, filename: string): Promise<WordList | null> {
    try {
      const itemUrl = `/english/${type}/${filename}?t=${Date.now()}`;
      const res = await fetch(itemUrl);
      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          id: filename.replace('.json', ''),
          type,
          fullPath: `/english/${type}/${filename}`
        };
      }
      return null;
    } catch (e) {
      console.warn(`Failed to load list: ${filename}`, e);
      return null;
    }
  },

  async fetchLists(type: ContentType): Promise<WordList[]> {
    const fileList = await this.fetchFileList(type);
    const lists: WordList[] = [];
    for (const filename of fileList) {
      const item = await this.fetchListItem(type, filename);
      if (item) lists.push(item);
    }
    return lists;
  },

  getAudioPath(english: string, voice: string, type: ContentType): string {
    const cleanWord = english.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `/audio/${voice}_${type}/${cleanWord}.wav`;
  }
};
