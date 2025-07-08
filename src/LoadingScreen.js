import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import Skeleton from './Skeleton';
import './LoadingScreen.css';

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prevProgress + 1;
      });
    }, 25);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <Logo isAnimated={true} size={100} />
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="skeleton-layout">
          <div className="skeleton-left">
            <Skeleton height={120} />
            <Skeleton height={300} />
          </div>
          <div className="skeleton-center">
            <Skeleton height={560} width={560} />
          </div>
          <div className="skeleton-right">
            <Skeleton height={400} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
