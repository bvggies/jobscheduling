import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { machinesAPI } from '../services/api';
import { MACHINE_TYPES } from '../utils/constants';
import { FiPlus, FiEdit, FiTrash2, FiSettings } from 'react-icons/fi';
import './Machines.css';

const Machines = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const response = await machinesAPI.getAll();
      setMachines(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading machines:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this machine?')) {
      try {
        await machinesAPI.delete(id);
        loadMachines();
      } catch (error) {
        console.error('Error deleting machine:', error);
        alert('Failed to delete machine');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="machines-page" data-aos="fade-up">
      <div className="page-header">
        <div>
          <h1>Machines</h1>
          <p>Manage your printing machines and resources</p>
        </div>
        <Link to="/machines/new" className="btn btn-primary">
          <FiPlus /> New Machine
        </Link>
      </div>

      <div className="machines-grid">
        {machines.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <FiSettings className="empty-state-icon" />
              <p>No machines configured</p>
              <Link to="/machines/new" className="btn btn-primary btn-sm mt-2">
                Add First Machine
              </Link>
            </div>
          </div>
        ) : (
          machines.map((machine) => (
            <motion.div
              key={machine.id}
              className="machine-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="machine-header">
                <div className="machine-icon">
                  <FiSettings />
                </div>
                <div className="machine-info">
                  <h3>{machine.name}</h3>
                  <span className="machine-type">{machine.type}</span>
                </div>
              </div>
              <div className="machine-body">
                <div className="machine-compatibility">
                  <strong>Compatibility:</strong>
                  {machine.compatibility && machine.compatibility.length > 0 ? (
                    <div className="compatibility-tags">
                      {machine.compatibility.map((comp, index) => (
                        <span key={index} className="tag">
                          {comp}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-secondary">No restrictions</p>
                  )}
                </div>
              </div>
              <div className="machine-actions">
                <Link
                  to={`/machines/edit/${machine.id}`}
                  className="btn btn-outline btn-sm"
                >
                  <FiEdit /> Edit
                </Link>
                <button
                  onClick={() => handleDelete(machine.id)}
                  className="btn btn-danger btn-sm"
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Machines;

