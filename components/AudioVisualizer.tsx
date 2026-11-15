import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
    audioContextRef: React.RefObject<AudioContext | null>;
    audioAnalyserRef: React.RefObject<AnalyserNode | null>;
    isPlaying: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioContextRef, audioAnalyserRef, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // FIX: Changed useRef type to allow for undefined initial value.
    const animationFrameId = useRef<number | undefined>();

    useEffect(() => {
        const audioContext = audioContextRef.current;
        const analyser = audioAnalyserRef.current;
        const canvas = canvasRef.current;

        if (!canvas || !analyser || !audioContext) {
            return;
        }
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = 7;
            const bars = Math.floor(canvas.width / (barWidth + 2)); // Calculate how many bars fit
            const step = Math.floor(bufferLength / bars);
            let x = 0;

            for (let i = 0; i < bars; i++) {
                // Use an average of a slice of the dataArray for smoother bars
                const sliceStart = i * step;
                const sliceEnd = sliceStart + step;
                const slice = dataArray.slice(sliceStart, sliceEnd);
                const avg = slice.reduce((a, b) => a + b, 0) / slice.length;

                const barHeight = (avg / 255) * canvas.height;
                
                // A subtle gradient for the bars
                const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
                gradient.addColorStop(0, '#3b82f6'); // blue-500
                gradient.addColorStop(1, '#60a5fa'); // blue-400
                canvasCtx.fillStyle = gradient;

                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 2; // Add 2 for spacing
            }
        };

        if (isPlaying) {
            if (audioContext.state === 'suspended') {
                 audioContext.resume();
            }
            draw();
        } else {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            // Clear canvas when paused
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isPlaying, audioContextRef, audioAnalyserRef]);

    // Use parent width, but a fixed height
    return <canvas ref={canvasRef} width="286" height="40" className="my-2" />;
};

export default AudioVisualizer;