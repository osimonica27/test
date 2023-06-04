import { useCallback, useEffect, useState } from 'react';

interface UseZoomControlsProps {
  zoomRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
}

export const useZoomControls = ({
  zoomRef,
  imageRef,
}: UseZoomControlsProps) => {
  const [currentScale, setCurrentScale] = useState<number>(1);
  const [isZoomedBigger, setIsZoomedBigger] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [startY, setStartY] = useState<number>(0);

  const zoomIn = useCallback(() => {
    const image = imageRef.current;

    if (image && currentScale < 2) {
      const newScale = currentScale + 0.1;
      setCurrentScale(newScale);
      image.style.width = `${image.naturalWidth * newScale}px`;
      image.style.height = `${image.naturalHeight * newScale}px`;
    }
  }, [imageRef, currentScale]);

  const zoomOut = useCallback(() => {
    const image = imageRef.current;
    if (image && currentScale > 0.5) {
      const newScale = currentScale - 0.1;
      setCurrentScale(newScale);
      image.style.width = `${image.naturalWidth * newScale}px`;
      image.style.height = `${image.naturalHeight * newScale}px`;
      if (!isZoomedBigger) {
        image.style.transform = 'translate(0, 0)';
      }
    }
  }, [imageRef, currentScale, isZoomedBigger]);

  const resetZoom = () => {
    const image = imageRef.current;
    if (image) {
      setCurrentScale(1);
      image.style.width = `${image.naturalWidth}px`;
      image.style.height = `${image.naturalHeight}px`;
      if (!isZoomedBigger) {
        image.style.transform = 'translate(0, 0)';
      }
    }
  };

  const handleDragStart = event => {
    const { clientX, clientY } = event.touches ? event.touches[0] : event;
    event.dataTransfer.setDragImage(new Image(), 0, 0);
    event.dataTransfer.setData('text/plain', '');
    setStartX(clientX);
    setStartY(clientY);
  };

  const handleDrag = event => {
    event.preventDefault();
    const { clientX, clientY } = event.touches ? event.touches[0] : event;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    if (isZoomedBigger) {
      const image = imageRef.current;
      if (image) {
        const imageX = deltaX + startX;
        const imageY = deltaY + startY;
        image.style.transform = `translate(${imageX}px, ${imageY}px)`;
      }
    }
  };

  const handleDragEnd = () => {
    const { current: zoomArea } = zoomRef;
    if (zoomArea) {
      const image = imageRef.current;
      if (image) {
        const imageX = parseInt(image.style.left || (0 as string), 10);
        const imageY = parseInt(image.style.top || (0 as string), 10);
        setStartX(imageX);
        setStartY(imageY);
        image.style.transform = `translate(${imageX}px, ${imageY}px)`;
      }
    }
  };

  const checkZoomSize = useCallback(() => {
    const { current: zoomArea } = zoomRef;
    if (zoomArea) {
      const image = zoomArea.querySelector('img');
      if (image) {
        const zoomedWidth = image.naturalWidth * currentScale;
        const zoomedHeight = image.naturalHeight * currentScale;
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        setIsZoomedBigger(
          zoomedWidth > containerWidth || zoomedHeight > containerHeight
        );
      }
    }
  }, [currentScale, zoomRef]);

  useEffect(() => {
    const handleScroll = (event: WheelEvent) => {
      const { deltaY } = event;
      if (deltaY > 0) {
        zoomOut();
      } else if (deltaY < 0) {
        zoomIn();
      }
    };

    const handleResize = () => {
      checkZoomSize();
    };

    checkZoomSize();

    window.addEventListener('wheel', handleScroll, { passive: false });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [zoomIn, zoomOut, checkZoomSize]);

  return {
    zoomIn,
    zoomOut,
    resetZoom,
    isZoomedBigger,
    handleDragStart,
    handleDrag,
    handleDragEnd,
  };
};
