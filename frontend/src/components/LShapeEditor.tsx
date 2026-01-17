/**
 * L-Shape Room Editor Component
 *
 * Interactive visual editor for configuring L-shaped rooms.
 * Uses a "two legs" mental model instead of "cutout" for better UX.
 */
import { useState, useEffect } from 'react';
import type { CutoutCorner } from '../types';

interface LShapeConfig {
  orientation: CutoutCorner;
  // Leg dimensions - thinking of L as two connected rectangles
  // The vertical leg goes up, horizontal leg goes right (then rotated/flipped by orientation)
  verticalLegWidth: number;
  verticalLegHeight: number;
  horizontalLegWidth: number;
  horizontalLegHeight: number;
}

interface LShapeEditorProps {
  totalWidth: number;
  totalHeight: number;
  cutoutCorner: CutoutCorner | null;
  cutoutWidth: number | null;
  cutoutHeight: number | null;
  onChange: (data: {
    width: number;
    height: number;
    shape_cutout_corner: CutoutCorner;
    shape_cutout_width: number;
    shape_cutout_height: number;
  }) => void;
}

/**
 * Convert user-friendly leg dimensions to backend cutout format
 */
function legsToBackend(
  config: LShapeConfig
): { width: number; height: number; cutoutWidth: number; cutoutHeight: number } {
  const { orientation, verticalLegWidth, verticalLegHeight, horizontalLegWidth, horizontalLegHeight } = config;

  // Total bounding box
  const width = Math.max(verticalLegWidth, horizontalLegWidth);
  const height = verticalLegHeight + horizontalLegHeight;

  // Cutout is the missing rectangle
  let cutoutWidth: number;
  let cutoutHeight: number;

  if (orientation === 'top_right' || orientation === 'bottom_right') {
    cutoutWidth = width - verticalLegWidth;
  } else {
    cutoutWidth = width - verticalLegWidth;
  }
  cutoutHeight = height - horizontalLegHeight;

  // Ensure positive values
  cutoutWidth = Math.max(0, cutoutWidth);
  cutoutHeight = Math.max(0, cutoutHeight);

  return { width, height, cutoutWidth, cutoutHeight };
}

/**
 * Convert backend cutout format to user-friendly leg dimensions
 */
function backendToLegs(
  width: number,
  height: number,
  cutoutWidth: number | null,
  cutoutHeight: number | null,
  orientation: CutoutCorner
): LShapeConfig {
  const cw = cutoutWidth || width * 0.4;
  const ch = cutoutHeight || height * 0.4;

  return {
    orientation,
    verticalLegWidth: width - cw,
    verticalLegHeight: ch,
    horizontalLegWidth: width,
    horizontalLegHeight: height - ch,
  };
}

/**
 * Mini SVG preview of an L-shape orientation
 */
function OrientationPreview({
  orientation,
  selected,
  onClick
}: {
  orientation: CutoutCorner;
  selected: boolean;
  onClick: () => void;
}) {
  const size = 60;
  const padding = 4;
  const innerSize = size - padding * 2;

  // Generate path based on orientation
  const getPath = () => {
    const w = innerSize;
    const h = innerSize;
    const cutW = w * 0.45;
    const cutH = h * 0.45;

    switch (orientation) {
      case 'top_right':
        return `M 0 0 L ${w - cutW} 0 L ${w - cutW} ${cutH} L ${w} ${cutH} L ${w} ${h} L 0 ${h} Z`;
      case 'top_left':
        return `M ${cutW} 0 L ${w} 0 L ${w} ${h} L 0 ${h} L 0 ${cutH} L ${cutW} ${cutH} Z`;
      case 'bottom_right':
        return `M 0 0 L ${w} 0 L ${w} ${h - cutH} L ${w - cutW} ${h - cutH} L ${w - cutW} ${h} L 0 ${h} Z`;
      case 'bottom_left':
        return `M 0 0 L ${w} 0 L ${w} ${h} L ${cutW} ${h} L ${cutW} ${h - cutH} L 0 ${h - cutH} Z`;
      default:
        return '';
    }
  };

  const labels: Record<CutoutCorner, string> = {
    top_right: 'Top Right',
    top_left: 'Top Left',
    bottom_right: 'Bottom Right',
    bottom_left: 'Bottom Left',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <svg width={size} height={size} className="mb-1">
        <g transform={`translate(${padding}, ${padding})`}>
          <path
            d={getPath()}
            fill={selected ? '#3b82f6' : '#9ca3af'}
            stroke={selected ? '#1d4ed8' : '#6b7280'}
            strokeWidth="1"
          />
        </g>
      </svg>
      <span className={`text-xs ${selected ? 'text-primary-700 font-medium' : 'text-gray-500'}`}>
        {labels[orientation]}
      </span>
    </button>
  );
}

/**
 * Live preview SVG of the L-shape with dimensions
 */
