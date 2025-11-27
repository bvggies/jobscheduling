import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { machinesAPI } from '../services/api';
import { MACHINE_TYPES, SUBSTRATES } from '../utils/constants';
import { FiSave, FiX } from 'react-icons/fi';
import './MachineForm.css';

const MachineForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    compatibility: [],
  });

  const [loading, setLoading] = useState(false);

  const loadMachine = useCallback(async () => {
    try {
      const response = await machinesAPI.getById(id);
      const machine = response.data;
      setFormData({
        name: machine.name || '',
        type: machine.type || '',
        compatibility: machine.compatibility || [],
      });
    } catch (error) {
      console.error('Error loading machine:', error);
      alert('Failed to load machine');
      navigate('/machines');
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isEdit) {
      loadMachine();
    }
  }, [isEdit, loadMachine]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCompatibilityChange = (substrate) => {
    const current = formData.compatibility || [];
    if (current.includes(substrate)) {
      setFormData({
        ...formData,
        compatibility: current.filter((s) => s !== substrate),
      });
    } else {
      setFormData({ ...formData, compatibility: [...current, substrate] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        await machinesAPI.update(id, formData);
      } else {
        await machinesAPI.create(formData);
      }

      navigate('/machines');
    } catch (error) {
      console.error('Error saving machine:', error);
      alert('Failed to save machine');
      setLoading(false);
    }
  };

  return (
    <div className="machine-form-page" data-aos="fade-up">
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit Machine' : 'New Machine'}</h1>
          <p>{isEdit ? 'Update machine details' : 'Add a new printing machine'}</p>
        </div>
        <button onClick={() => navigate('/machines')} className="btn btn-outline">
          <FiX /> Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="machine-form">
        <div className="form-section">
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Machine Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Machine Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">Select Machine Type</option>
                {MACHINE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Compatibility</h2>
          <p className="form-help-text">
            Select substrates this machine can handle. Leave empty if machine can handle all substrates.
          </p>
          <div className="compatibility-options">
            {SUBSTRATES.map((substrate) => (
              <label key={substrate} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.compatibility?.includes(substrate)}
                  onChange={() => handleCompatibilityChange(substrate)}
                />
                <span>{substrate}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FiSave /> {loading ? 'Saving...' : isEdit ? 'Update Machine' : 'Create Machine'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MachineForm;

