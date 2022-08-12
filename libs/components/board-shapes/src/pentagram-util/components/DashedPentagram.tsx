import { memo } from 'react';
import { Utils } from '@tldraw/core';
import type { ShapeStyles } from '@toeverything/components/board-types';
import { getShapeStyle } from '../../shared';
import { getPentagramPoints } from '../pentagram-helpers';
import Vec from '@tldraw/vec';

interface PentagramSvgProps {
    id: string;
    size: number[];
    style: ShapeStyles;
    isSelected: boolean;
    isDarkMode: boolean;
}

export const DashedPentagram = memo(function DashedPentagram({
    id,
    size,
    style,
    isSelected,
    isDarkMode,
}: PentagramSvgProps) {
    const { stroke, strokeWidth, fill } = getShapeStyle(style, isDarkMode);
    const sw = 1 + strokeWidth * 1.618;
    const points = getPentagramPoints(size);
    const sides = Utils.pointsToLineSegments(points, true);
    const paths = sides.map(([start, end], i) => {
        const { strokeDasharray, strokeDashoffset } = Utils.getPerfectDashProps(
            Vec.dist(start, end),
            strokeWidth * 1.618,
            style.dash
        );

        return (
            <line
                key={id + '_' + i}
                x1={start[0]}
                y1={start[1]}
                x2={end[0]}
                y2={end[1]}
                stroke={stroke}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
            />
        );
    });

    const bgPath = points.join();

    return (
        <>
            <polygon
                className={
                    style.isFilled || isSelected
                        ? 'tl-fill-hitarea'
                        : 'tl-stroke-hitarea'
                }
                points={bgPath}
            />
            {style.isFilled && (
                <polygon fill={fill} points={bgPath} pointerEvents="none" />
            )}
            <g pointerEvents="stroke">{paths}</g>
        </>
    );
});
