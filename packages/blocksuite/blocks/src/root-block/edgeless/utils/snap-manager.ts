import type {
  SurfaceBlockComponent,
  SurfaceBlockModel,
} from '@blocksuite/affine-block-surface';
import type { ConnectorElementModel } from '@blocksuite/affine-model';
import type { GfxController } from '@blocksuite/block-std/gfx';

import { Overlay } from '@blocksuite/affine-block-surface';
import { Bound, Point } from '@blocksuite/global/utils';

import { isConnectable } from '../utils/query.js';

interface Distance {
  absXDistance: number;
  absYDistance: number;
  xDistance: number;
  yDistance: number;
  indexX: number;
  indexY: number;
}

const ALIGN_THRESHOLD = 5;

export class EdgelessSnapManager extends Overlay {
  static override overlayName: string = 'snap-manager';

  private _alignableBounds: Bound[] = [];

  /**
   * This variable contains reference lines that are
   * generated by the 'Distribute Alignment' function. This alignment is achieved
   * by evenly distributing elements based on specified alignment rules.
   * These lines serve as a guide for achieving equal spacing or distribution
   * among multiple graphics or design elements.
   */
  private _distributedAlignLines: [Point, Point][] = [];

  /**
   * This variable holds reference lines that are calculated
   * based on the self-alignment of the graphics. This alignment is determined
   * according to various aspects of the graphic itself, such as the center, edges,
   * corners, etc. It essentially represents the guidelines for the positioning
   * and alignment within the individual graphic elements.
   */
  private _intraGraphicAlignLines: [Point, Point][] = [];

  cleanupAlignables = () => {
    this._alignableBounds = [];
    this._intraGraphicAlignLines = [];
    this._distributedAlignLines = [];
    // FIXME: not sure why renderer can be undefined sometimes
    this._surface.renderer?.removeOverlay(this);
  };

  private get _surface() {
    const surfaceModel = this.gfx.doc.getBlockByFlavour(
      'affine:surface'
    )[0] as SurfaceBlockModel;

    return this.gfx.std.view.getBlock(surfaceModel.id) as SurfaceBlockComponent;
  }

  constructor(gfx: GfxController) {
    super(gfx);
  }

  private _alignDistributeHorizontally(
    rst: { dx: number; dy: number },
    bound: Bound,
    threshold: number,
    viewport: { zoom: number }
  ) {
    const wBoxes: Bound[] = [];
    this._alignableBounds.forEach(box => {
      if (box.isHorizontalCross(bound)) {
        wBoxes.push(box);
      }
    });
    let dif = Infinity;
    let min = Infinity;
    for (let i = 0; i < wBoxes.length; i++) {
      for (let j = i + 1; j < wBoxes.length; j++) {
        let lb = wBoxes[i],
          rb = wBoxes[j];
        // it means these bound need to be horizontally across
        if (!lb.isHorizontalCross(rb)) continue;
        if (lb.isIntersectWithBound(rb)) continue;
        if (rb.maxX < lb.minX) {
          const temp = rb;
          rb = lb;
          lb = temp;
        }
        /** align middle */
        let _centerX = 0;
        const updateDif = () => {
          dif = Math.abs(bound.center[0] - _centerX);
          if (dif <= threshold && dif < min) {
            min = dif;
            rst.dx = _centerX - bound.center[0];
            /**
             * calculate points to draw
             */
            const ys = [lb.minY, lb.maxY, rb.minY, rb.maxY].sort(
              (a, b) => a - b
            );
            const y = (ys[1] + ys[2]) / 2;
            const offset = 2 / viewport.zoom;
            const xs = [
              _centerX - bound.w / 2 - offset,
              _centerX + bound.w / 2 + offset,
              rb.minX,
              rb.maxX,
              lb.minX,
              lb.maxX,
            ].sort((a, b) => a - b);
            this._distributedAlignLines[0] = [
              new Point(xs[1], y),
              new Point(xs[2], y),
            ];
            this._distributedAlignLines[1] = [
              new Point(xs[3], y),
              new Point(xs[4], y),
            ];
          }
        };
        if (lb.horizontalDistance(rb) > bound.w) {
          _centerX = (lb.maxX + rb.minX) / 2;
          updateDif();
        }
        /** align left */
        _centerX = lb.minX - (rb.minX - lb.maxX) - bound.w / 2;
        updateDif();
        /** align right */
        _centerX = rb.minX - lb.maxX + rb.maxX + bound.w / 2;
        updateDif();
      }
    }
  }

