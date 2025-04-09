import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTrash, FaSync, FaPlus, FaUser, FaCrown, FaChevronRight, FaTimes, FaTrophy } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function App() {
  const [users, setUsers] = useState([]);
  const [newHandle, setNewHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState(null); // 'add' or 'delete'
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    handle: null,
    username: null,
    rating: null
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/users');
      const usersWithMaxRating = await Promise.all(
        response.data.map(async (user) => {
          try {
            const ratingResponse = await axios.get(
              `https://codeforces.com/api/user.rating?handle=${user.handle}`
            );
            const maxRating = Math.max(...ratingResponse.data.result.map(r => r.newRating), user.rating);
            return { ...user, maxRating };
          } catch {
            return { ...user, maxRating: user.rating };
          }
        })
      );
      setUsers(usersWithMaxRating.sort((a, b) => b.rating - a.rating));
      setError('');
    } catch (err) {
      setError('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    if (!newHandle.trim()) return;
    
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5000/api/users', {
        handle: newHandle.trim()
      });
      
      // Fetch max rating for new user
      let maxRating = response.data.rating;
      try {
        const ratingResponse = await axios.get(
          `https://codeforces.com/api/user.rating?handle=${newHandle.trim()}`
        );
        maxRating = Math.max(...ratingResponse.data.result.map(r => r.newRating), response.data.rating);
      } catch (e) {
        console.error("Couldn't fetch rating history", e);
      }

      setUsers([...users, { ...response.data, maxRating }].sort((a, b) => b.rating - a.rating));
      setNewHandle('');
      setError('');
      setActivePanel(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add user');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (handle) => {
    try {
      setLoading(true);
      await axios.delete(`http://localhost:5000/api/users/${handle}`);
      setUsers(users.filter(user => user.handle !== handle));
      setError('');
      setDeleteConfirmation({ show: false, handle: null });
    } catch (err) {
      setError('Failed to delete user');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateAllUsers = async () => {
    try {
      setLoading(true);
      await axios.get('http://localhost:5000/api/update-all');
      await fetchUsers(); // Re-fetch to update max ratings too
      setError('');
    } catch (err) {
      setError('Failed to update users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showDeleteConfirmation = (user) => {
    setDeleteConfirmation({
      show: true,
      handle: user.handle,
      username: user.handle,
      rating: user.rating
    });
  };

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRatingColor = (rating) => {
    if (rating >= 3000) return '#000000';
    if (rating >= 2600) return '#ff0000';
    if (rating >= 2400) return '#ff0000';
    if (rating >= 2300) return '#ff8c00';
    if (rating >= 2200) return '#ff8c00';
    if (rating >= 1900) return '#aa00aa';
    if (rating >= 1600) return '#0000ff';
    if (rating >= 1400) return '#03a89e';
    if (rating >= 1200) return '#008000';
    if (rating > 0) return '#808080';
    return '#000000';
  };

  const getRankIcon = (rank) => {
    if (rank.includes('grandmaster')) return <FaCrown color="#ff0000" />;
    if (rank.includes('master')) return <FaCrown color="#ff8c00" />;
    return null;
  };

  return (
    <div className="app">
      {/* Add User Panel */}
      <div className={`control-panel add-panel ${activePanel === 'add' ? 'open' : ''}`}>
        <button 
          className="panel-toggle"
          onClick={() => togglePanel('add')}
        >
          <FaChevronRight className={`chevron ${activePanel === 'add' ? 'open' : ''}`} />
          <span className="toggle-label">Add User</span>
        </button>
        
        <AnimatePresence>
          {activePanel === 'add' && (
            <motion.div 
              className="panel-content"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
            >
              <button 
                className="close-panel"
                onClick={() => setActivePanel(null)}
              >
                <FaTimes />
              </button>
              
              <div className="control-group">
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  placeholder="Enter Codeforces handle"
                  onKeyPress={(e) => e.key === 'Enter' && addUser()}
                  className="control-input"
                />
                <button onClick={addUser} disabled={loading} className="control-btn add">
                  <FaPlus /> Add
                </button>
              </div>
              
              <button 
                onClick={updateAllUsers} 
                disabled={loading}
                className="control-btn refresh"
              >
                <FaSync /> Refresh All
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete User Panel */}
      <div className={`control-panel delete-panel ${activePanel === 'delete' ? 'open' : ''}`}>
        <button 
          className="panel-toggle"
          onClick={() => togglePanel('delete')}
        >
          <FaChevronRight className={`chevron ${activePanel === 'delete' ? 'open' : ''}`} />
          <span className="toggle-label">Manage Users</span>
        </button>
        
        <AnimatePresence>
          {activePanel === 'delete' && (
            <motion.div 
              className="panel-content"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
            >
              <button 
                className="close-panel"
                onClick={() => setActivePanel(null)}
              >
                <FaTimes />
              </button>
              
              <h3>Manage Tracked Users</h3>
              
              <div className="user-list-scroll">
                {users.length > 0 ? (
                  users.map((user) => (
                    <div key={user.handle} className="user-list-item">
                      <div className="user-info">
                        <span 
                          className="user-handle"
                          style={{ color: getRatingColor(user.rating) }}
                        >
                          {user.handle}
                        </span>
                        <div className="user-ratings">
                          <span className="user-rating">
                            Current: {user.rating}
                          </span>
                          <span className="user-max-rating">
                            <FaTrophy /> Max: {user.maxRating || user.rating}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => showDeleteConfirmation(user)}
                        className="delete-btn"
                        disabled={loading}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-message">No users to display</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h3>Confirm Deletion</h3>
            <p>
              Are you sure you want to delete <strong>{deleteConfirmation.username}</strong> 
              {deleteConfirmation.rating ? ` (Rating: ${deleteConfirmation.rating})` : ''}?
            </p>
            <div className="confirmation-buttons">
              <button 
                onClick={() => setDeleteConfirmation({ show: false, handle: null })}
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={() => deleteUser(deleteConfirmation.handle)}
                className="confirm-btn"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <h1>
          <span className="gradient-text">Codeforces</span> Tracker
        </h1>
        <div className="subtitle">Competitive Programming Progress Monitor</div>
      </header>

      {error && (
        <motion.div 
          className="error"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      )}

      <div className="users-list">
        <AnimatePresence>
          {users.map((user, index) => (
            <motion.div
              key={user.handle}
              className="user-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              layout
            >
              <div className="user-rank">
                #{index + 1}
                {index < 3 && <div className="rank-badge">{index + 1}</div>}
              </div>
              
              <div className="user-avatar">
                <div 
                  className="avatar-circle"
                  style={{ borderColor: getRatingColor(user.rating) }}
                >
                  <FaUser size={24} color={getRatingColor(user.rating)} />
                </div>
              </div>
              
              <div className="user-info">
                <div className="info-header">
                  <a
                    href={`https://codeforces.com/profile/${user.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: getRatingColor(user.rating) }}
                    className="user-handle"
                  >
                    {user.handle}
                    {getRankIcon(user.rank)}
                  </a>
                </div>
                
                <div className="info-details">
                  <div className="rating" style={{ color: getRatingColor(user.rating) }}>
                    <span className="label">Rating:</span> {user.rating}
                  </div>
                  <div className="max-rating" style={{ color: getRatingColor(user.maxRating || user.rating) }}>
                    <span className="label">Max:</span> {user.maxRating || user.rating} <FaTrophy size={12} />
                  </div>
                  <div className="rank" style={{ color: getRatingColor(user.rating) }}>
                    <span className="label">Rank:</span> {user.rank}
                  </div>
                </div>
                
                <div className="last-updated">
                  Updated: {new Date(user.lastUpdated).toLocaleString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {users.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">
              <FaUser size={48} />
            </div>
            <h3>No users added yet</h3>
            <p>Add Codeforces handles to start tracking</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;