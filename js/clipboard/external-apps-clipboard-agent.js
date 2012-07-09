/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

////////////////////////////////////////////////////////////////////////
//

var Montage = 		        require("montage/core/core").Montage,
    Component = 	require("montage/ui/component").Component,
    ClipboardUtil = require("js/clipboard/util").ClipboardUtil;

var ExternalAppsClipboardAgent = exports.ExternalAppsClipboardAgent = Montage.create(Component, {

    paste:{
        value: function(clipboardEvent){
            var clipboardData = clipboardEvent.clipboardData,
            htmlData = clipboardData.getData("text/html"),
            textData = clipboardData.getData("text/plain"),
            i=0,
            imageMime, imageData, imageElement;

            //handle image blobs
            if(clipboardData.items &&  (clipboardData.items.length > 0)){
                for(i=0; i < clipboardData.items.length; i++ ){
                    if((clipboardData.items[i].kind === "file") && (clipboardData.items[i].type.indexOf("image") === 0)){//example type -> "image/png"
                        imageMime = clipboardData.items[i].type;
                        imageData = clipboardData.items[i].getAsFile();
                        try{
                            imageElement = this.pasteImageBinary(imageData);
                        }catch(e){
                            console.log(""+e.stack);
                        }
                        this.application.ninja.selectionController.selectElements(imageElement);
                        this.application.ninja.currentDocument.model.needsSave = true;

                    }
                }
            }

            try{
                if(!!htmlData || !!textData){
                    this.pasteHtml(htmlData, textData);
                }
            }catch(e){
                console.log(""+e.stack);
            }

        }
    },

    pasteImageBinary:{
        value: function(imageBlob){
            var element, self = this,
                fileType = imageBlob.type;

            element = this.application.ninja.ioMediator.createFileFromBinary(imageBlob, {"addFileToStage" : self.addImageElement.bind(self)});

            return element;

        }
    },

    addImageElement:{
        value: function(status){
            var save = status.save,
                fileName = status.filename,
                url = status.url,
                fileType = status.fileType,
                element, rules, self = this;

            if (save && save.success && save.status === 201) {
                //
                if (fileType.indexOf('svg') !== -1) {
                    element = document.application.njUtils.make('embed', null, this.application.ninja.currentDocument);
                    element.type = 'image/svg+xml';
                    element.src = url+'/'+fileName;
                } else {
                    element = document.application.njUtils.make('image', null, this.application.ninja.currentDocument);
                    element.src = url+'/'+fileName;
                }
                //Adding element once it is loaded
                element.onload = function () {
                    element.onload = null;
                    self.application.ninja.elementMediator.addElements(element, rules, true/*notify*/, false /*callAddDelegate*/);
                };
                //Setting rules of element
                rules = {
                    'position': 'absolute',
                    'top' : '100px',
                    'left' : '100px'
                };
                //
                self.application.ninja.elementMediator.addElements(element, rules, false/*notify*/, false /*callAddDelegate*/);
            } else {
                //HANDLE ERROR ON SAVING FILE TO BE ADDED AS ELEMENT
            }

            return element;
        }
    },

    //paste from external applicaitons
    pasteHtml:{
        value: function(htmlData, textData){
            var i=0, j=0,
                pasteDataObject=null,
                pastedElements = [],
                node = null, nodeList = null,
                styles = null,
                divWrapper = null,
                spanWrapper = null,
                metaEl = null,
                self = this;

            if(htmlData){

                //cleanse HTML

                htmlData.replace(/[<script]/g," ");

                this.application.ninja.selectedElements.length = 0;
                NJevent("selectionChange", {"elements": this.application.ninja.selectedElements, "isDocument": true} );

                try{
                    nodeList = ClipboardUtil.deserializeHtmlString(htmlData);//this removes html and body tags
                }
                catch(e){
                    console.log(""+e.stack);
                }

                for(i=0; i < nodeList.length; i++){
                    if(nodeList[i].tagName === "META") {
                        nodeList[i] = null;
                    }
                    else if (nodeList[i].tagName === "CANVAS"){
                        //can't paste external canvas for lack of all metadata
                        nodeList[i] = null;
                    }
                    else if((nodeList[i].nodeType === 3) || (nodeList[i].tagName === "A")){
                        node = nodeList[i].cloneNode(true);

                        divWrapper = document.application.njUtils.make("div", null, this.application.ninja.currentDocument);
                        spanWrapper = document.application.njUtils.make("span", null, this.application.ninja.currentDocument);
                        spanWrapper.appendChild(node);
                        divWrapper.appendChild(spanWrapper);
                        styles = {"position":"absolute", "top":"100px", "left":"100px"};

                        this.pastePositioned(divWrapper, styles);

                        nodeList[i] = null;
                        pastedElements.push(divWrapper);

                    }else if(nodeList[i].tagName === "SPAN"){
                        node = nodeList[i].cloneNode(true);

                        divWrapper = document.application.njUtils.make("div", null, this.application.ninja.currentDocument);
                        divWrapper.appendChild(node);
                        styles =  {"position":"absolute", "top":"100px", "left":"100px"};

                        this.pastePositioned(divWrapper, styles);

                        nodeList[i] = null;
                        pastedElements.push(divWrapper);
                    }
                    else {
                        node = nodeList[i].cloneNode(true);

                        //get class string while copying .... generate styles from class
                        styles = {"position":"absolute", "top":"100px", "left":"100px"};

                        this.pastePositioned(node, styles);

                        nodeList[i] = null;
                        pastedElements.push(node);
                    }

                }

                nodeList = null;


            }else if(textData){
                node = ClipboardUtil.deserializeHtmlString("<div><span>"+ textData +"</span></div>")[0];
                styles = {"position":"absolute", "top":"100px", "left":"100px"};
                this.pastePositioned(node, styles);
            }

            NJevent("elementAdded", pastedElements);
            this.application.ninja.currentDocument.model.needsSave = true;

        }
    },

    pastePositioned:{
        value: function(element, styles, fromCopy){// for now can wok for both in-place and centered paste
            var modObject = [], x,y, newX, newY, counter;

            if((typeof fromCopy === "undefined") || (fromCopy && fromCopy === true)){
                counter = this.pasteCounter;
            }else{
                counter = this.pasteCounter - 1;
            }

            x = styles ? ("" + styles.left + "px") : "100px";
            y = styles ? ("" + styles.top + "px") : "100px";
            newX = styles ? ("" + (styles.left + (25 * counter)) + "px") : "100px";
            newY = styles ? ("" + (styles.top + (25 * counter)) + "px") : "100px";

            if(!styles || (styles && !styles.position)){
                this.application.ninja.elementMediator.addElements(element, null, false/*notify*/, false /*callAddDelegate*/);
            }else if(styles && (styles.position === "absolute")){
                this.application.ninja.elementMediator.addElements(element, {"top" : newY, "left" : newX}, false/*notify*/, false /*callAddDelegate*/);//displace
            }
        }
    }

});