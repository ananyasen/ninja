/* <copyright>
Copyright (c) 2012, Motorola Mobility LLC.
All Rights Reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice,
  this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of Motorola Mobility LLC nor the names of its
  contributors may be used to endorse or promote products derived from this
  software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
</copyright> */

var Montage = require("montage/core/core").Montage;
var Component = require("montage/ui/component").Component;
var ToolProperties = require("js/components/tools-properties/tool-properties").ToolProperties;

exports.ZoomProperties = Montage.create(ToolProperties, {

    zoomIn: {
        value: null,
        serializable: true
    },

    zoomOut: {
        value: null,
        serializable: true
    },

    zoomInCursor:{value:"url('images/cursors/zoom.png'), default"},
    zoomOutCursor:{value:"url('images/cursors/zoom_minus.png'), default"},
    _subPrepare: {
        value: function() {
            this.zoomIn.addEventListener("click", this, false);
            this.zoomOut.addEventListener("click", this, false);
        }
    },

    handleClick: {
        value: function(event) {
            this.selectedElement = event._event.target.id;
            if(this.selectedElement==="zoomInTool"){
                this.application.ninja.stage.drawingCanvas.style.cursor = this.zoomInCursor;
            }else{
                this.application.ninja.stage.drawingCanvas.style.cursor = this.zoomOutCursor;
            }
        }
    },

    _selectedElement: {
        value: "zoomInTool", enumerable: false
    },

    selectedElement: {
        get: function() { return this._selectedElement;},
        set: function(value) { this._selectedElement = value; }
    }
});
