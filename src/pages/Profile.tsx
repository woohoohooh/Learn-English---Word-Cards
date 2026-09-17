import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ContentType, WordList } from '../types';
import { Upload, Music, FileJson, CheckCircle2, AlertCircle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { voice, setVoice, lists, setLists } = useAppStore();
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);

  const voices = ['kore', 'zephyr', 'charon', 'fenrir', 'puck'];

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: ContentType) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const newLists: WordList[] = [];
      for (let i = 0; i < files.length; i++) {
        const text = await files[i].text();
        const data = JSON.parse(text);
        
        // Persist to server
        const response = await fetch('/api/upload-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            filename: files[i].name,
            content: data
          })
        });

        if (!response.ok) throw new Error(`Failed to upload ${files[i].name}`);

        newLists.push({
          ...data,
          id: files[i].name.replace('.json', ''),
          type
        });
      }
      
      const currentLists = [...lists[type]];
      const merged = [...currentLists];
      newLists.forEach(newList => {
        const index = merged.findIndex(l => l.id === newList.id);
        if (index !== -1) merged[index] = newList;
        else merged.push(newList);
      });

      setLists(type, merged);
      setStatus({ type: 'success', message: `Successfully uploaded and persisted ${newLists.length} ${type} lists.` });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to upload files. Check server logs.' });
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: ContentType) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const BATCH_SIZE = 50;
    setUploadProgress({ current: 0, total: files.length });
    setStatus(null);

    try {
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const formData = new FormData();
        batch.forEach(file => formData.append('files', file));

        const response = await fetch(`/api/upload-audio?voice=${voice}&type=${type}`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error(`Failed to upload batch starting at ${i}`);
        
        setUploadProgress(prev => prev ? { ...prev, current: Math.min(i + BATCH_SIZE, files.length) } : null);
      }
      
      setStatus({ type: 'success', message: `Successfully uploaded ${files.length} audio files to ${voice}_${type}.` });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to upload audio files. Try smaller batches or check server logs.' });
    } finally {
      setUploadProgress(null);
    }
  };

  return (
    <div className="px-6 py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold mb-2">Profile</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Settings & Data Management</p>
      </header>

      {status && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border ${
          status.type === 'success' ? 'bg-[#4caf50]/10 border-[#4caf50]/20 text-[#4caf50]' : 'bg-[#f44336]/10 border-[#f44336]/20 text-[#f44336]'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-bold">{status.message}</p>
        </div>
      )}

      {uploadProgress && (
        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Uploading...</span>
            <span className="text-xs font-mono text-[#4caf50]">{uploadProgress.current} / {uploadProgress.total}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#4caf50] transition-all duration-300" 
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Voice</h2>
        <div className="grid grid-cols-3 gap-3">
          {voices.map(v => (
            <button
              key={v}
              onClick={() => setVoice(v)}
              className={`py-3 rounded-xl font-bold capitalize border transition-all ${
                voice === v 
                  ? 'bg-[#4caf50] border-[#4caf50] text-white shadow-lg shadow-[#4caf50]/20' 
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Import JSON Lists</h2>
        
        <UploadCard 
          title="Words JSON" 
          icon={<FileJson className="text-[#4caf50]" />} 
          onChange={(e) => handleJsonUpload(e, 'words')} 
        />
        <UploadCard 
          title="Phrases JSON" 
          icon={<FileJson className="text-[#2196f3]" />} 
          onChange={(e) => handleJsonUpload(e, 'phrases')} 
        />
        <UploadCard 
          title="Sentences JSON" 
          icon={<FileJson className="text-[#9c27b0]" />} 
          onChange={(e) => handleJsonUpload(e, 'sentences')} 
        />

        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 pt-4">Import Audio ({voice})</h2>
        <div className="space-y-3">
          <UploadCard 
            title="Upload to Words" 
            icon={<Music className="text-[#4caf50]" />} 
            accept="audio/*"
            onChange={(e) => handleAudioUpload(e, 'words')} 
          />
          <UploadCard 
            title="Upload to Phrases" 
            icon={<Music className="text-[#2196f3]" />} 
            accept="audio/*"
            onChange={(e) => handleAudioUpload(e, 'phrases')} 
          />
          <UploadCard 
            title="Upload to Sentences" 
            icon={<Music className="text-[#9c27b0]" />} 
            accept="audio/*"
            onChange={(e) => handleAudioUpload(e, 'sentences')} 
          />
        </div>

        <div className="pt-4">
          <div className="p-6 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
            <Music className="mx-auto mb-3 text-gray-500" size={32} />
            <h3 className="font-bold mb-1">Audio Assets</h3>
            <p className="text-xs text-gray-500 mb-4">Audio files should be named exactly like the English word (e.g., "leadership.wav").</p>
            <div className="text-[10px] font-mono text-gray-600 bg-black/20 p-2 rounded-lg text-left overflow-x-auto">
              Current Voice: {voice}<br/>
              Target: /audio/{voice}_[category]/
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

interface UploadCardProps {
  title: string;
  icon: React.ReactNode;
  accept?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UploadCard: React.FC<UploadCardProps> = ({ title, icon, accept = ".json", onChange }) => {
  return (
    <label className="flex items-center justify-between p-5 bg-[#1e1e1e] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-xl">
          {icon}
        </div>
        <span className="font-bold">{title}</span>
      </div>
      <div className="p-2 text-gray-500">
        <Upload size={20} />
      </div>
      <input type="file" multiple accept={accept} className="hidden" onChange={onChange} />
    </label>
  );
};