  private _alignDistributeVertically(
    rst: { dx: number; dy: number },
    bound: Bound,
    threshold: number,
    viewport: { zoom: number }
  ) {
    const hBoxes: Bound[] = [];
    this._alignableBounds.forEach(box => {
      if (box.isVerticalCross(bound)) {
        hBoxes.push(box);
      }
    });
    let dif = Infinity;
    let min = Infinity;
    for (let i = 0; i < hBoxes.length; i++) {
      for (let j = i + 1; j < hBoxes.length; j++) {
        let ub = hBoxes[i],
          db = hBoxes[j];
        if (!ub.isVerticalCross(db)) continue;
        if (ub.isIntersectWithBound(db)) continue;
        if (db.maxY < ub.minX) {
          const temp = ub;
          ub = db;
          db = temp;
        }
        /** align middle */
        let _centerY = 0;
        const updateDiff = () => {
          dif = Math.abs(bound.center[1] - _centerY);
          if (dif <= threshold && dif < min) {
            min = dif;
            rst.dy = _centerY - bound.center[1];
            /**
             * calculate points to draw
             */
            const xs = [ub.minX, ub.maxX, db.minX, db.maxX].sort(
              (a, b) => a - b
            );
            const x = (xs[1] + xs[2]) / 2;
            const offset = 2 / viewport.zoom;
            const ys = [
              _centerY - bound.h / 2 - offset,
              _centerY + bound.h / 2 + offset,
              db.minY,
              db.maxY,
              ub.minY,
              ub.maxY,
            ].sort((a, b) => a - b);
            this._distributedAlignLines[3] = [
              new Point(x, ys[1]),
              new Point(x, ys[2]),
            ];
            this._distributedAlignLines[4] = [
              new Point(x, ys[3]),
              new Point(x, ys[4]),
            ];
          }
        };
        if (ub.verticalDistance(db) > bound.h) {
          _centerY = (ub.maxY + db.minY) / 2;
          updateDiff();
        }
        /** align upper */
        _centerY = ub.minY - (db.minY - ub.maxY) - bound.h / 2;
        updateDiff();
        /** align lower */
        _centerY = db.minY - ub.maxY + db.maxY + bound.h / 2;
        updateDiff();
      }
    }
  }

  private _calculateClosestDistances(bound: Bound, other: Bound): Distance {
    // Calculate center-to-center and center-to-side distances
    const centerXDistance = other.center[0] - bound.center[0];
    const centerYDistance = other.center[1] - bound.center[1];

    // Calculate center-to-side distances
    const leftDistance = other.minX - bound.center[0];
    const rightDistance = other.maxX - bound.center[0];
    const topDistance = other.minY - bound.center[1];
    const bottomDistance = other.maxY - bound.center[1];

    // Calculate side-to-side distances
    const leftToLeft = other.minX - bound.minX;
    const leftToRight = other.maxX - bound.minX;
    const rightToLeft = other.minX - bound.maxX;
    const rightToRight = other.maxX - bound.maxX;

    const topToTop = other.minY - bound.minY;
    const topToBottom = other.maxY - bound.minY;
    const bottomToTop = other.minY - bound.maxY;
    const bottomToBottom = other.maxY - bound.maxY;

    const xDistances = [
      centerXDistance,
      leftDistance,
      rightDistance,
      leftToLeft,
      leftToRight,
      rightToLeft,
      rightToRight,
    ];

    const yDistances = [
      centerYDistance,
      topDistance,
      bottomDistance,
      topToTop,
      topToBottom,
      bottomToTop,
      bottomToBottom,
    ];

    // Get absolute distances
    const xDistancesAbs = xDistances.map(Math.abs);
    const yDistancesAbs = yDistances.map(Math.abs);

    // Get closest distances
    const closestX = Math.min(...xDistancesAbs);
    const closestY = Math.min(...yDistancesAbs);

    const indexX = xDistancesAbs.indexOf(closestX);
    const indexY = yDistancesAbs.indexOf(closestY);

    // the x and y distances will be useful for locating the align point
    return {
      absXDistance: closestX,
      absYDistance: closestY,
      xDistance: xDistances[indexX],
      yDistance: yDistances[indexY],
      indexX,
      indexY,
    };
  }

  private _draw() {
    this._surface.refresh();
  }

  // Update X align point
  private _updateXAlignPoint(
    rst: { dx: number; dy: number },
    bound: Bound,
    other: Bound,
    distance: Distance
  ) {
    const index = distance.indexX;
    rst.dx = distance.xDistance;
    const alignPointX = [
      other.center[0],
      other.minX,
      other.maxX,
      bound.minX + rst.dx,
      bound.minX + rst.dx,
      bound.maxX + rst.dx,
      bound.maxX + rst.dx,
    ][index];
    this._intraGraphicAlignLines[0] = [
      new Point(alignPointX, bound.center[1]),
      new Point(alignPointX, other.center[1]),
    ];
  }

