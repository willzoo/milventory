import React, { useState } from 'react';
import EditForm from './EditForm';
import InventoryTable from './InventoryTable';

const RightPanel = ({
  selectedBox,
  inventoryData,
  currentEditingBox,
  currentEditingIndex,
  lastSelectedIndex,
  setCurrentEditingBox,
  setCurrentEditingIndex,
  setLastSelectedIndex,
  setCurrentAddingBox,
  updateInventory,
  handleDragStart,
  handleDrop,
  rightTabWidth,
  setRightTabWidth,
  editFormHeight,
  setEditFormHeight
}) => {
  const [isResizingRightTab, setIsResizingRightTab] = useState(false);
  const [isResizingEditForm, setIsResizingEditForm] = useState(false);
  const rightTabRef = React.useRef(null);
  const rightTabResizeRef = React.useRef(null);
  const editFormResizeRef = React.useRef(null);

  const boxData = selectedBox ? inventoryData.get(selectedBox) : null;
  const inventory = boxData ? boxData.inventory : [];

  const handleRightTabResizeStart = (e) => {
    setIsResizingRightTab(true);
    e.preventDefault();
  };

  const handleEditFormResizeStart = (e) => {
    setIsResizingEditForm(true);
    e.preventDefault();
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingRightTab) {
        const startX = rightTabResizeRef.current?.getBoundingClientRect().left || 0;
        const diff = startX - e.clientX;
        const newWidth = Math.max(200, Math.min(800, rightTabWidth + diff));
        setRightTabWidth(newWidth);
      }
      if (isResizingEditForm) {
        const startY = editFormResizeRef.current?.getBoundingClientRect().top || 0;
        const diff = startY - e.clientY;
        const newHeight = Math.max(250, Math.min(800, editFormHeight + diff));
        setEditFormHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingRightTab(false);
      setIsResizingEditForm(false);
    };

    if (isResizingRightTab || isResizingEditForm) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingRightTab, isResizingEditForm, rightTabWidth, editFormHeight]);

  return (
    <div className="right-tab" ref={rightTabRef}>
      <div
        ref={rightTabResizeRef}
        className={`right-tab-resize ${isResizingRightTab ? 'dragging' : ''}`}
        onMouseDown={handleRightTabResizeStart}
      />
      <h2>{selectedBox || 'Select an item'}</h2>
      <div className="pane-inventory">
        {selectedBox ? (
          <InventoryTable
            inventory={inventory}
            boxTitle={selectedBox}
            currentEditingBox={currentEditingBox}
            currentEditingIndex={currentEditingIndex}
            lastSelectedIndex={lastSelectedIndex}
            setCurrentEditingBox={setCurrentEditingBox}
            setCurrentEditingIndex={setCurrentEditingIndex}
            setLastSelectedIndex={setLastSelectedIndex}
            setCurrentAddingBox={setCurrentAddingBox}
            updateInventory={updateInventory}
            handleDragStart={handleDragStart}
            handleDrop={handleDrop}
          />
        ) : (
          <div className="inventory-list empty">Click on any inventory box to view its contents.</div>
        )}
      </div>
      <EditForm
        currentEditingBox={currentEditingBox}
        currentEditingIndex={currentEditingIndex}
        inventoryData={inventoryData}
        setCurrentEditingBox={setCurrentEditingBox}
        setCurrentEditingIndex={setCurrentEditingIndex}
        setLastSelectedIndex={setLastSelectedIndex}
        updateInventory={updateInventory}
        editFormHeight={editFormHeight}
        setEditFormHeight={setEditFormHeight}
        editFormResizeRef={editFormResizeRef}
        isResizingEditForm={isResizingEditForm}
        setIsResizingEditForm={setIsResizingEditForm}
      />
    </div>
  );
};

export default RightPanel;

