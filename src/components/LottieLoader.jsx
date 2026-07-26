import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import catAnimation from '../../cat-animation.lottie';

export default function LottieLoader({ fullscreen = false, size = 180, message = 'Loading...' }) {
  return (
    <div className={fullscreen ? 'lottie-loader lottie-loader--fullscreen' : 'lottie-loader'}>
      <DotLottieReact src={catAnimation} loop autoplay style={{ width: size, height: size }} />
      {message ? <div className="lottie-loader__label">{message}</div> : null}
    </div>
  );
}