import { useState } from 'react';

interface EncryptionModalProps {
  onEncrypt: (userPassword?: string, ownerPassword?: string) => void;
  onClose: () => void;
}

export default function EncryptionModal({ onEncrypt, onClose }: EncryptionModalProps) {
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPassword && !ownerPassword) {
      alert('Please provide at least one password to encrypt the document.');
      return;
    }
    onEncrypt(userPassword || undefined, ownerPassword || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-lumvale-surface border border-lumvale-border rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-4 border-b border-lumvale-border flex justify-between items-center bg-[#0d1117]">
          <h2 className="text-xl font-bold text-lumvale-accent">Encrypt Document</h2>
          <button onClick={onClose} className="text-lumvale-muted hover:text-[var(--color-lumvale-text)] transition-colors">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="bg-blue-900/20 text-blue-400 p-3 rounded text-sm border border-blue-500/30">
              Set passwords to restrict access to this document using 128-bit RC4 encryption.
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-lumvale-muted">
                User Password (Required to open/view)
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                data-testid="meta-user-password"
                className="w-full bg-black/30 border border-lumvale-border rounded p-2 text-[var(--color-lumvale-text)] focus:border-lumvale-primary focus:outline-none transition-colors"
                placeholder="Enter password to view..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-lumvale-muted">
                Owner Password (Required to edit/change permissions)
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                data-testid="meta-owner-password"
                className="w-full bg-black/30 border border-lumvale-border rounded p-2 text-[var(--color-lumvale-text)] focus:border-lumvale-primary focus:outline-none transition-colors"
                placeholder="Enter password to edit..."
              />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input 
                type="checkbox" 
                checked={showPasswords} 
                onChange={() => setShowPasswords(!showPasswords)} 
                className="rounded border-lumvale-border bg-black/30 text-lumvale-primary focus:ring-lumvale-primary"
              />
              <span className="text-sm text-lumvale-muted select-none">Show Passwords</span>
            </label>
          </div>
        </form>

        <div className="p-4 border-t border-lumvale-border bg-[#0d1117] flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-lumvale-muted hover:text-[var(--color-lumvale-text)] transition-colors">
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={!userPassword && !ownerPassword}
            className="px-6 py-2 text-sm bg-lumvale-primary text-[var(--color-lumvale-text)] rounded font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lock PDF
          </button>
        </div>
      </div>
    </div>
  );
}
