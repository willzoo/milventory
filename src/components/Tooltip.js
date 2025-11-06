import React from 'react';

const Tooltip = ({ tooltip, wrapRef }) => {
  if (!tooltip.visible || !wrapRef.current) return null;

  const style = {
    left: `${tooltip.x}px`,
    top: `${tooltip.y}px`,
  };

  return (
    <div className="tooltip visible" style={style} role="tooltip">
      <span>{tooltip.title}</span>
    </div>
  );
};

export default Tooltip;

