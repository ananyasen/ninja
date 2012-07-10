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

var Montage = require("montage/core/core").Montage,
    ToolProperties = require("js/components/tools-properties/tool-properties").ToolProperties;

exports.RectProperties = Montage.create(ToolProperties, {
    base: {
        value: null,
        serializable: true
    },

    lockButton: {
        value: null,
        serializable: true
    },

    TLRadiusControl: { value: null, serializable: true },
    TRRadiusControl: { value: null, serializable: true },
    BLRadiusControl: { value: null, serializable: true },
    BRRadiusControl: { value: null, serializable: true },

    _unlocked: { value: false, enumerable: false},

    _subPrepare: {
        value: function() {
        }
    },

    handleLockButtonAction: {
        value: function(event) {
            this.TRRadiusControl.enabled = this.BLRadiusControl.enabled = this.BRRadiusControl.enabled = !this.lockButton.pressed;

            if(this.lockButton.pressed) {
                this._syncRadii(this.TLRadiusControl.value, this.TLRadiusControl.units);
            }
        }
    },

    // Public API
    fill: {
        get: function () { return this.base.fill; }
    },

    stroke: {
        get: function () { return this.base.stroke; }
    },

    use3D: {
        get: function() { return this.base._use3D; }
    },

    strokeSize: {
        get: function() { return this.base._strokeSize; }
    },

    strokeStyle : {
        get: function() {
//            return this.base._strokeStyle.options[this.base._strokeStyle.value].text;
            return "Solid";
        }
    },

    strokeStyleIndex : {
        get: function() {
//            return this.base._strokeStyle.options[this.base._strokeStyle.value].value;
            return 1;
        }
    },

    strokeMaterial: {
        get: function() { return this.base._strokeMaterial.value; }
    },

    fillMaterial: {
        get: function() { return this.base._fillMaterial.value; }
    },

    handleChanging: {
        value: function(event) {
            if(event.wasSetByCode) {
                return;
            }

            this._setBorderRadius(event);
        }
    },

    handleChange: {
        value: function(event) {
            if(event.wasSetByCode) {
                return;
            }

            this._setBorderRadius(event);
        }
    },

    _setBorderRadius: {
        value: function(event) {
            var hotTxt = event.currentTarget;
            if(hotTxt.units === "%") {
                if(hotTxt.value > 50) {
                    hotTxt.maxValue = 50;
                }
            }

            if(this.lockButton.pressed && (this.TLRadiusControl === hotTxt)) {
                this._syncRadii(hotTxt.value, hotTxt.units);
            }
        }
    },

    _syncRadii: {
        value: function(value, units) {
            this.TRRadiusControl.value = value;
            this.BLRadiusControl.value = value;
            this.BRRadiusControl.value = value;

            this.TRRadiusControl.units = units;
            this.BLRadiusControl.units = units;
            this.BRRadiusControl.units = units;
        }
    }

});
