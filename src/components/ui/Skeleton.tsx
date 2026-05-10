import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '1rem', rounded = 'rounded-lg', className = '' }) => {
  return (
    <div
      style={{ width, height }}
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 ${rounded} ${className}`}
    />
  );
};

export default Skeleton;
