import React, { useEffect, useRef } from 'react';

const AudioVisualizer = ({ analyserNode, isRecording, theme }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 140;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize visualizer loop
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      const width = canvas.width;
      const height = canvas.height;

      // Fetch colors from CSS Variables
      const style = getComputedStyle(document.body);
      const accentPrimary = style.getPropertyValue('--accent-primary').trim() || '#8b5cf6';
      const accentSecondary = style.getPropertyValue('--accent-secondary').trim() || '#a78bfa';
      const bgSecondary = style.getPropertyValue('--bg-secondary').trim() || '#121216';

      // Clear with slight opacity for a tail glow effect
      ctx.fillStyle = bgSecondary;
      ctx.fillRect(0, 0, width, height);

      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height * 0.85;

          // Gradient color for bars
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, accentPrimary);
          gradient.addColorStop(1, accentSecondary);

          ctx.fillStyle = gradient;
          
          // Draw rounded or glowing bars
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          // Add simple glow to peaks
          if (dataArray[i] > 180) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, height - barHeight - 4, barWidth - 2, 2);
          }

          x += barWidth;
        }
      } else {
        // Draw static baseline if no node (simulated pulse when recording)
        ctx.strokeStyle = accentPrimary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const sliceWidth = width / 100;
        let x = 0;
        
        for (let i = 0; i < 100; i++) {
          const amplitude = isRecording ? Math.sin(i * 0.15 + Date.now() * 0.015) * 10 : 0;
          const y = height / 2 + amplitude;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          
          x += sliceWidth;
        }
        ctx.stroke();
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyserNode, isRecording, theme]);

  return (
    <div style={{ width: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export default AudioVisualizer;
