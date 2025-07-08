import React from 'react';
import './Skeleton.css';

const Skeleton = ({ className, width, height }) => {
  const style = {
    width,
    height,
  };
  return <div className={`skeleton ${className}`} style={style}></div>;
};

export default Skeleton;