function LivePreview({ config }: { config: LShapeConfig }) {
  const { orientation, verticalLegWidth, verticalLegHeight, horizontalLegWidth, horizontalLegHeight } = config;

  const width = Math.max(verticalLegWidth, horizontalLegWidth);
  const height = verticalLegHeight + horizontalLegHeight;

  const scale = 180 / Math.max(width, height);
  const svgWidth = width * scale;
  const svgHeight = height * scale;

  // Generate path based on orientation and actual dimensions
  const getPath = () => {
    const w = svgWidth;
    const h = svgHeight;
    const vw = verticalLegWidth * scale;
    const vh = verticalLegHeight * scale;
    const hw = horizontalLegWidth * scale;
    const hh = horizontalLegHeight * scale;

    switch (orientation) {
      case 'top_right':
        // Vertical leg on left, extends up. Horizontal leg on bottom right
        return `M 0 0 L ${vw} 0 L ${vw} ${vh} L ${hw} ${vh} L ${hw} ${h} L 0 ${h} Z`;
      case 'top_left':
        // Vertical leg on right, extends up. Horizontal leg on bottom left
        return `M ${w - vw} 0 L ${w} 0 L ${w} ${h} L 0 ${h} L 0 ${vh} L ${w - vw} ${vh} Z`;
      case 'bottom_right':
        // Vertical leg on left bottom, horizontal leg on top right
        return `M 0 0 L ${hw} 0 L ${hw} ${h - vh} L ${vw} ${h - vh} L ${vw} ${h} L 0 ${h} Z`;
      case 'bottom_left':
        // Vertical leg on right bottom, horizontal leg on top left
        return `M 0 0 L ${w} 0 L ${w} ${h - vh} L ${w - vw} ${h - vh} L ${w - vw} ${h} L 0 ${h} Z`;
      default:
        return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    }
  };

  // Calculate area
  const area = (verticalLegWidth * verticalLegHeight) + (horizontalLegWidth * horizontalLegHeight)
    - (Math.min(verticalLegWidth, horizontalLegWidth) * Math.min(verticalLegHeight, horizontalLegHeight));
  const actualArea = (verticalLegWidth * (verticalLegHeight + horizontalLegHeight))
    - ((horizontalLegWidth - verticalLegWidth) > 0 ? 0 : (verticalLegWidth - horizontalLegWidth) * verticalLegHeight);

  const totalArea = width * height - ((width - verticalLegWidth) * (height - horizontalLegHeight));

  return (
    <div className="flex flex-col items-center">
      <svg
        width={svgWidth + 60}
        height={svgHeight + 60}
        className="bg-gray-50 rounded border"
      >
        <g transform="translate(30, 30)">
          {/* Grid pattern */}
          <defs>
            <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
              <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width={svgWidth} height={svgHeight} fill="url(#grid)" opacity="0.5" />

          {/* Room shape */}
          <path
            d={getPath()}
            fill="#dbeafe"
            stroke="#3b82f6"
            strokeWidth="2"
          />

          {/* Dimension labels */}
          <text x={svgWidth / 2} y={-8} textAnchor="middle" className="text-xs fill-gray-600">
            {width.toFixed(1)}m
          </text>
          <text x={svgWidth + 8} y={svgHeight / 2} textAnchor="start" dominantBaseline="middle" className="text-xs fill-gray-600">
            {height.toFixed(1)}m
          </text>
        </g>
      </svg>
      <p className="text-sm text-gray-500 mt-2">
        Total area: ~{totalArea.toFixed(1)} m²
      </p>
    </div>
  );
}

/**
 * Main L-Shape Editor Component
 */
export default function LShapeEditor({
  totalWidth,
  totalHeight,
  cutoutCorner,
  cutoutWidth,
  cutoutHeight,
  onChange
}: LShapeEditorProps) {
  const [config, setConfig] = useState<LShapeConfig>(() =>
    backendToLegs(
      totalWidth || 10,
      totalHeight || 10,
      cutoutWidth,
      cutoutHeight,
      cutoutCorner || 'bottom_right'
    )
  );

  // Update parent when config changes
  useEffect(() => {
    const backend = legsToBackend(config);
    onChange({
      width: backend.width,
      height: backend.height,
      shape_cutout_corner: config.orientation,
      shape_cutout_width: backend.cutoutWidth,
      shape_cutout_height: backend.cutoutHeight,
    });
  }, [config]);

  const updateConfig = (updates: Partial<LShapeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-4">
      {/* Orientation selector */}
      <div>
        <label className="label mb-2">Choose L-Shape Orientation</label>
        <p className="text-xs text-gray-500 mb-3">Click to select which corner has the "notch"</p>
        <div className="grid grid-cols-4 gap-2">
          {(['top_left', 'top_right', 'bottom_left', 'bottom_right'] as CutoutCorner[]).map(orientation => (
            <OrientationPreview
              key={orientation}
              orientation={orientation}
              selected={config.orientation === orientation}
              onClick={() => updateConfig({ orientation })}
            />
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="py-4">
        <label className="label mb-2">Preview</label>
        <LivePreview config={config} />
      </div>

      {/* Dimension inputs - using "two legs" mental model */}
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <label className="label text-blue-800 mb-2">Vertical Section</label>
          <p className="text-xs text-blue-600 mb-2">The part that extends vertically</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Width (m)</label>
              <input
                type="number"
                value={config.verticalLegWidth}
                onChange={(e) => updateConfig({ verticalLegWidth: Math.max(1, Number(e.target.value)) })}
                className="input mt-1"
                min="1"
                step="0.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Height (m)</label>
              <input
                type="number"
                value={config.verticalLegHeight}
                onChange={(e) => updateConfig({ verticalLegHeight: Math.max(1, Number(e.target.value)) })}
                className="input mt-1"
                min="1"
                step="0.5"
              />
            </div>
          </div>
        </div>

        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <label className="label text-green-800 mb-2">Horizontal Section</label>
          <p className="text-xs text-green-600 mb-2">The part that extends horizontally</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Width (m)</label>
              <input
                type="number"
                value={config.horizontalLegWidth}
                onChange={(e) => updateConfig({ horizontalLegWidth: Math.max(1, Number(e.target.value)) })}
                className="input mt-1"
                min="1"
                step="0.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Height (m)</label>
              <input
                type="number"
                value={config.horizontalLegHeight}
                onChange={(e) => updateConfig({ horizontalLegHeight: Math.max(1, Number(e.target.value)) })}
                className="input mt-1"
                min="1"
                step="0.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick tip */}
      <p className="text-xs text-gray-400 italic">
        Tip: The two sections share a common edge where they meet.
      </p>
    </div>
  );
}
