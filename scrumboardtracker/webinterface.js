// vim: shiftwidth=4:ts=4

// Copyright 2016 Maurice van der Pot <griffon26@kfk4ever.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.




// The following debounce function has been taken from David Walsh's blog at
// https://davidwalsh.name/javascript-debounce-function and according to the footer
// was released under the MIT license: © David Walsh 2007-2016. All code MIT license.
// It appears to have been based on code from Underscore.js, which is also released
// under the MIT license.

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

var corners = [];
var backgroundcircle;
var square;
var columnlines = [];

function setFormFieldsCalib1() {
    cornerpositions = []
    for (var i = 0; i < corners.length; i++) {
        cornerpositions.push([corners[i].left, corners[i].top])
    }
    $('input[name="corners"]').val(JSON.stringify(cornerpositions));
    $('input[name="background"]').val(JSON.stringify([backgroundcircle.left, backgroundcircle.top]));
    return true;
}

function setFormFieldsCalib2() {
    $('input[name="note"]').val(JSON.stringify([square.left, square.top, square.getWidth()]));

    linepositions = []
    for(var i = 0; i < columnlines.length; i++) {
        linepositions.push(columnlines[i].left);
    }
    $('input[name="linepositions"]').val(JSON.stringify(linepositions));
    return true;
}

$(function() {

    var thisPage = $('#title').attr('name');

    var canvasInitialized = false;
    var canvas = new fabric.Canvas('canvas', { selection: false });

    var debounced = debounce(resizeCanvas, 250);
    window.addEventListener('resize', debounced, false);

    function resizeCanvas() {
        if(canvasInitialized) {

            availableWidth = window.innerWidth - 20;
            availableHeight = window.innerHeight - 120;

            if(availableWidth / availableHeight < canvas.backgroundImage.width / canvas.backgroundImage.height)
            {
                zoom = availableWidth / canvas.backgroundImage.width;
            }
            else
            {
                zoom = availableHeight / canvas.backgroundImage.height;
            }

            canvasWidth = canvas.backgroundImage.width * zoom;
            canvasHeight = canvas.backgroundImage.height * zoom;

            canvas.setWidth(canvasWidth);
            canvas.setHeight(canvasHeight);
            canvas.setZoom(zoom);

            canvas.renderAll();
        }
    }

    function makeBackgroundCircle(x, y) {
        var circle = new fabric.Circle({
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            stroke: 'lightgreen',
            strokeWidth: 3,
            fill: 'rgba(0,0,0,0)',
            radius: 7
        });
        circle.hasControls = false;
        circle.hasBorders = false;
        return circle;
    }

    function makeCorner(x, y) {
        var corner = new fabric.Circle({
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            stroke: 'red',
            strokeWidth: 3,
            fill: 'rgba(0,0,0,0)',
            radius: 7
        });
        corner.hasControls = false;
        corner.hasBorders = false;
        return corner;
    }

    function makeLine(corner1, corner2) {
        var line = new fabric.Line([corner1.left, corner1.top, corner2.left, corner2.top], {
            stroke: 'red'
        });
        corner1.line2 = line;
        corner2.line1 = line;
        line.hasControls = false;
        line.hasBorders = false;
        line.selectable = false;
        line.hoverCursor = 'default';
        return line;
    }

    function makeSquare(x, y, size) {
        var square = new fabric.Rect({
            left: x,
            top: y,
            fill: 'rgba(0,0,0,0)',
            width: size,
            height: size,
            stroke: '#ff0000',
            borderColor: '#ffffff',
            cornerColor: '#ffffff',
            cornerSize: 6
        });
        square.lockUniScaling = true;
        square.lockRotation = true;
        square.setControlVisible('mtr', false);
        square.hasBorders = false;
        return square;
    }

    function makeColumnLine(linepos, max_y) {
        var line = new fabric.Line([linepos, 0, linepos, max_y], {
            stroke: 'blue',
            padding: 5
        });
        line.hasControls = false;
        line.hasBorders = false;
        line.lockMovementY = true;
        return line;
    }

    function limit(i, min, max)
    {
        return Math.min(Math.max(i, min), max);
    }


    if(thisPage == 'calibration1') {
        imageUrl = 'getImage.cgi';
    } else {
        imageUrl = 'getTransformedImage.cgi';
    }

    fabric.Image.fromURL(imageUrl, function(img) {

        if(!canvasInitialized)
        {
            canvasInitialized = true;

            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

            resizeCanvas();

            if(thisPage == 'calibration1') {

                $('[name=aspectx]').val(calibrationdata['aspectratio'][0]);
                $('[name=aspecty]').val(calibrationdata['aspectratio'][1]);

                for (var i = 0; i < calibrationdata.corners.length; i++) {
                    x = limit(calibrationdata.corners[i][0], 0, img.width - 1);
                    y = limit(calibrationdata.corners[i][1], 0, img.height - 1);
                    corner = makeCorner(x, y);
                    corners.push(corner);
                    canvas.add(corner);
                }
                lines = [];
                for (var i = 0; i < corners.length; i++) {
                    line = makeLine(corners[i], corners[(i + 1) % corners.length]);
                    lines.push(line)
                    canvas.add(line);
                    canvas.sendToBack(line);
                }

                // Draw the background selection circle after the others so
                // that it will be on top of any corner at the same position.
                // This may hide a corner circle, but in that case the user
                // will still see the lines to determine where it is.
                x = limit(calibrationdata.background[0], 0, img.width - 1);
                y = limit(calibrationdata.background[1], 0, img.height - 1);
                backgroundcircle = makeBackgroundCircle(x, y);
                canvas.add(backgroundcircle);
                canvas.bringToFront(backgroundcircle);

                canvas.on("object:moving", function(e) {
                    var obj = e.target;

                    obj.left = limit(obj.left, 0, obj.canvas.backgroundImage.width - 1);
                    obj.top = limit(obj.top, 0, obj.canvas.backgroundImage.height - 1);

                    obj.line1 && obj.line1.set({'x2': obj.left, 'y2': obj.top});
                    obj.line2 && obj.line2.set({'x1': obj.left, 'y1': obj.top});
                });
            }
            else { // calibration2
                for(var i = 0; i < calibrationdata.linepositions.length; i++) {
                    line = makeColumnLine(calibrationdata.linepositions[i], img.height);
                    columnlines.push(line);
                    canvas.add(line);
                }

                x = limit(calibrationdata.notecorners[0][0], 0, img.width - 1);
                y = limit(calibrationdata.notecorners[0][1], 0, img.height - 1);
                square = makeSquare(x, y, calibrationdata.averagenotesize);
                canvas.add(square);

                canvas.on("object:moving", function(e) {
                    var obj = e.target;

                    obj.left = limit(obj.left, 0, obj.canvas.backgroundImage.width - obj.getWidth() - 1);
                    obj.top = limit(obj.top, 0, obj.canvas.backgroundImage.height - obj.getHeight() - 1);
                });

                canvas.on('object:scaling', function(e) {
                    var obj = e.target;
                    obj.strokeWidth = 1 / obj.scaleX;
                });
            }
        }
    });
});

