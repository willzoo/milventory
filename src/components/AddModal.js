import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';

const AddModal = () => {
  const { currentAddingBox, setCurrentAddingBox, reloadData } = useInventory();
  
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (currentAddingBox) {
      setName('');
      setQty(1);
      setDescription('');
      setIsSaving(false);
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [currentAddingBox]);

  const handleSave = async () => {
    if (currentAddingBox && name.trim() && !isSaving) {
      setIsSaving(true);
      try {
        const response = await fetch(`${API_BASE_URL}/supplies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            amount: parseInt(qty) || 1,
            location: currentAddingBox
          })
        });

        if (response.ok) {
          await reloadData();
          setCurrentAddingBox(null);
        } else {
          const error = await response.json();
          console.error('Error creating supply:', error);
          alert(`Failed to add item: ${error.error || 'Unknown error'}`);
          setIsSaving(false);
        }
      } catch (error) {
        console.error('Error creating supply:', error);
        alert('Failed to add item. Please try again.');
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setCurrentAddingBox(null);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.target === nameInputRef.current) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      className={`modal-overlay ${currentAddingBox ? 'visible' : ''}`}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="modal">
        <h3>Add Item</h3>
        <input
          ref={nameInputRef}
          type="text"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Quantity"
          value={qty}
          min="0"
          onChange={(e) => setQty(e.target.value)}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="modal-actions">
          <button type="button" className="cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddModal;

