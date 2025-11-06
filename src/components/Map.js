import React, { forwardRef } from 'react';

const MapComponent = forwardRef(({ worldRef, boxes, selectedBox, currentDragOverBox, onBoxClick, onBoxHover, onBoxHoverLeave, onDragStart, onDrop, setCurrentDragOverBox }, ref) => {
  const handleBoxMouseEnter = (e, boxTitle) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const wrap = e.currentTarget.closest('.wrap');
    if (wrap) {
      const wrapRect = wrap.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - wrapRect.left;
      const y = rect.top + rect.height / 2 - wrapRect.top;
      onBoxHover(boxTitle, x, y);
    }
  };

  const handleDragEnter = (e, boxTitle) => {
    e.preventDefault();
    if (boxTitle !== currentDragOverBox) {
      setCurrentDragOverBox(boxTitle);
    }
  };

  const handleDragOver = (e, boxTitle) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (boxTitle !== currentDragOverBox) {
      setCurrentDragOverBox(boxTitle);
    }
  };

  const handleDragLeave = (e, boxTitle) => {
    setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        if (currentDragOverBox === boxTitle) {
          setCurrentDragOverBox(null);
        }
      }
    }, 0);
  };

  const handleDrop = (e, boxTitle) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(boxTitle);
    setCurrentDragOverBox(null);
  };

  return (
    <svg ref={ref} className="map" viewBox="0 0 1600 1800" aria-label="Room map">
      <g ref={worldRef} id="world">
        <rect className="room" x="80" y="80" width="1440" height="1600" rx="18" ry="18"/>
        
        {boxes.map((box, idx) => (
          <rect
            key={idx}
            className={`box ${selectedBox === box.title ? 'selected' : ''} ${currentDragOverBox === box.title ? 'drag-over-box' : ''}`}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            fill={box.fill}
            data-title={box.title}
            onClick={(e) => {
              e.stopPropagation();
              onBoxClick(box.title);
            }}
            onMouseEnter={(e) => handleBoxMouseEnter(e, box.title)}
            onMouseMove={(e) => handleBoxMouseEnter(e, box.title)}
            onMouseLeave={onBoxHoverLeave}
            onDragEnter={(e) => handleDragEnter(e, box.title)}
            onDragOver={(e) => handleDragOver(e, box.title)}
            onDragLeave={(e) => handleDragLeave(e, box.title)}
            onDrop={(e) => handleDrop(e, box.title)}
          />
        ))}
      </g>
    </svg>
  );
});

MapComponent.displayName = 'Map';

export default MapComponent;

