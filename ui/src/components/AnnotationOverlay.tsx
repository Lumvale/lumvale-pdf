import React, { useRef, useState, useEffect } from 'react';

export type AnnotationType = 'ink' | 'highlight' | 'text' | 'rectangle' | 'circle' | 'redact' | 'image';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  color: string;
  pageIndex: number;
}

export interface InkAnnotation extends BaseAnnotation {
  type: 'ink';
  paths: Point[][]; // Array of continuous strokes
  strokeWidth: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  rects: { x: number; y: number; width: number; height: number }[];
}

export interface RedactAnnotation extends BaseAnnotation {
  type: 'redact';
  rects: { x: number; y: number; width: number; height: number }[];
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize: number;
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  rects: { x: number; y: number; width: number; height: number }[];
  strokeWidth: number;
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle';
  rects: { x: number; y: number; width: number; height: number }[];
  strokeWidth: number;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image';
  dataUrl: string; // Base64 image
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Annotation = InkAnnotation | HighlightAnnotation | TextAnnotation | RedactAnnotation | RectangleAnnotation | CircleAnnotation | ImageAnnotation;

interface AnnotationOverlayProps {
  pageIndex: number;
  scale: number;
  activeTool: AnnotationType | null;
  activeColor: string;
  activeStrokeWidth: number;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onToolSelect?: (tool: AnnotationType | null) => void;
  width: number;
  height: number;
}

export default function AnnotationOverlay({
  pageIndex,
  scale,
  activeTool,
  activeColor,
  activeStrokeWidth,
  annotations,
  onAnnotationsChange,
  onToolSelect,
  width,
  height,
}: AnnotationOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: string, startPt: Point, originalAnn: Annotation, resizeHandle?: string } | null>(null);

