import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

const InventoryContext = createContext(null);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Map location types to fill colors
const getFillColor = (type) => {
  const typeLower = (type || '').toLowerCase();
  if (typeLower.includes('workbench')) return '#e7ebf3';
  if (typeLower.includes('file') || typeLower.includes('cabinet')) return 'var(--files)';
  if (typeLower.includes('drawer')) return 'var(--drawer)';
  if (typeLower.includes('table')) return 'var(--table)';
  return 'var(--files)'; // default
};

// Transform API data into inventory data format
const transformApiData = (locations, supplies) => {
  // Group supplies by location
  const suppliesByLocation = new Map();
  supplies.forEach(supply => {
    const location = supply.location;
    if (!suppliesByLocation.has(location)) {
      suppliesByLocation.set(location, []);
    }
    suppliesByLocation.get(location).push(supply);
  });

    // Transform locations into inventory data format
    const newInventoryData = new Map();
    locations.forEach(location => {
      const locationSupplies = suppliesByLocation.get(location.name) || [];
      const inventory = locationSupplies.map(supply => ({
        id: supply.id,
        name: supply.name,
        qty: supply.amount,
        description: '',
        image: null
      }));

    newInventoryData.set(location.name, {
      title: location.name,
      x: location.x,
      y: location.y,
      width: location.width,
      height: location.height,
      fill: getFillColor(location.type),
      isWorkbench: location.type.toLowerCase().includes('workbench'),
      inventory
    });
  });

  return newInventoryData;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
};

