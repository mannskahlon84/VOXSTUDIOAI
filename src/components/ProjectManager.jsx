import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Trash2, Edit2, Play, Calendar, Film, Mic, BookOpen, Tv } from 'lucide-react';
import { translations } from '../assets/translations';
import { safeStorage, safeJsonParse } from '../utils/storage';

const ProjectManager = ({ isOpen, onClose, onSelectProject, userEmail, language }) => {
  const t = translations[language] || translations.en;
  
  const [projects, setProjects] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');

  // Load projects from local storage
  const loadProjects = () => {
    const allProjects = safeJsonParse(safeStorage.getItem('vox_projects'), []);
    // Filter by user owner (if logged in, filter by email, otherwise show guest projects)
    const owner = userEmail || 'guest';
    const userProjects = allProjects.filter(p => p.owner === owner);
    setProjects(userProjects.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  // Rename project
  const handleRename = (id) => {
    if (!newName.trim()) return;
    const allProjects = safeJsonParse(safeStorage.getItem('vox_projects'), []);
    const updated = allProjects.map(p => {
      if (p.id === id) {
        return { ...p, name: newName.trim(), updatedAt: Date.now() };
      }
      return p;
    });
    safeStorage.setItem('vox_projects', JSON.stringify(updated));
    setEditingId(null);
    setNewName('');
    loadProjects();
  };

  // Delete project
  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    const allProjects = safeJsonParse(safeStorage.getItem('vox_projects'), []);
    const filtered = allProjects.filter(p => p.id !== id);
    safeStorage.setItem('vox_projects', JSON.stringify(filtered));
    loadProjects();
  };

  const getModuleIcon = (type) => {
    switch (type) {
      case 'voice': return <Mic size={16} style={{ color: '#8b5cf6' }} />;
      case 'poetry': return <BookOpen size={16} style={{ color: '#ec4899' }} />;
      case 'video': return <Film size={16} style={{ color: '#0ea5e9' }} />;
      case 'reaction': return <Tv size={16} style={{ color: '#10b981' }} />;
      default: return <FolderOpen size={16} />;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        width: '560px',
        maxHeight: '80vh',
        padding: '2rem',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        animation: 'fadeIn 0.3s ease'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }} className="gradient-text">
            My Saved Projects & Drafts
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Account: <strong style={{ color: 'var(--text-primary)' }}>{userEmail || 'Local Guest Mode'}</strong>
          </p>
        </div>

        {/* Projects list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          minHeight: '260px',
          maxHeight: '400px',
          paddingRight: '4px'
        }}>
          {projects.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: 'var(--text-secondary)',
              gap: '8px'
            }}>
              <FolderOpen size={32} style={{ opacity: 0.4 }} />
              <span style={{ fontSize: '0.9rem' }}>No saved drafts found.</span>
              <span style={{ fontSize: '0.75rem', textAlign: 'center', maxWidth: '300px' }}>
                Open any tool workspace (Voice, Poetry, Video Editor) and click "Save Draft" to see it here!
              </span>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'border-color 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                  {/* Icon */}
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)'
                  }}>
                    {getModuleIcon(project.type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    {editingId === project.id ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="form-input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        />
                        <button
                          onClick={() => handleRename(project.id)}
                          className="btn-primary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                          {project.name}
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span style={{ textTransform: 'capitalize' }}>{project.type} Studio</span>
                          <span>•</span>
                          <Calendar size={10} />
                          <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {editingId !== project.id && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => onSelectProject(project)}
                      className="btn-secondary"
                      style={{ padding: '0.4rem', borderRadius: '6px' }}
                      title="Load Project"
                    >
                      <Play size={14} style={{ color: 'var(--accent-primary)' }} />
                    </button>
                    <button
                      onClick={() => { setEditingId(project.id); setNewName(project.name); }}
                      className="btn-secondary"
                      style={{ padding: '0.4rem', borderRadius: '6px' }}
                      title="Rename"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="btn-secondary"
                      style={{ padding: '0.4rem', borderRadius: '6px', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      title="Delete"
                    >
                      <Trash2 size={14} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