  // We keep a separate local state for the text input so we can type before saving it
  const [textInput, setTextInput] = useState<{ x: number; y: number; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // We only want to auto-focus when it is initially opened
  useEffect(() => {
    if (textInput && textInput.text === '' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [!!textInput]);

  // Update selected annotation when activeColor or activeStrokeWidth changes
  useEffect(() => {
    if (selectedAnnotationId) {
      const currentAnn = annotations.find(a => a.id === selectedAnnotationId);
      if (currentAnn && currentAnn.type !== 'image') {
        const needsColorUpdate = currentAnn.type !== 'redact' && currentAnn.color !== activeColor;
        const hasStrokeWidth = currentAnn.type === 'ink' || currentAnn.type === 'rectangle' || currentAnn.type === 'circle';
        const needsStrokeUpdate = hasStrokeWidth && (currentAnn as any).strokeWidth !== activeStrokeWidth;
        
        if (needsColorUpdate || needsStrokeUpdate) {
          const updated = annotations.map(a => {
            if (a.id === selectedAnnotationId) {
              const newA = { ...a };
              if (needsColorUpdate) newA.color = activeColor;
              if (needsStrokeUpdate) (newA as any).strokeWidth = activeStrokeWidth;
              return newA;
            }
            return a;
          });
          onAnnotationsChange(updated);
        }
      }
    }
  }, [activeColor, activeStrokeWidth]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't delete if we are typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
        onAnnotationsChange(annotations.filter(a => a.id !== selectedAnnotationId));
        setSelectedAnnotationId(null);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedAnnotationId, annotations, onAnnotationsChange]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
    if (!svgRef.current) return null;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return null;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Convert screen coordinates to SVG coordinates (unscaled)
    // We store coordinates relative to the original PDF size (scale = 1)
    return {
      x: (clientX - ctm.e) / ctm.a / scale,
      y: (clientY - ctm.f) / ctm.d / scale,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Commit any active text input if clicking elsewhere
    if (textInput && activeTool !== 'text') {
      commitTextInput();
    }

    if (!activeTool) {
      setSelectedAnnotationId(null);
      return;
    }

    const pt = getCoordinates(e);
    if (!pt) return;

    if (activeTool === 'ink') {
      setIsDrawing(true);
      setCurrentStroke([pt]);
    } else if (activeTool === 'highlight' || activeTool === 'redact' || activeTool === 'rectangle' || activeTool === 'circle') {
      setIsDrawing(true);
      setCurrentRect({ x: pt.x, y: pt.y, width: 0, height: 0 });
    } else if (activeTool === 'text') {
      if (textInput) {
        commitTextInput();
      } else {
        setTextInput({ x: pt.x, y: pt.y, text: '' });
      }
    }
  };

  const handleAnnotationPointerDown = (e: React.MouseEvent | React.TouchEvent, ann: Annotation, resizeHandle?: 'nw' | 'ne' | 'sw' | 'se' | 'e' | 's') => {
    if (activeTool) return; // Only allow selecting/dragging when no tool is active
    e.stopPropagation();
    const pt = getCoordinates(e);
    if (!pt) return;

    setSelectedAnnotationId(ann.id);
    setDragInfo({ id: ann.id, startPt: pt, originalAnn: JSON.parse(JSON.stringify(ann)), resizeHandle });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getCoordinates(e);
    if (!pt) return;

    if (isDrawing && activeTool === 'ink') {
      setCurrentStroke(prev => [...prev, pt]);
    } else if (isDrawing && (activeTool === 'highlight' || activeTool === 'redact' || activeTool === 'rectangle' || activeTool === 'circle') && currentRect) {
      setCurrentRect({
        ...currentRect,
        width: pt.x - currentRect.x,
        height: pt.y - currentRect.y,
      });
    } else if (!activeTool && dragInfo) {
      const dx = pt.x - dragInfo.startPt.x;
      const dy = pt.y - dragInfo.startPt.y;

      const updatedAnnotations = annotations.map(a => {
        if (a.id === dragInfo.id) {
          const original = dragInfo.originalAnn;
          
          if (dragInfo.resizeHandle === 'se') {
            // Scaling logic
            const obox = getBBox(original);
            const scaleFactor = Math.max(0.1, (obox.width + dx) / obox.width);

            if (original.type === 'text') {
              return { ...original, fontSize: original.fontSize * scaleFactor } as TextAnnotation;
            } else if (original.type === 'highlight' || original.type === 'redact' || original.type === 'rectangle' || original.type === 'circle') {
              return { ...original, rects: original.rects.map(r => ({ 
                ...r, 
                width: r.width * scaleFactor, 
                height: r.height * scaleFactor 
              })) } as any;
            } else if (original.type === 'ink') {
              return { ...original, paths: original.paths.map(path => path.map(p => ({ 
                x: obox.x + (p.x - obox.x) * scaleFactor, 
                y: obox.y + (p.y - obox.y) * scaleFactor 
              }))) } as InkAnnotation;
            } else if (original.type === 'image') {
              return { ...original, width: original.width * scaleFactor, height: original.height * scaleFactor } as ImageAnnotation;
            }
          } else {
            // Drag logic
            if (original.type === 'text' || original.type === 'image') {
              return { ...original, x: original.x + dx, y: original.y + dy } as any;
            } else if (original.type === 'highlight' || original.type === 'redact' || original.type === 'rectangle' || original.type === 'circle') {
              return { ...original, rects: original.rects.map(r => ({ ...r, x: r.x + dx, y: r.y + dy })) } as any;
            } else if (original.type === 'ink') {
              return { ...original, paths: original.paths.map(path => path.map(p => ({ x: p.x + dx, y: p.y + dy }))) } as InkAnnotation;
            }
          }
        }
        return a;
      });
      onAnnotationsChange(updatedAnnotations);
    }
  };

  const handlePointerUp = () => {
    if (!activeTool && dragInfo) {
      setDragInfo(null);
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'ink' && currentStroke.length > 1) {
      // Basic Douglas-Peucker point reduction / smoothing
      const smoothed = smoothStroke(currentStroke);
      const newAnn: InkAnnotation = {
        id: crypto.randomUUID(),
        type: 'ink',
        color: activeColor,
        pageIndex,
        strokeWidth: activeStrokeWidth,
        paths: [smoothed],
      };
      onAnnotationsChange([...annotations, newAnn]);
      setSelectedAnnotationId(newAnn.id);
      if (onToolSelect) onToolSelect(null);
    } else if ((activeTool === 'highlight' || activeTool === 'redact' || activeTool === 'rectangle' || activeTool === 'circle') && currentRect) {
      // Normalize rect
      const normX = currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x;
      const normY = currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y;
      const normW = Math.abs(currentRect.width);
      const normH = Math.abs(currentRect.height);

      if (normW > 5 && normH > 5) {
        const newAnn: Annotation = {
          id: crypto.randomUUID(),
          type: activeTool,
          color: activeTool === 'redact' ? '#000000' : activeColor,
          pageIndex,
          rects: [{ x: normX, y: normY, width: normW, height: normH }],
        } as Annotation;
        
        if (activeTool === 'rectangle' || activeTool === 'circle') {
          (newAnn as any).strokeWidth = activeStrokeWidth;
        }

        onAnnotationsChange([...annotations, newAnn]);
        setSelectedAnnotationId(newAnn.id);
        if (onToolSelect) onToolSelect(null);
      }
    }

    setCurrentStroke([]);
    setCurrentRect(null);
  };

  const smoothStroke = (pts: Point[]): Point[] => {
    if (pts.length < 3) return pts;
    const result = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      // Skip points that are too close to the previous point to smooth out jitter
      const prev = result[result.length - 1];
      const dist = Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y);
      if (dist > 2) {
        result.push(pts[i]);
      }
    }
    result.push(pts[pts.length - 1]);
    return result;
  };

  const commitTextInput = () => {
    if (textInput && textInput.text.trim()) {
      const newAnn: TextAnnotation = {
        id: crypto.randomUUID(),
        type: 'text',
        color: activeColor,
        pageIndex,
        text: textInput.text,
        x: textInput.x,
        y: textInput.y,
        fontSize: activeStrokeWidth * 4, // scale font size based on stroke width somewhat
      };
      onAnnotationsChange([...annotations, newAnn]);
      setSelectedAnnotationId(newAnn.id);
      if (onToolSelect) onToolSelect(null);
    }
    setTextInput(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitTextInput();
    } else if (e.key === 'Escape') {
      setTextInput(null);
    }
  };

  const renderPath = (pts: Point[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y}`;
    
    // Simplistic Catmull-Rom to Cubic Bezier curve fitting for very smooth lines
    let d = `M ${pts[0].x} ${pts[0].y}`;
    
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;
      
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    
    return d;
  };

  const getBBox = (ann: Annotation) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (ann.type === 'ink') {
      ann.paths.forEach(pts => pts.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }));
    } else if (ann.type === 'highlight' || ann.type === 'redact' || ann.type === 'rectangle' || ann.type === 'circle') {
      ann.rects.forEach(r => {
        if (r.x < minX) minX = r.x;
        if (r.x + r.width > maxX) maxX = r.x + r.width;
        if (r.y < minY) minY = r.y;
        if (r.y + r.height > maxY) maxY = r.y + r.height;
      });
    } else if (ann.type === 'text') {
      minX = ann.x;
      minY = ann.y;
      maxX = ann.x + ann.text.length * (ann.fontSize * 0.6); // rough estimate
      maxY = ann.y + ann.fontSize;
    } else if (ann.type === 'image') {
      minX = ann.x;
      minY = ann.y;
      maxX = ann.x + ann.width;
      maxY = ann.y + ann.height;
    }
    // Add padding
    return { x: minX - 5, y: minY - 5, width: (maxX - minX) + 10, height: (maxY - minY) + 10 };
  };

  // Only render annotations for this page
  const pageAnnotations = annotations.filter(a => a.pageIndex === pageIndex);

  return (
    <div 
      className="absolute inset-0 z-20"
      style={{ touchAction: activeTool ? 'none' : 'auto' }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <svg
        ref={svgRef}
        data-testid="annotation-svg"
        width={width}
        height={height}
        style={{ width: '100%', height: '100%', pointerEvents: activeTool ? 'auto' : 'none' }}
      >
        {dragInfo && !activeTool && (
          <rect x="-10000" y="-10000" width="20000" height="20000" fill="transparent" style={{ pointerEvents: 'auto' }} />
        )}
        <g transform={`scale(${scale})`}>
          {/* Render saved annotations */}
          {pageAnnotations.map(ann => {
            const isSelected = selectedAnnotationId === ann.id;
            const selectProps = !activeTool ? {
              onMouseDown: (e: React.MouseEvent) => handleAnnotationPointerDown(e, ann),
              onTouchStart: (e: React.TouchEvent) => handleAnnotationPointerDown(e, ann),
              style: { cursor: 'move', filter: isSelected ? 'drop-shadow(0 0 4px rgba(0,0,0,0.5))' : 'none', pointerEvents: 'auto' as React.CSSProperties['pointerEvents'] },
            } : {
              style: { pointerEvents: 'none' as React.CSSProperties['pointerEvents'] }
            };

            const renderResizeHandles = () => {
              if (!isSelected || activeTool) return null;
              const bbox = getBBox(ann);
              if (bbox.width < 0 || bbox.height < 0 || !isFinite(bbox.width)) return null;
              
              return (
                <g style={{ pointerEvents: 'auto' }}>
                  {/* Bounding box outline */}
                  <rect 
                    x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} 
                    fill="none" stroke="#007AFF" strokeWidth="1" strokeDasharray="4 4" 
                  />
                  {/* Bottom Right Resize Handle */}
                  <circle 
                    cx={bbox.x + bbox.width} cy={bbox.y + bbox.height} r="6" 
                    fill="#007AFF" cursor="nwse-resize"
                    onMouseDown={(e) => handleAnnotationPointerDown(e, ann, 'se')}
                    onTouchStart={(e) => handleAnnotationPointerDown(e, ann, 'se')}
                  />
                </g>
              );
            };

            if (ann.type === 'ink') {
              return (
                <g key={ann.id}>
                  <g {...selectProps}>
                    {ann.paths.map((pts, i) => (
                      <path
                        key={i}
                        d={renderPath(pts)}
                        fill="none"
                        stroke={ann.color}
                        strokeWidth={ann.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </g>
                  {renderResizeHandles()}
                </g>
              );
            } else if (ann.type === 'highlight' || ann.type === 'redact') {
              return (
                <g key={ann.id}>
                  <g {...selectProps}>
                    {ann.rects.map((r, i) => (
                      <rect
                        key={i}
                        x={r.x}
                        y={r.y}
                        width={r.width}
                        height={r.height}
                        fill={ann.type === 'redact' ? '#000000' : ann.color}
                        fillOpacity={ann.type === 'redact' ? 1.0 : 0.4}
                        style={ann.type === 'redact' ? undefined : { mixBlendMode: 'multiply' }}
                      />
                    ))}
                  </g>
                  {renderResizeHandles()}
                </g>
              );
            } else if (ann.type === 'rectangle') {
              return (
                <g key={ann.id}>
                  <g {...selectProps}>
                    {ann.rects.map((r, i) => (
                      <rect
                        key={i}
                        x={r.x}
                        y={r.y}
                        width={r.width}
                        height={r.height}
                        fill="none"
                        stroke={ann.color}
                        strokeWidth={ann.strokeWidth}
                      />
                    ))}
                  </g>
                  {renderResizeHandles()}
                </g>
              );
            } else if (ann.type === 'circle') {
              return (
                <g key={ann.id}>
                  <g {...selectProps}>
                    {ann.rects.map((r, i) => {
                      const cx = r.x + r.width / 2;
                      const cy = r.y + r.height / 2;
                      const rx = r.width / 2;
                      const ry = r.height / 2;
                      return (
                        <ellipse
                          key={i}
                          cx={cx}
                          cy={cy}
                          rx={rx}
                          ry={ry}
                          fill="none"
                          stroke={ann.color}
                          strokeWidth={ann.strokeWidth}
                        />
                      );
                    })}
                  </g>
                  {renderResizeHandles()}
                </g>
              );
            } else if (ann.type === 'text') {
              return (
                <g key={ann.id}>
                  <g {...selectProps}>
                    <text
                      x={ann.x}
                      y={ann.y}
                      fill={ann.color}
                      fontSize={ann.fontSize}
                      fontFamily="sans-serif"
                      style={{ userSelect: 'none' }}
                      dominantBaseline="hanging"
                    >
                      {ann.text}
                    </text>
                  </g>
                  {renderResizeHandles()}
                </g>
              );
            } else if (ann.type === 'image') {
              return (
                <g key={ann.id}>
                  <g {...selectProps}>
                    <image
                      x={ann.x}
                      y={ann.y}
                      width={ann.width}
                      height={ann.height}
                      href={ann.dataUrl}
                      preserveAspectRatio="none"
                    />
                  </g>
                  {renderResizeHandles()}
                </g>
              );
            }
            return null;
          })}

          {/* Render in-progress stroke */}
          {isDrawing && activeTool === 'ink' && currentStroke.length > 0 && (
            <path
              d={renderPath(currentStroke)}
              fill="none"
              stroke={activeColor}
              strokeWidth={activeStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Render in-progress highlight / redact / rectangle / circle */}
          {isDrawing && (activeTool === 'highlight' || activeTool === 'redact' || activeTool === 'rectangle' || activeTool === 'circle') && currentRect && (
            <>
              {activeTool === 'circle' ? (
                <ellipse
                  cx={(currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x) + Math.abs(currentRect.width) / 2}
                  cy={(currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y) + Math.abs(currentRect.height) / 2}
                  rx={Math.abs(currentRect.width) / 2}
                  ry={Math.abs(currentRect.height) / 2}
                  fill="none"
                  stroke={activeColor}
                  strokeWidth={activeStrokeWidth}
                />
              ) : (
                <rect
                  x={currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x}
                  y={currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y}
                  width={Math.abs(currentRect.width)}
                  height={Math.abs(currentRect.height)}
                  fill={activeTool === 'rectangle' ? 'none' : (activeTool === 'redact' ? '#000000' : activeColor)}
                  fillOpacity={activeTool === 'rectangle' ? 1.0 : (activeTool === 'redact' ? 1.0 : 0.4)}
                  stroke={activeTool === 'rectangle' ? activeColor : undefined}
                  strokeWidth={activeTool === 'rectangle' ? activeStrokeWidth : undefined}
                  style={activeTool === 'redact' || activeTool === 'rectangle' ? undefined : { mixBlendMode: 'multiply' }}
                />
              )}
            </>
          )}
        </g>
      </svg>

      {/* Render text input field */}
      {textInput && (
        <div 
          className="absolute z-50 flex items-center gap-2"
          style={{
            left: textInput.x * scale,
            top: textInput.y * scale,
          }}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            type="text"
            className="bg-lumvale-surface/80 border border-lumvale-primary outline-none px-2 py-1 rounded shadow-lg backdrop-blur-md"
            style={{
              color: activeColor,
              fontSize: `${activeStrokeWidth * 4 * scale}px`,
              fontFamily: 'sans-serif',
              minWidth: '150px'
            }}
            value={textInput.text}
            onChange={e => setTextInput({ ...textInput, text: e.target.value })}
            onKeyDown={handleKeyDown}
          />
          <button 
            onClick={commitTextInput}
            className="bg-lumvale-primary text-[var(--color-lumvale-bg)] p-1 rounded hover:bg-lumvale-primary/80 transition shadow-lg"
            title="Save Text"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        </div>
      )}
    </div>
  );
}