  // Update Y align point
  private _updateYAlignPoint(
    rst: { dx: number; dy: number },
    bound: Bound,
    other: Bound,
    distance: Distance
  ) {
    const index = distance.indexY;
    rst.dy = distance.yDistance;
    const alignPointY = [
      other.center[1],
      other.minY,
      other.maxY,
      bound.minY + rst.dy,
      bound.minY + rst.dy,
      bound.maxY + rst.dy,
      bound.maxY + rst.dy,
    ][index];
    this._intraGraphicAlignLines[1] = [
      new Point(bound.center[0], alignPointY),
      new Point(other.center[0], alignPointY),
    ];
  }

  align(bound: Bound): { dx: number; dy: number } {
    const rst = { dx: 0, dy: 0 };
    const threshold = ALIGN_THRESHOLD;

    const { viewport } = this.gfx;

    this._intraGraphicAlignLines = [];
    this._distributedAlignLines = [];

    for (const other of this._alignableBounds) {
      const closestDistances = this._calculateClosestDistances(bound, other);

      if (closestDistances.absXDistance < threshold) {
        this._updateXAlignPoint(rst, bound, other, closestDistances);
      }

      if (closestDistances.absYDistance < threshold) {
        this._updateYAlignPoint(rst, bound, other, closestDistances);
      }
    }

    // point align prority is higher than distribute align
    if (rst.dx === 0) {
      this._alignDistributeHorizontally(rst, bound, threshold, viewport);
    }

    if (rst.dy === 0) {
      this._alignDistributeVertically(rst, bound, threshold, viewport);
    }
    this._draw();
    return rst;
  }

  override render(ctx: CanvasRenderingContext2D) {
    if (
      this._intraGraphicAlignLines.length === 0 &&
      this._distributedAlignLines.length === 0
    )
      return;
    const { viewport } = this.gfx;
    const strokeWidth = 1 / viewport.zoom;
    const offset = 5 / viewport.zoom;
    ctx.strokeStyle = '#1672F3';
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();

    this._intraGraphicAlignLines.forEach(line => {
      let d = '';
      if (line[0].x === line[1].x) {
        const x = line[0].x;
        const minY = Math.min(line[0].y, line[1].y);
        const maxY = Math.max(line[0].y, line[1].y);
        d = `M${x},${minY - offset}L${x},${maxY}`;
      } else {
        const y = line[0].y;
        const minX = Math.min(line[0].x, line[1].x);
        const maxX = Math.max(line[0].x, line[1].x);
        d = `M${minX - offset},${y}L${maxX + offset},${y}`;
      }
      ctx.stroke(new Path2D(d));
    });

    this._distributedAlignLines.forEach(line => {
      const bar = 10 / viewport.zoom;
      let d = '';
      if (line[0].x === line[1].x) {
        const x = line[0].x;
        const minY = Math.min(line[0].y, line[1].y) + offset;
        const maxY = Math.max(line[0].y, line[1].y) - offset;
        d = `M${x},${minY}L${x},${maxY}
        M${x - bar},${minY}L${x + bar},${minY}
        M${x - bar},${maxY}L${x + bar},${maxY} `;
      } else {
        const y = line[0].y;
        const minX = Math.min(line[0].x, line[1].x) + offset;
        const maxX = Math.max(line[0].x, line[1].x) - offset;
        d = `M${minX},${y}L${maxX},${y}
        M${minX},${y - bar}L${minX},${y + bar}
        M${maxX},${y - bar}L${maxX},${y + bar}`;
      }
      ctx.stroke(new Path2D(d));
    });
  }

  setupAlignables(
    alignables: BlockSuite.EdgelessModel[],
    exclude: BlockSuite.EdgelessModel[] = []
  ): Bound {
    if (alignables.length === 0) return new Bound();

    const connectors = alignables.filter(isConnectable).reduce((prev, el) => {
      const connectors = (this.gfx.surface as SurfaceBlockModel).getConnectors(
        el.id
      );

      if (connectors.length > 0) {
        prev = prev.concat(connectors);
      }

      return prev;
    }, [] as ConnectorElementModel[]);

    const { viewport } = this.gfx;
    const viewportBounds = Bound.from(viewport.viewportBounds);
    this._surface.renderer.addOverlay(this);
    const canvasElements = this.gfx.layer.canvasElements;
    const excludes = new Set([...alignables, ...exclude, ...connectors]);
    this._alignableBounds = [];
    (
      [
        ...this.gfx.layer.blocks,
        ...canvasElements,
      ] as BlockSuite.EdgelessModel[]
    ).forEach(alignable => {
      const bounds = alignable.elementBound;
      if (
        viewportBounds.isOverlapWithBound(bounds) &&
        !excludes.has(alignable)
      ) {
        this._alignableBounds.push(bounds);
      }
    });

    return alignables.reduce((prev, element) => {
      const bounds = element.elementBound;
      return prev.unite(bounds);
    }, Bound.deserialize(alignables[0].xywh));
  }
}
