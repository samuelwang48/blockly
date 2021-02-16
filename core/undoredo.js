/**
 * @license
 * Copyright 2011 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Object representing an undoredo.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Undoredo');

goog.require('Blockly.constants');
goog.require('Blockly.Scrollbar');
goog.require('Blockly.utils.dom');
goog.require('Blockly.utils.Rect');
goog.require('Blockly.utils.Svg');
goog.require('Blockly.utils.toolbox');
goog.require('Blockly.Xml');

/**
 * Class for an undoredo.
 * @param {!Blockly.WorkspaceSvg} workspace The workspace to sit in.
 * @constructor
 */
Blockly.Undoredo = function(workspace) {
  /**
   * The workspace the undoredo sits in.
   * @type {!Blockly.WorkspaceSvg}
   * @private
   */
  this.workspace_ = workspace;

};

/**
 * Width of both the undoredo and lid images.
 * @const {number}
 * @private
 */
Blockly.Undoredo.prototype.WIDTH_ = 47;

/**
 * Height of the undoredo image (minus lid).
 * @const {number}
 * @private
 */
Blockly.Undoredo.prototype.BODY_HEIGHT_ = 44;

/**
 * Distance between undoredo and bottom edge of workspace.
 * @const {number}
 * @private
 */
Blockly.Undoredo.prototype.MARGIN_BOTTOM_ = 20;

/**
 * Distance between undoredo and right edge of workspace.
 * @const {number}
 * @private
 */
Blockly.Undoredo.prototype.MARGIN_SIDE_ = 20;

/**
 * Extent of hotspot on all sides beyond the size of the image.
 * @const {number}
 * @private
 */
Blockly.Undoredo.prototype.MARGIN_HOTSPOT_ = 10;

/**
 * The minimum (resting) opacity of the undoredo and lid.
 * @const {number}
 * @private
 */
Blockly.Undoredo.OPACITY_MIN_ = 0.4;

/**
 * The maximum (hovered) opacity of the undoredo and lid.
 * @const {number}
 * @private
 */
Blockly.Undoredo.OPACITY_MAX_ = 0.8;

/**
 * The SVG group containing the undoredo.
 * @type {SVGElement}
 * @private
 */
Blockly.Undoredo.prototype.svgGroup_ = null;

/**
 * Left coordinate of the undoredo.
 * @type {number}
 * @private
 */
Blockly.Undoredo.prototype.left_ = 0;

/**
 * Top coordinate of the undoredo.
 * @type {number}
 * @private
 */
Blockly.Undoredo.prototype.top_ = 0;

/**
 * Create the undoredo elements.
 * @return {!SVGElement} The undoredo's SVG group.
 */
Blockly.Undoredo.prototype.createDom = function() {
  this.svgGroup_ = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.G,
      {'class': 'blocklyUndoredo'}, null);
  var rnd = String(Math.random()).substring(2);
  var undo;
  var redo;

  undo = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.TEXT,
      {
        'id': 'blocklyUndoText' + rnd,
        'style': 'fill: #aaa;'
      },
      this.svgGroup_
  );
  undo.textContent = 'Undo';

  redo = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.TEXT,
      {
        'id': 'blocklyRedoText' + rnd,
        'style': 'fill: #aaa;',
        'y': 30
      },
      this.svgGroup_
  );
  redo.textContent = 'Redo';

  Blockly.bindEvent_(undo, 'mousedown', this, this.undoMouseDown_);
  Blockly.bindEvent_(undo, 'mouseup', this, this.undoMouseUp_);
  Blockly.bindEvent_(undo, 'mouseover', this, this.undoMouseOver_);
  Blockly.bindEvent_(undo, 'mouseout', this, this.undoMouseOut_);

  Blockly.bindEvent_(redo, 'mousedown', this, this.redoMouseDown_);
  Blockly.bindEvent_(redo, 'mouseup', this, this.redoMouseUp_);
  Blockly.bindEvent_(redo, 'mouseover', this, this.redoMouseOver_);
  Blockly.bindEvent_(redo, 'mouseout', this, this.redoMouseOut_);

  return this.svgGroup_;
};

/**
 * Initialize the undoredo.
 * @param {number} verticalSpacing Vertical distance from workspace edge to the
 *    same edge of the undoredo.
 * @return {number} Vertical distance from workspace edge to the opposite
 *    edge of the undoredo.
 */
Blockly.Undoredo.prototype.init = function(verticalSpacing) {
  this.verticalSpacing_ = this.MARGIN_BOTTOM_ + verticalSpacing;
  return this.verticalSpacing_ + this.BODY_HEIGHT_;
};

/**
 * Dispose of this undoredo.
 * Unlink from all DOM elements to prevent memory leaks.
 * @suppress {checkTypes}
 */
Blockly.Undoredo.prototype.dispose = function() {
  if (this.svgGroup_) {
    Blockly.utils.dom.removeNode(this.svgGroup_);
    this.svgGroup_ = null;
  }
  this.workspace_ = null;
};

/**
 * Position the undoredo.
 * It is positioned in the opposite corner to the corner the
 * categories/toolbox starts at.
 */
Blockly.Undoredo.prototype.position = function() {
  // Not yet initialized.
  if (!this.verticalSpacing_) {
    return;
  }
  var metrics = this.workspace_.getMetrics();
  if (!metrics) {
    // There are no metrics available (workspace is probably not visible).
    return;
  }
  if (metrics.toolboxPosition == Blockly.TOOLBOX_AT_LEFT ||
      (this.workspace_.horizontalLayout && !this.workspace_.RTL)) {
    // Toolbox starts in the left corner.
    this.left_ = metrics.viewWidth + metrics.absoluteLeft -
        this.WIDTH_ - this.MARGIN_SIDE_ - Blockly.Scrollbar.scrollbarThickness;
  } else {
    // Toolbox starts in the right corner.
    this.left_ = this.MARGIN_SIDE_ + Blockly.Scrollbar.scrollbarThickness;
  }

  if (metrics.toolboxPosition == Blockly.TOOLBOX_AT_BOTTOM) {
    this.top_ = this.verticalSpacing_;
  } else {
    this.top_ = metrics.viewHeight + metrics.absoluteTop -
        (this.BODY_HEIGHT_) - this.verticalSpacing_;
  }

  this.svgGroup_.setAttribute('transform',
      'translate(' + this.left_ + ',' + this.top_ + ')');
};

Blockly.Undoredo.prototype.undoMouseDown_ = function() {
  console.log('undo mouse down event');
  this.workspace_.undo(false);
};

Blockly.Undoredo.prototype.undoMouseUp_ = function() {
};

Blockly.Undoredo.prototype.undoMouseOver_ = function() {
};

Blockly.Undoredo.prototype.undoMouseOut_ = function() {
};

Blockly.Undoredo.prototype.redoMouseDown_ = function() {
  console.log('redo mouse down event');
  this.workspace_.undo(true);
};

Blockly.Undoredo.prototype.redoMouseUp_ = function() {
};

Blockly.Undoredo.prototype.redoMouseOver_ = function() {
};

Blockly.Undoredo.prototype.redoMouseOut_ = function() {
};