export const InventoryProvider = ({ children }) => {
  // State
  const [inventoryData, setInventoryData] = useState(new Map());
  const [selectedBox, setSelectedBox] = useState(null);
  const [currentEditingBox, setCurrentEditingBox] = useState(null);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const [currentAddingBox, setCurrentAddingBox] = useState(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [draggedItemData, setDraggedItemData] = useState(null);
  const [currentDragOverBox, setCurrentDragOverBox] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, title: '', x: 0, y: 0 });
  const [rightTabWidth, setRightTabWidth] = useState(300);
  const [editFormHeight, setEditFormHeight] = useState(400);
  
  // Refs
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const worldRef = useRef(null);

  // Load data from API (non-blocking - allows SVG to mount immediately)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch locations and supplies in parallel
        const [locationsRes, suppliesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/locations`),
          fetch(`${API_BASE_URL}/supplies`)
        ]);

        if (!locationsRes.ok || !suppliesRes.ok) {
          console.error('Failed to load data from API');
          return;
        }

        const locations = await locationsRes.json();
        const supplies = await suppliesRes.json();

        const newInventoryData = transformApiData(locations, supplies);
        setInventoryData(newInventoryData);
      } catch (error) {
        console.error('Error loading data from API:', error);
      }
    };

    loadData();
  }, []);

  // Setup D3 zoom
  useEffect(() => {
    if (!svgRef.current || !worldRef.current) return;

    const zoom = d3.zoom()
      .scaleExtent([0.6, 6])
      .on('zoom', (e) => {
        if (worldRef.current) {
          worldRef.current.setAttribute('transform', e.transform);
        }
      });
    
    const svg = d3.select(svgRef.current);
    svg.call(zoom).on('dblclick.zoom', null);
    svg.call(zoom.transform, d3.zoomIdentity.scale(1.03));

    // Cleanup
    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  // Update CSS variables
  useEffect(() => {
    document.body.style.setProperty('--right-tab-width', `${rightTabWidth}px`);
  }, [rightTabWidth]);

  useEffect(() => {
    const rightTab = document.querySelector('.right-tab');
    if (rightTab) {
      rightTab.style.setProperty('--edit-form-height', `${editFormHeight}px`);
    }
  }, [editFormHeight]);

  // Handlers
  const handleBoxClick = useCallback((boxTitle) => {
    setSelectedBox(boxTitle);
    setCurrentEditingBox(null);
    setCurrentEditingIndex(null);
    setLastSelectedIndex(null);
    setCurrentAddingBox(null);
    setTooltip({ visible: false, title: '', x: 0, y: 0 });
  }, []);

  const handleBoxHover = useCallback((boxTitle, x, y) => {
    const boxData = inventoryData.get(boxTitle);
    if (boxData) {
      setTooltip({ visible: true, title: boxTitle, x, y });
    }
  }, [inventoryData]);

  const handleBoxHoverLeave = useCallback(() => {
    setTooltip({ visible: false, title: '', x: 0, y: 0 });
  }, []);

  const updateInventory = useCallback((boxTitle, newInventory) => {
    setInventoryData(prev => {
      const next = new Map(prev);
      const boxData = next.get(boxTitle);
      if (boxData) {
        next.set(boxTitle, { ...boxData, inventory: newInventory });
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((boxTitle, index, isMultiple, selectedIndices) => {
    const boxData = inventoryData.get(boxTitle);
    if (!boxData) return;

    if (isMultiple && selectedIndices.length > 1) {
      const items = selectedIndices.map(idx => ({ ...boxData.inventory[idx] }));
      setDraggedItemData({
        sourceBox: boxTitle,
        sourceIndices: selectedIndices,
        items,
        isMultiple: true
      });
    } else {
      setDraggedItemData({
        sourceBox: boxTitle,
        sourceIndex: index,
        item: { ...boxData.inventory[index] },
        isMultiple: false
      });
    }
  }, [inventoryData]);

  const handleDrop = useCallback(async (targetBoxTitle) => {
    if (!draggedItemData || draggedItemData.sourceBox === targetBoxTitle) return;

    const sourceBoxData = inventoryData.get(draggedItemData.sourceBox);
    const targetBoxData = inventoryData.get(targetBoxTitle);
    if (!sourceBoxData || !targetBoxData) return;

    // Update UI optimistically
    let newSourceInventory = [...sourceBoxData.inventory];
    let newTargetInventory = [...targetBoxData.inventory];

    if (draggedItemData.isMultiple) {
      const sortedIndices = [...draggedItemData.sourceIndices].sort((a, b) => b - a);
      sortedIndices.forEach(idx => {
        newSourceInventory.splice(idx, 1);
      });
      newTargetInventory.push(...draggedItemData.items);
    } else {
      newSourceInventory.splice(draggedItemData.sourceIndex, 1);
      newTargetInventory.push(draggedItemData.item);
    }

    updateInventory(draggedItemData.sourceBox, newSourceInventory);
    updateInventory(targetBoxTitle, newTargetInventory);

    // Persist to API
    try {
      if (draggedItemData.isMultiple) {
        // Move each item individually
        await Promise.all(draggedItemData.items.map(item =>
          fetch(`${API_BASE_URL}/supplies/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: item.name,
              from_location: draggedItemData.sourceBox,
              to_location: targetBoxTitle,
              amount: item.qty
            })
          })
        ));
      } else {
        // Move single item
        await fetch(`${API_BASE_URL}/supplies/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: draggedItemData.item.name,
            from_location: draggedItemData.sourceBox,
            to_location: targetBoxTitle,
            amount: draggedItemData.item.qty
          })
        });
      }
    } catch (error) {
      console.error('Error persisting move to API:', error);
      // On error, reload data from API to sync state
      const [locationsRes, suppliesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/locations`),
        fetch(`${API_BASE_URL}/supplies`)
      ]);
      if (locationsRes.ok && suppliesRes.ok) {
        const locations = await locationsRes.json();
        const supplies = await suppliesRes.json();
        const newInventoryData = transformApiData(locations, supplies);
        setInventoryData(newInventoryData);
      }
    }

    // Auto-select the target box after successful drop
    setSelectedBox(targetBoxTitle);
    setCurrentEditingBox(null);
    setCurrentEditingIndex(null);
    setLastSelectedIndex(null);

    setDraggedItemData(null);
    setCurrentDragOverBox(null);
  }, [draggedItemData, inventoryData, updateInventory]);

  // Reload data from API
  const reloadData = useCallback(async () => {
    try {
      const [locationsRes, suppliesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/locations`),
        fetch(`${API_BASE_URL}/supplies`)
      ]);

      if (locationsRes.ok && suppliesRes.ok) {
        const locations = await locationsRes.json();
        const supplies = await suppliesRes.json();
        const newInventoryData = transformApiData(locations, supplies);
        setInventoryData(newInventoryData);
      }
    } catch (error) {
      console.error('Error reloading data from API:', error);
    }
  }, []);

  const value = {
    // State
    inventoryData,
    selectedBox,
    currentEditingBox,
    currentEditingIndex,
    currentAddingBox,
    lastSelectedIndex,
    draggedItemData,
    currentDragOverBox,
    tooltip,
    rightTabWidth,
    editFormHeight,
    // Setters
    setInventoryData,
    setSelectedBox,
    setCurrentEditingBox,
    setCurrentEditingIndex,
    setCurrentAddingBox,
    setLastSelectedIndex,
    setDraggedItemData,
    setCurrentDragOverBox,
    setTooltip,
    setRightTabWidth,
    setEditFormHeight,
    // Refs
    wrapRef,
    svgRef,
    worldRef,
    // Handlers
    handleBoxClick,
    handleBoxHover,
    handleBoxHoverLeave,
    updateInventory,
    handleDragStart,
    handleDrop,
    reloadData,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

