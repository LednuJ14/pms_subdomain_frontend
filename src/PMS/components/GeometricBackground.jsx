import React from 'react';

const GeometricBackground = () => {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(https://res.cloudinary.com/do6wjhqur/image/upload/v1782798950/geometric-bg_hxubod.jpg)` }}
      />
    </div>
  );
};

export default GeometricBackground;
