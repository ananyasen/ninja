/* <copyright>
 This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
 No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
 (c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
 </copyright> */

var Montage = require("montage/core/core").Montage;
var Component = require("montage/ui/component").Component;

var Keyframe = exports.Keyframe = Montage.create(Component, {

    hasTemplate:{
        value: true
    },

    _position:{
        value:0
    },

    position:{
        serializable:true,
        get:function(){
            return this._position;
        },
        set:function(value){
            this._position = value;
            this.needsDraw = true;
        }
    },

    _isSelected:{
        value:false
    },

    isSelected:{
        serializable:true,
        get:function(){
            return this._isSelected;
        },
        set:function(value){
            this._isSelected = value;
            this.needsDraw = true;
        }
    },

    prepareForDraw:{
        value:function(){
            this.element.addEventListener("click", this, false);
            
			// Drag and drop event handlers
			this.element.addEventListener("mouseover", this.handleMouseover.bind(this), false);
			this.element.addEventListener("mouseout", this.handleMouseout.bind(this), false);
			this.element.addEventListener("dragstart", this.handleDragstart.bind(this), false);
			this.element.addEventListener("dragend", this.handleDragend.bind(this), false);
        }
    },

    draw:{
        value:function(){
            if(this.isSelected){
                this.element.classList.add("keyframeSelected");
                this.application.ninja.timeline.selectedStyle = this.parentComponent.parentComponent.parentComponent.trackEditorProperty;
            }else{
                this.element.classList.remove("keyframeSelected");
            }
            this.element.style.left = (this.position - 5) + "px";
        }
    },

    deselectKeyframe:{
        value:function(){
            this.isSelected=false;
            this.element.style.left = (this.position - 5) + "px";
        }
    },

    selectKeyframe:{
        value:function(){
            if(this.isSelected){
                return;
            }

            if(this.parentComponent.parentComponent.parentComponent.trackType == "position"){
                var tweenID = this.parentComponent.tweenID;
                var mainTrack = this.parentComponent.parentComponent.parentComponent.parentComponent.parentComponent.parentComponent.parentComponent;
                mainTrack.childComponents[0].childComponents[tweenID].childComponents[0].selectKeyframe();
                return;
            }

            this.isSelected=true;
            this.element.style.left = (this.position - 6) + "px";
            this.application.ninja.timeline.selectedStyle = this.parentComponent.parentComponent.parentComponent.trackEditorProperty;
            this.parentComponent.selectTween();
        }
    },

    handleClick:{
        value:function(ev){
            this.selectKeyframe();
            ev.stopPropagation();
        }
    },
    
	handleMouseover: {
		value: function(event) {
			this.element.draggable = true;
		}
	},
	handleMouseout: {
		value: function(event) {
			this.element.draggable = false;
		}
	},
	handleDragstart: {
		value: function(event) {
			//this.parentComponent.parentComponent.dragLayerID = this.layerID;
            event.dataTransfer.setData('Text', 'Keyframe');
            
            // Get my index in my track's tween array
            var i = 0,
            	tweenRepetitionLength = this.parentComponent.parentComponent.parentComponent.tweenRepetition.childComponents.length,
            	myIndex = null;
            for (i = 0; i < tweenRepetitionLength; i++) {
            	if (this.parentComponent.parentComponent.parentComponent.tweenRepetition.childComponents[i].uuid === this.parentComponent.uuid) {
            		myIndex = i;
            	}
            }
            this.parentComponent.parentComponent.parentComponent.draggingIndex = myIndex;
            this.selectKeyframe();
		}
	},
	handleDragend: {
		value: function(event) {
			this.parentComponent.isDragging = false;
		}
	}
    
});
