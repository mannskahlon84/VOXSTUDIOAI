import React, { useState } from 'react';
import { X, FolderPlus, Clock, Database, ChevronRight, Play, Trash2, Calendar, FileText, Check, Undo2 } from 'lucide-react';
import { translations } from '../assets/translations';

const ProjectTimelineDrawer = ({
  isOpen,
  onClose,
  activeProject,
  projectsList,
  onCreateProject,
  onDeleteProject,
  onLoadProject,
  onRevertToRevision,
  onDeleteRevision,
  onSaveManualSnapshot,
  language
}) => {
  const t = translations[language] || translations.en;
  const [newProjName, setNewProjName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('history'); // 'history', 'assets', 'switch'

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    onCreateProject(newProjName.trim());
    setNewProjName('');
  };

  const handleSaveSnapshot = (e) => {
    e.preventDefault();
    if (!snapshotDesc.trim()) return;
    onSaveManualSnapshot(snapshotDesc.trim());
    setSnapshotDesc('');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '420px',
      height: '100vh',
      background: 'rgba(15, 15, 20, 0.95)',
      backdropFilter: 'blur(16px)',
      borderLeft: '1px solid var(--border-color)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.6)',
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {activeProject ? `📁 Project: ${activeProject.name}` : '📁 Project Studio'}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Unified Project Workspace & Version Control
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Sub Tabs */}
      {activeProject && (
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {[
            { id: 'history', label: '🕒 History Timeline', icon: <Clock size={12} /> },
            { id: 'assets', label: '📦 Assets Library', icon: <Database size={12} /> },
            { id: 'switch', label: '🔄 Switch Project', icon: <FolderPlus size={12} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                border: 'none',
                background: activeSubTab === tab.id ? 'var(--bg-card)' : 'transparent',
                color: activeSubTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                borderBottom: activeSubTab === tab.id ? '2px solid var(--accent-primary)' : 'none'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        {!activeProject || activeSubTab === 'switch' ? (
          /* Switch/Create Project View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Create Project Form */}
            <form onSubmit={handleCreate} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FolderPlus size={14} style={{ color: 'var(--accent-primary)' }} />
                Create New Project
              </h4>
              <input
                type="text"
                placeholder="e.g. My Cover Remix A"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.45rem' }}
              />
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '0.45rem' }}>
                Create Workspace
              </button>
            </form>

            {/* List of projects */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>
                Load Existing Projects ({projectsList.length})
              </h4>
              {projectsList.length === 0 ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No saved projects found. Create one above to get started!</span>
              ) : (
                projectsList.map(proj => {
                  const isActive = activeProject && activeProject.id === proj.id;
                  return (
                    <div
                      key={proj.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        background: isActive ? 'var(--accent-glow)' : 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-color)'
                      }}
                      onClick={() => onLoadProject(proj)}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                          {proj.name}
                          {isActive && <Check size={12} />}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          Updated {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {!isActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(proj.id);
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Delete Project"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : activeSubTab === 'history' ? (
          /* Revision History Timeline View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Create manual checkpoint */}
            <form onSubmit={handleSaveSnapshot} className="glass-panel" style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Save current workspace checkpoint</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="e.g. Added chorus vocal overlay..."
                  value={snapshotDesc}
                  onChange={(e) => setSnapshotDesc(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.78rem', padding: '0.35rem', flex: 1 }}
                />
                <button type="submit" className="btn-primary" style={{ fontSize: '0.72rem', padding: '0.35rem' }}>
                  Save
                </button>
              </div>
            </form>

            {/* Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '1.25rem', borderLeft: '2px solid var(--border-color)' }}>
              {activeProject.history && activeProject.history.length === 0 ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No revision checkpoints yet. Try making changes to generate logs automatically.</span>
              ) : (
                [...activeProject.history].reverse().map((entry, index) => (
                  <div key={entry.id} style={{ position: 'relative', marginBottom: '1.25rem' }}>
                    {/* timeline node icon */}
                    <div style={{
                      position: 'absolute',
                      left: '-26px',
                      top: '2px',
                      background: 'var(--accent-primary)',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      border: '2px solid var(--bg-primary)'
                    }} />

                    <div style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.65rem 0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                          {entry.description}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <button
                          onClick={() => onRevertToRevision(entry)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Revert to this state"
                        >
                          <Undo2 size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteRevision(entry.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Delete this change log"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Assets Library View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>
              Project File Library
            </h4>
            {activeProject.assets && activeProject.assets.length === 0 ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No files generated or uploaded in this project yet. Try compiling a song or uploading backdrop images!</span>
            ) : (
              activeProject.assets.map(asset => (
                <div
                  key={asset.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.8rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <FileText size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {asset.name}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {asset.type}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {asset.url && (
                      <a
                        href={asset.url}
                        download={asset.name}
                        className="btn-secondary"
                        style={{ padding: '0.3rem', borderRadius: '4px', border: 'none', display: 'flex' }}
                        title="Download file"
                      >
                        <Play size={10} style={{ transform: 'rotate(90deg)' }} />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTimelineDrawer;
