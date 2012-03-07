/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

var Montage = require("montage/core/core").Montage,
    Component = require("montage/ui/component").Component,
    vecUtils = require("js/helper-classes/3D/vec-utils").VecUtils,
    Rectangle = require("js/helper-classes/3D/rectangle").Rectangle,
    ElementsMediator = require("js/mediators/element-mediator").ElementMediator;
///////////////////////////////////////////////////////////////////////
// Class ViewUtils
//      Viewing Utility functions
///////////////////////////////////////////////////////////////////////
exports.ViewUtils = Montage.create(Component, {
    ///////////////////////////////////////////////////////////////////////
    // Instance variables
    ///////////////////////////////////////////////////////////////////////

    m_viewportObj : { value: null, writable: true},
    _perspectiveDist: { value: null, writable: true},

    // keep a stack of viewport objects
    _viewportObjStack: { value: [], writable: true },

    _currentDocument: { value: null , writable: true},
    _userContentLeft: { value: null , writable: true},
    _userContentTop: { value: null , writable: true},

    _rootElement: { value: null, writable: true},
    _stageElement: { value: null, writable: true},

    ///////////////////////////////////////////////////////////////////////
    // Property accessors
    ///////////////////////////////////////////////////////////////////////
    setViewportObj: {
        value: function( vp ) {
            this.m_viewportObj = vp;
            this._perspectiveDist = 1400;

            var dist = this.getPerspectiveDistFromElement( vp );
            var mode = this.getPerspectiveModeFromElement( vp );
        }
    },
    getViewportObj: { value: function()                 {  return this.m_viewportObj;   } },

    setRootElement: { value: function( elt )            { this._rootElement = elt; } },
    getRootElement: { value: function ()                { return this._rootElement;        } },

    setStageElement: { value: function( elt )    {  this._stageElement = elt;    } },
    getStageElement: { value: function () { return this._stageElement; } },

    setCurrentDocument: { value: function(value) { this._currentDocument = value; }},

    setUserContentLeft: { value: function(value) { this._userContentLeft = value; }},
    setUserContentTop: { value: function(value) { this._userContentTop = value; }},


    getPerspectiveDistance: { value: function () { return this._perspectiveDist; } },

    ///////////////////////////////////////////////////////////////////////
    // Camera and View Methods
    ///////////////////////////////////////////////////////////////////////
    getMatrixFromElement: {
        value: function( elt ) {
            var mat = ElementsMediator.getMatrix(elt);
            if(mat)
            {
                return mat;
            }
            else
            {
                return Matrix.I(4);
            }
        }
    },

    setMatrixForElement: {
        value: function( elt, mat, isChanging ) {
            ElementsMediator.setMatrix(elt, mat, isChanging);
        }
    },


    elementHas3D: {
        value: function( elt ) {
            return ElementsMediator.has3D(elt);
        }
    },

    getElementPlane: {
        value: function( elt ) {
            var bounds = this.getElementViewBounds3D( elt );
            var xArr = new Array(),  yArr = new Array(),  zArr = new Array();
            for (var j=0;  j<4;  j++)
            {
                var pt = this.localToGlobal( bounds[j],  elt );
                xArr.push(pt[0]);  yArr.push(pt[1]);  zArr.push(pt[2]);
            }
            var normal = MathUtils.getPolygonNormal( 4, xArr, yArr, zArr );
            //var d = -MathUtils.dot3( bounds[0], normal );
            var d = -MathUtils.dot3( [xArr[0],yArr[0],zArr[0]], normal );
            normal[3] = d;

            return normal;
        }
    },

    getUnprojectedElementPlane: {
        value: function( elt ) {
            var mat = this.getMatrixFromElement(elt);
            var plane = [mat[8],  mat[9],  mat[10],  mat[11]];

            // The translation value is a point on the plane
            this.pushViewportObj( elt );
            var ptOnPlane = this.getCenterOfProjection();
            this.popViewportObj();

            ptOnPlane[2] = 0;

            ptOnPlane = this.localToStageWorld(ptOnPlane, elt);
            plane[3] = -vecUtils.vecDot(3, plane, ptOnPlane );

            return plane;
        }
    },

    getNormalToUnprojectedElementPlane: {
        value: function( elt ) {
            var mat = this.getMatrixFromElement(elt);

            var xVec = [mat[0],  mat[1],  mat[2],  mat[3]];
            var yVec = [mat[4],  mat[5],  mat[6],  mat[7]];

            var stage = this.application.ninja.currentDocument.documentRoot;
            var stageMat = this.getMatrixFromElement(stage);
            var stagePlane = [stageMat[8],  stageMat[9],  stageMat[10],  stageMat[11]];

            var xDot = Math.abs(vecUtils.vecDot(3, xVec, stagePlane));
            var yDot = Math.abs(vecUtils.vecDot(3, yVec, stagePlane));

            var plane;
            if(xDot > yDot)
            {
                plane = xVec;
            }
            else
            {
                plane = yVec;
            }

            // The translation value is a point on the plane
            this.pushViewportObj( elt );
            var ptOnPlane = this.getCenterOfProjection();
            this.popViewportObj();

            ptOnPlane[2] = 0;

            ptOnPlane = this.localToStageWorld(ptOnPlane, elt);
            plane[3] = -vecUtils.vecDot(3, plane, ptOnPlane );

            return plane;
        }
    },

    getPerspectiveModeFromElement: {
        value: function( elt ) {
            return ElementsMediator.getPerspectiveMode(elt);
        }
    },

    getPerspectiveDistFromElement: {
        value: function( elt ) {
            return ElementsMediator.getPerspectiveDist(elt);
        }
    },

    getEyePoint: {
        value:function() {
            // this function should use the center of projection - it is currently hard wired to (0,0).
            var eye = [0, 0, this._perspectiveDist];

            return eye;
        }
    },

    getCameraMatrix: {
        value: function() {
            return this.getMatrixFromElement( this.m_viewportObj );
        }
    },

    getElementViewBounds3D: {
        value: function( elt ) {
            var bounds = this.getElementBounds( elt, true );
            var ptArray = new Array();
            for (var i=0;  i<4;  i++)
            {
                var pt = bounds.getPoint( i );
                pt[2] = 0; // z == 0
                ptArray.push( pt );
            }

            return ptArray;
        }
    },

    getCenterOfProjection: {
        value: function() {
            var cop;
            var vp = this.getViewportObj();
            if (vp)
            {
                var bounds = this.getViewportBounds();
                cop = bounds.getCenter();
                //cop = [bounds.getRight(), bounds.getBottom()];
            }

            return cop;
        }
    },

    preToPostScreen: {
        value: function( pt, elt ) {
            this.pushViewportObj( elt );
            var viewPt = this.screenToView( pt[0], pt[1], pt[2] );
            var mat = this.getMatrixFromElement( elt );
            var worldPt = MathUtils.transformPoint( viewPt, mat );
            var screenPt = this.viewToScreen( worldPt );
            this.popViewportObj();

            return screenPt;
        }
    },

    localToStageWorld: {
        value: function( localPt,  elt ) {
            this.pushViewportObj( elt );
            var viewPt = this.screenToView( localPt[0], localPt[1], localPt[2] );
            var mat = this.getMatrixFromElement( elt );
            var worldPt = MathUtils.transformPoint( viewPt, mat );
            var stageWorldPt = this.postViewToStageWorld( worldPt, elt );
            this.popViewportObj();

            return stageWorldPt;
        }
    },

    // "post view" refers to a point in view space after the transform
    // i.e., pre and post view spaces.
    // this function is used by snapping routines to put element snap positions
    // into stage world space.
    postViewToStageWorld: {
        value: function( localPt, elt ) {
            if ((elt == null) || (elt === this._stageElement))  return localPt;

            // get the 3D transformation and 2D offset from the element
            var pt = localPt.slice(0);
            pt = MathUtils.makeDimension3( pt );

            // transform the point up the tree
            var child = elt;
            var parent = elt.parentElement;
            while ( parent )
            {
                // go to screen space of the current child
                this.pushViewportObj( child );
                pt = this.viewToScreen( pt );
                this.popViewportObj();

                // to screen space of the parent
                var offset = this.getElementOffset( child );
                offset[2] = 0.0;
                pt = vecUtils.vecAdd( 3, pt, offset );

                // to view space of the parent
                this.pushViewportObj( parent );
                pt = this.screenToView( pt[0], pt[1], pt[2] );
                this.popViewportObj();

                // check if we are done
                if (parent === this._stageElement)  break;

                if (this.elementHas3D( parent ))
                {
                    var parentMat = this.getMatrixFromElement( parent );
                    pt = MathUtils.transformPoint( pt, parentMat );
                }

                child = parent;
                parent = parent.parentElement;
            }

            return pt;
        }
    },

    localToGlobal: {
        value: function( localPt, elt ) {
            // get the 3D transformation and 2D offset from the element
            var pt = localPt.slice(0);
            if (pt.length < 3)  pt[2] = 0;
            if (pt.length == 4)  pt.pop();

            // transform the bounds up the tree
            var child = elt;
            var parent = elt.parentElement;
            while ( parent )
            {
                pt = this.childToParent( pt, child );

                if (parent === this._rootElement)  break;

                child = parent;
                parent = parent.parentElement;
            }

            /////////////////////////////////////////////////////////
            // DEBUG CODE
            /*
             var tmpMat = this.getLocalToGlobalMatrix( elt );
             var hPt = localPt.slice(0);
             MathUtils.makeDimension4( hPt );
             var tmpPt = MathUtils.transformHomogeneousPoint( hPt, tmpMat );
             var gPt = MathUtils.applyHomogeneousCoordinate( tmpPt );
             */
            /////////////////////////////////////////////////////////

            return pt;
        }
    },

    localToGlobal2: {
        value: function( localPt, tmpMat ) {
            var hPt = localPt.slice(0);
            MathUtils.makeDimension4( hPt );
            var tmpPt = MathUtils.transformHomogeneousPoint( hPt, tmpMat );
            var gPt = MathUtils.applyHomogeneousCoordinate( tmpPt );
            gPt = MathUtils.makeDimension3( gPt );
            return gPt;
        }
    },

    childToParent: {
        value: function( pt, child ) {
            // pt should be a 3D (2D is ok) vector in the space of the element
            if (pt.length == 2)  pt[2] = 0;

            // transform the bounds up the tree
            var parent = child.parentElement;
            if ( parent )
            {
                this.setViewportObj( child );

                // get the offset (previously computed
                var childMat = this.getMatrixFromElement( child );
                var offset = this.getElementOffset( child );
                offset[2] = 0;

                if (this.elementHas3D( child ))
                {
                    // if (flatten)  pt[2] = 0;
                    pt = this.screenToView( pt[0], pt[1], pt[2] );
                    pt[3] = 1;
                    //var wPt = childMat.multiply( pt );
                    var wPt = glmat4.multiplyVec3( childMat, pt, [] );
                    var scrPt = this.viewToScreen( wPt );
                    pt = scrPt;
                }

                //pt = pt.add(offset);
                pt = vecUtils.vecAdd(3, pt, offset);
            }

            return [pt[0], pt[1], pt[2]];
        }
    },


    viewToParent: {
        value: function( viewPt, child ) {
            // pt should be a 3D (2D is ok) vector in the space of the element
            var pt = viewPt.slice(0);
            if (pt.length == 2)  pt[2] = 0;
            pt[3] = 1;

            // transform the bounds up the tree
            var parent = child.parentElement;
            if ( parent )
            {
                this.setViewportObj( child );

                // get the offset (previously computed
                var offset = this.getElementOffset( child );
                offset[2] = 0;
                pt = this.viewToScreen( pt );
                //pt = pt.add(offset);
                pt = vecUtils.vecAdd(3, pt, offset);
            }

            return [pt[0], pt[1], pt[2]];
        }
    },

    /**
     * The input plane is specified in stage world space.
     * The output plane is specified in the world space of the input element.
     **/
    globalPlaneToLocal: {
        value: function( plane,  elt ) {
            // get the four corners of the element in global space
            var bounds = this.getElementViewBounds3D( elt );
            var bounds3D = new Array();
            var stage = this.application.ninja.currentDocument.documentRoot;
            for (var i=0;  i<3;  i++)
            {
                var gPt = this.localToGlobal( bounds[i],  elt );
                bounds3D[i] = this.parentToChildWorld( gPt, stage );
            }

            /*
             this.pushViewportObj( elt );
             var parent = elt.parentElement;
             var offset = this.getElementOffset( elt );
             offset[2] = 0;
             var localEyePt = this.getCenterOfProjection();
             localEyePt[2] = this.getPerspectiveDistance();
             localEyePt = vecUtils.vecAdd( 3, offset, localEyePt );
             var eyePt = this.localToGlobal( localEyePt, parent );
             eyePt = this.parentToChildWorld( eyePt, stage );
             */

            // drop the 4 corner points onto the plane and convert back to local space
            var ptArray = new Array;
            for (var i=0;  i<3;  i++)
            {
                var planePt = MathUtils.vecIntersectPlane( bounds3D[i], workingPlane, workingPlane );
                this.setViewportObj( stage );
                var viewPlanePt = this.viewToScreen( planePt );
                var globalPlanePt = this.localToGlobal( viewPlanePt, stage );
                var localPlanePt = this.globalToLocal( globalPlanePt, elt );
                ptArray.push( localPlanePt );
            }

            // get the plane from the 3 points
            var vec0 = vecUtils.vecSubtract(3, ptArray[0], ptArray[1] ),
                vec1 = vecUtils.vecSubtract(3, ptArray[2], ptArray[1] );
            var normal = MathUtils.cross( vec0, vec1 );
            var mag = vecUtils.vecMag(3, normal );
            if (MathUtils.fpSign(mag) == 0)
            {

            }
            var localPlane = vecUtils.vecNormalize( 3, normal, 1.0 );
            localPlane[3] = -vecUtils.vecDot( 3,  ptArray[0], localPlane );

        //        this.popViewportObj();

            return localPlane;
        }
    },
    
    parentToChild: {
        value: function( parentPt, child,  passthrough ) {
            var pt = parentPt.slice(0);
            if (pt.length == 2)  pt[2] = 0.0;

            // subtract off the the offset
            var offset = this.getElementOffset( child );
            offset[2] = 0.0;
            pt = vecUtils.vecSubtract( 3, pt, offset );

            // put the point in the view space of the child
            this.setViewportObj( child );
            var viewPt = this.screenToView( pt[0], pt[1], pt[2] );

            // find the plane to project to
            var mat = this.getMatrixFromElement( child );
            var plane = MathUtils.transformPlane( [0,0,1,0],  mat );

            // project the view point onto the plane
            var eyePt = this.getEyePoint();
            var projPt = MathUtils.vecIntersectPlane( eyePt, MathUtils.vecSubtract(viewPt,eyePt), plane );

            var childPt;
            if (passthrough)
            {
                //var inv = mat.inverse();
                var inv = glmat4.inverse( mat, []);
                var invPt = MathUtils.transformPoint( projPt, inv );

                // put into screen space (without projecting)
                childPt = this.viewToScreen( invPt );
            }
            else
            {
                childPt = this.viewToScreen( projPt );
            }

            return childPt;
        }
    },
    
    parentToChildWorld: {
        value: function( parentPt, child ) {
            var pt = parentPt.slice(0);
            if (pt.length == 2)  pt[2] = 0.0;

            // subtract off the the offset
            var offset = this.getElementOffset( child );
            offset[2] = 0.0;
            //pt = pt.subtract( offset );
            pt = vecUtils.vecSubtract(3, pt, offset);

            // put the point in the view space of the child
            this.pushViewportObj( child );
            var viewPt = this.screenToView( pt[0], pt[1], pt[2] );

            // find the plane to project to
            var mat = this.getMatrixFromElement( child );
            var plane = MathUtils.transformPlane( [0,0,1,0],  mat );

            // project the view point onto the plane
            var eyePt = this.getEyePoint();
            var projPt = MathUtils.vecIntersectPlane( eyePt, MathUtils.vecSubtract(viewPt,eyePt), plane );

            this.popViewportObj();

            return projPt;
        }
    },


    parentToChildVec: {
        value: function( parentPt, child ) {
            var pt = parentPt.slice(0);
            if (pt.length == 2)  pt[2] = 0.0;

            // subtract off the the offset
            var offset = this.getElementOffset( child );
            offset[2] = 0.0;
            pt = vecUtils.vecSubtract( 3, pt, offset );

            // put the point in the view space of the child
            this.setViewportObj( child );
            pt = this.screenToView( pt[0], pt[1], pt[2] );

            var eyePt = this.getEyePoint();
            //var eyePt = [0, 0, 0];
            //var vec = [pt[0], pt[1], pt[2]].subtract( eyePt );
            var vec = vecUtils.vecSubtract(3, [pt[0], pt[1], pt[2]], eyePt);
            vec = vecUtils.vecNormalize( 3, vec );

            return vec;
        }
    },
    
    getElementBounds: {
        value: function( elt, localSpace ) {
            // optional argument localSpace, if true, puts the top left at (0,0).
            if (arguments.length < 2)  localSpace = false;

            var bounds;
            var left    = elt.offsetLeft,
                top     = elt.offsetTop,
                w       = elt.offsetWidth,
                h       = elt.offsetHeight;

            if(elt.width)
                w = elt.width;
            if(elt.height)
                h = elt.height;

            if (elt.style)
            {
                if (elt.style.left)     left    = MathUtils.styleToNumber(elt.style.left);
                if (elt.style.top)      top     = MathUtils.styleToNumber(elt.style.top);
                if (elt.style.width)    w   = MathUtils.styleToNumber(elt.style.width);
                if (elt.style.height)   h  = MathUtils.styleToNumber(elt.style.height);
            }

//            if (elt instanceof SVGSVGElement) {
            if(elt.nodeName.toLowerCase() === "svg") {
                        if(w instanceof SVGAnimatedLength)
                            w = w.animVal.value;
                        if(h instanceof SVGAnimatedLength)
                            h = h.animVal.value;
            }

            bounds = Object.create(Rectangle, {});
            if (localSpace)
            {
                left = 0;
                top = 0;
            }
            bounds.set( left, top,  w, h );

            return bounds;
        }
    },

    getViewportBounds: {
        value: function() {
            var bounds;
            var vp = this.m_viewportObj;
            if (vp)
            {
                bounds = this.getElementBounds( vp );
                bounds.setLeft(0);
                bounds.setTop(0);
            }

            return bounds;
        }
    },


    getElementOffset: {
        value: function( elt ) {
            var xOff = elt.offsetLeft,  yOff = elt.offsetTop;
        //        if (elt.__ninjaXOff)  xOff = elt.__ninjaXOff;
        //        if (elt.__ninjaYOff)  yOff = elt.__ninjaYOff;
            var offset = [xOff, yOff];

            if(elt === this._stageElement)
            {
                // TODO - Call a routine from the user document controller to get the offsets/margins
                // Once we expose the document controller to ViewUtils
                offset[0] += this._userContentLeft;
                offset[1] += this._userContentTop;
            }

            return offset;
        }
    },

    getCameraPos: {
        value: function() {
            var cameraPos = [0, 0, this._perspectiveDist];
            return cameraPos;
        }
    },

    getZIndex: {
        value: function( elt ) {
            var zIndex = 0;
            if (elt.style.zIndex)  zIndex = Number( elt.style.zIndex );

            return zIndex;
        }
    },

    setZIndex: {
        value: function( elt, zIndex ) {
            elt.style.zIndex = zIndex;
        }
    },


    screenToView: {
        value: function(xScr, yScr, zScr) {
            if (arguments.length < 3)  zScr = 0;

              var ctr = this.getCenterOfProjection();
              var xCtr = ctr[0],  yCtr = ctr[1];
    //        var bounds = this.getViewportBounds();
    //        var xCtr    = bounds.getLeft() + 0.5*bounds.getWidth(),
    //            yCtr    = bounds.getTop()  + 0.5*bounds.getHeight();

            // perspective origin not supported
            /*
            if (viewportObj.style.webkit-perspective-origin)
            {
            }
            */

            //var yView = yCtr - yScr,
            var yView = yScr - yCtr,
                xView = xScr - xCtr,
                zView = zScr;

            return [xView, yView, zView];
        }
    },

    viewToScreen: {
        value: function( viewPoint ) {
            var scrPt;
            var viewport = this.m_viewportObj;
            if (viewport)
            {
                // project the point to the z=0 plane
                var viewPt = this.projectToViewPlane( viewPoint );

                // convert from view to screen space
    //            var bounds = this.getViewportBounds();
    //            var ctr = bounds.getCenter();
                var ctr = this.getCenterOfProjection();
                scrPt = [ctr[0] + viewPt[0],  ctr[1] + viewPt[1],  viewPt[2]];
            }

            return scrPt;
        }
    },


    projectToViewPlane: {
        value: function( viewPos ) {
            var viewPt;
            var viewport = this.m_viewportObj;
            if (viewport)
            {
                viewPt = [viewPos[0], viewPos[1], viewPos[2]];

                // apply the perspective
                var dist = this._perspectiveDist - viewPt[2];
                var scale = 0.0;
                if (MathUtils.fpSign(dist) != 0)
                {
                    scale = this._perspectiveDist / dist;
                    viewPt[0] *= scale;
                    viewPt[1] *= scale;
                    viewPt[2] *= scale;
                }
                else
                    console.log( "***** infinite projection  *****" );
            }

            return viewPt;
        }
    },

    
    unproject: {
        value: function( pt ) {
            var viewPt;
            var viewport = this.m_viewportObj;
            if (viewport)
            {
                viewPt = pt.slice(0);
                MathUtils.makeDimension3( viewPt );

                // calculate the unprojected Z value
                var p = this._perspectiveDist;
                var zp = viewPt[2];        // zp == z projected
                var z = zp*p/(zp + p);        // z  == unprojected z value

                var s = (p - z)/p;
                var x = viewPt[0] * s,
                    y = viewPt[1] * s;

                viewPt[0] = x;
                viewPt[1] = y;
                viewPt[2] = z;
            }

            return viewPt;
        }
    },

    worldToView: {
        value: function( worldPos )    {
            // we have no camera, always the same point
            return worldPos;
        }
    },

    viewToWorld: {
        value: function( viewPos ) {
            // we have no camera, always the same point
            return viewPos;
        }
    },

    worldToScreen: {
        value: function( worldPos )    {
            var scrPt;
            var viewport = this.m_viewportObj;
            if (viewport)
            {
                var viewPt = this.worldToView( worldPos )
                if (viewPt)
                    scrPt = this.viewToScreen( viewPt );
            }

            return scrPt;
        }
    },

    getStageWorldToGlobalMatrix: {
        value: function() {
            var stage = this.application.ninja.currentDocument.documentRoot;
            this.pushViewportObj( stage );

                // get the matrix to the parent
                var mat = Matrix.I(4);
                //var projMat = Matrix.I(4).multiply( this.getPerspectiveDistFromElement(stage) );
                var p = this.getPerspectiveDistFromElement(stage);
                var projMat = glmat4.scale( Matrix.I(4), [p,p,p], [] );
                projMat[11] = -1;
                var cop = this.getCenterOfProjection();
                var v2s = Matrix.Translation([cop[0], cop[1], 0]);

                //mat = v2s.multiply( projMat );
                mat = glmat4.multiply( v2s, projMat, [] );

                // offset to the parent
                var offset = this.getElementOffset( stage );
                var offMat = Matrix.Translation([offset[0], offset[1], 0]);
                //mat = offMat.multiply( mat );
                glmat4.multiply( offMat, mat, mat );

            this.popViewportObj();

    //        var mat2 = this.getLocalToGlobalMatrix( stage.parentElement );
            var mat2 = this.getLocalToGlobalMatrix( this._rootElement );
            //var mat = mat2.multiply( mat );
            glmat4.multiply( mat2, mat, mat );

            return mat;
        }
    },

    localScreenToLocalWorld: {
        value: function( objPt,  elt ) {
            MathUtils.makeDimension3( objPt );
            this.pushViewportObj( elt );
            var viewPt = this.screenToView( objPt[0], objPt[1], objPt[2] );
            this.popViewportObj();
            var mat = this.getMatrixFromElement( elt );
            viewPt = MathUtils.transformPoint( viewPt, mat );
            return viewPt;
        }
    },
    
    globalScreenToLocalWorld: {
        value: function( globalPt,  elt ) {
            var objPt = this.globalToLocal( globalPt, elt );
            var viewPt = this.localScreenToLocalWorld( objPt,  elt )

            /*
            MathUtils.makeDimension3( objPt );
            this.pushViewportObj( elt );
            var viewPt = this.screenToView( objPt[0], objPt[1], objPt[2] );
            this.popViewportObj();
            var mat = this.getMatrixFromElement( elt );
            viewPt = MathUtils.transformPoint( viewPt, mat );
            */

            return viewPt;
        }
    },

    globalToLocal: {
        value: function( targetScrPt, elt )    {
            var objPt;

            // get matrix going from object local to screen space, and it's inverse
            var o2w = this.getLocalToGlobalMatrix( elt );
            //var w2o = o2w.inverse();
            var w2o = glmat4.inverse( o2w, []);

            // transform the input point in screen space to object space
            var tmpInPt = targetScrPt.slice(0);
            tmpInPt = MathUtils.makeDimension4( tmpInPt );
            tmpInPt[2] = 0.0;    // z == 0
            var tmpPt1 = MathUtils.transformHomogeneousPoint( tmpInPt, w2o);
            tmpPt1 = MathUtils.applyHomogeneousCoordinate( tmpPt1 );

            // get a second point in object space starting from the input point plus an (arbitrary) z offset
            tmpInPt[2] = 100.0;
            var tmpPt2 = MathUtils.transformHomogeneousPoint( tmpInPt, w2o);
            tmpPt2 = MathUtils.applyHomogeneousCoordinate( tmpPt2 );

            // project the 2 object space points onto the original plane of the object
            objPt = MathUtils.vecIntersectPlane( tmpPt1, vecUtils.vecSubtract(3, tmpPt2, tmpPt1), [0,0,1,0] );

            return objPt;
        }
    },

    getLocalToGlobalMatrix: {
        value: function( elt ) {
            var mat = Matrix.I(4);
            while (elt)
            {
                this.pushViewportObj( elt );
                    var cop = this.getCenterOfProjection();
                    var s2v = Matrix.Translation([-cop[0], -cop[1], 0]);
                    var objMat = this.getMatrixFromElement( elt );

                    //var projMat = Matrix.I(4).multiply( this.getPerspectiveDistFromElement(elt) );
                    var pDist = this.getPerspectiveDistFromElement(elt);
                    var projMat = glmat4.scale(Matrix.I(4), [pDist,pDist,pDist], []);
                    projMat[11] = -1;
                    projMat[15] = 1400;
                    var v2s = Matrix.Translation([cop[0], cop[1], 0]);

                    glmat4.multiply( s2v, mat, mat );
                    glmat4.multiply( objMat, mat, mat );
                    glmat4.multiply( projMat, mat, mat );
                    glmat4.multiply( v2s, mat, mat );

                    // offset to the parent
                    var offset = this.getElementOffset( elt );
                    var offMat = Matrix.Translation([offset[0], offset[1], 0]);
                    //mat = offMat.multiply( mat );
                    glmat4.multiply( offMat, mat, mat );

                this.popViewportObj();

                if (elt === this._stageElement)  break;
                if (elt === this._rootElement)  break;
                elt = elt.parentElement;
                if (elt === this._rootElement)  break;
            }

            return mat;
        }
    },

    getObjToStageWorldMatrix: {
        value: function( elt, shouldProject ) {
            var mat = Matrix.I(4);
            while (elt)
            {
                this.pushViewportObj( elt );
                    var cop = this.getCenterOfProjection();
                    var s2v = Matrix.Translation([-cop[0], -cop[1], 0]);
                    var objMat = this.getMatrixFromElement( elt );
                    var projMat;
                    if(shouldProject)
                    {
                        //projMat = Matrix.I(4).multiply( this.getPerspectiveDistFromElement(elt) );
                        var pDist = this.getPerspectiveDistFromElement(elt);
                        var projMat = glmat4.scale(Matrix.I(4), [pDist,pDist,pDist], []);
                        projMat[11] = -1;
                        projMat[15] = 1400;
                    }
                    var v2s = Matrix.Translation([cop[0], cop[1], 0]);
                this.popViewportObj();

                // multiply all the matrices together
                //mat = s2v.multiply( mat );
                glmat4.multiply( s2v, mat, mat );
                if (elt === this._stageElement)  break;
                //mat = objMat.multiply( mat );
                glmat4.multiply( objMat, mat, mat );
                if(shouldProject)
                {
                    //mat = projMat.multiply( mat );
                    glmat4.multiply( projMat, mat, mat );
                }
                //mat = v2s.multiply( mat );
                glmat4.multiply( v2s, mat, mat );

                // offset to the parent
                var offset = this.getElementOffset( elt );
                var offMat = Matrix.Translation([offset[0], offset[1], 0]);
                //mat = offMat.multiply( mat );
                glmat4.multiply( offMat, mat, mat );

                elt = elt.parentElement;
            }

            return mat;
        }
    },

    getUpVectorFromMatrix: {
        value: function( mat )    {
            //var inv = mat.inverse();
            var yAxis = [mat[4],  mat[5], mat[6]];
            yAxis = vecUtils.vecNormalize( 3, yAxis );
            return yAxis;
        }
    },

    getRollVectorFromMatrix: {
        value: function( mat )    {
            //var inv = mat.inverse();
            var zAxis = [mat[8],  mat[9], mat[10]];
            zAxis = vecUtils.vecNormalize( 3, zAxis );
            return zAxis;
        }
    },

    getMatrixFromVectors: {
        value: function( upVec, zVec )    {
            // get the set of 3 orthogonal axes
            var yAxis = upVec.slice(0);
            MathUtils.makeDimension3( yAxis );
            yAxis = vecUtils.vecNormalize( 3, yAxis );

            var zAxis = zVec.slice(0);
            MathUtils.makeDimension3( zAxis );
            zAxis = vecUtils.vecNormalize( 3, zAxis );
            var xAxis = MathUtils.cross( yAxis, zAxis );

            var dot = MathUtils.dot3( yAxis, zAxis );
            if (MathUtils.fpSign(dot) != 0)
                console.log( "axes not orthogonal" );

            // create the matrix
            var mat = Matrix.create(
                                        [
                                            [xAxis[0],  yAxis[0],  zAxis[0],  0],
                                            [xAxis[1],  yAxis[1],  zAxis[1],  0],
                                            [xAxis[2],  yAxis[2],  zAxis[2],  0],
                                            [         0,           0,           0,  1]
                                        ]
                                    );

            return mat;
        }
    },

    createMatrix: {
        value: function( startMat, startMatInv,  ctr, upVec,  zAxis,  azimuth, altitude )    {
            //console.log( "upVec: " + upVec + ", zAxis: " + zAxis + ", azimuth: " + azimuth + ", altitude: " + altitude );

            var yMat  = Matrix.RotationY( azimuth ),
                xMat  = Matrix.RotationX( altitude );
            //mat = yMat.multiply( xMat );
            var mat = glmat4.multiply( yMat, xMat, []);

            // apply the 'up' matrix
            var upMat = this.getMatrixFromVectors( upVec,  zAxis );
            //this.checkMat( upMat );
            //mat = upMat.multiply( mat );
            glmat4.multiply( upMat, mat, mat );

            // apply the start matrix
            //mat = mat.multiply( startMatInv );
            //mat = startMat.multiply( mat );

            if(ctr)
            {
                // pre-translate by the negative of the transformation center
                var tMat = Matrix.I(4);
                tMat[12] = -ctr[0];
                tMat[13] = -ctr[1];
                tMat[14] = -ctr[2];
                //mat  = mat.multiply( tMat );
                glmat4.multiply( mat, tMat );

                // translate back to the transform center
                tMat[12] = ctr[0];
                tMat[13] = ctr[1];
                tMat[14] = ctr[2];
                //mat  = tMat.multiply( mat );
                glmat4.multiply( tMat, mat, mat );
            }

            //this.checkMat( mat );
            //this.printMat( mat );

            return mat;
        }
    },

    printMat: {
        value: function( mat )    {
            console.log( "\tmat: " + mat );
    //        console.log( "\t\t" + mat[0] );
    //        console.log( "\t\t" + mat[1] );
    //        console.log( "\t\t" + mat[2] );
        }
    },

    checkMat: {
        value: function( mat )    {
            var    xAxis = [mat[0],  mat[1],  mat[ 2]],
                yAxis = [mat[4],  mat[5],  mat[ 6]],
                zAxis = [mat[8],  mat[9],  mat[10]];

            var xMag = MathUtils.vecMag3( xAxis ),  yMag = MathUtils.vecMag3( yAxis ),  zMag = MathUtils.vecMag3( zAxis );
            if (MathUtils.fpCmp(xMag,1) != 0)
                console.log( "xAxis not unit length: " + xMag );
            if (MathUtils.fpCmp(yMag,1) != 0)
                console.log( "yAxis not unit length: " + yMag );
            if (MathUtils.fpCmp(zMag,1) != 0)
                console.log( "zAxis not unit length: " + zMag );

            /*
            var dot = MathUtils.dot3( xAxis, yAxis );
            if (MathUtils.fpSign(dot) != 0)
                console.log( "X-Y not orthogonal" );

            dot = MathUtils.dot3( xAxis, zAxis );
            if (MathUtils.fpSign(dot) != 0)
                console.log( "X-Z not orthogonal" );

            dot = MathUtils.dot3( yAxis, zAxis );
            if (MathUtils.fpSign(dot) != 0)
                console.log( "Y-Z not orthogonal" );
            */
        }
    },

    transformStringToMat: {
        value: function( str )    {
            var rtnMat;

            var index1 = str.indexOf( "matrix3d(");
            if (index1 >= 0)
            {
                index1 += 9;    // do not include 'matrix3d('
                var index2 = str.indexOf( ")", index1 );
                if (index2 >= 0)
                {
                    var substr = str.substr( index1, (index2-index1));
                    if (substr && (substr.length > 0))
                    {
                        var numArray = substr.split(',');
                        var nNums = numArray.length;
                        if (nNums == 16)
                        {
                            // gl-matrix wants row order
                            rtnMat = numArray;
                            for (var i=0;  i<16;  i++)
                                rtnMat[i] = Number( rtnMat[i] );

                            // the matrix as input is column major order.  The Matrix
                            // class expects the numbers in row major order.
                            /*
                            var rowArray = new Array;
                            for (var i=0;  i<4;  i++)
                            {
                                rtnMat.push( numArray[i] );
                                var row = new Array;
                                row.push( Number(numArray[i   ]) );
                                row.push( Number(numArray[i+ 4]) );
                                row.push( Number(numArray[i+ 8]) );
                                row.push( Number(numArray[i+12]) );
                                rowArray.push( row );
                            }
                            rtnMat = Matrix.create( rowArray );
                            */
                        }
                    }
                }
            }

            return rtnMat;
        }
    },

    pushViewportObj: {
        value: function( obj )    {
            this._viewportObjStack.push( this.m_viewportObj );
            this.m_viewportObj = obj;
        }
    },

    popViewportObj: {
        value: function()    {
            if (this._viewportObjStack.length == 0)
            {
                throw( "viewport object stack underflow" );
                return;
            }

            var rtn = this.m_viewportObj;
            this.m_viewportObj = this._viewportObjStack.pop();
            return rtn;
        }
    },

///////////////////////////////////////////////////////////////////////////////////
// Montage update map
//
//	NO LONGER SUPPORTED:
//		stageManagerModule
//		drawLayoutModule
//
//	STAGE ACCESSORS:
//	activeDocument:					this.application.ninja.currentDocument				
//	userContent (stage):			this.application.ninja.currentDocument.documentRoot
//	stageManager:					this.application.ninja.stage								// MainApp\js\stage\stage.reel\stage.js
//	stageManager._canvas:			this.application.ninja.stage.canvas
//	stageManager.layoutCanvas:		this.application.ninja.stage.layoutCanvas
//	stageManager.drawingCanvas:		this.application.ninja.stage.drawingCanvas
//	stageManager.userContentLeft	this.application.ninja.stage.userContentLeft
//	viewUtils:						stage.viewUtils;
//	snapManager						stage.snapManager;
//
//	REDRAW FUNCTIONS
//	window.stageManager.drawSelectionRec(true):			this.application.ninja.stage.updateStage = true;
//	drawLayoutModule.drawLayout.redrawDocument()							OR
//	window.stageManager.drawSelectionRec(true)			this.getStage().draw();
//	drawLayoutModule.drawLayout.redrawDocument();

//	SELECTION MANAGER
//	selected elements:				this.application.ninja.selectedElements
//	selectionManager				this.application.ninja.selectionController
//	selected elements:				this.application.ninja.selectionController.selectElements
//
//	MISCELLANEOUS
//	event.layerX/Y:					var pt = viewUtils.getMousePoint(event);

    getStage: {
        value: function()
		{
			return snapManagerModule.SnapManager.getStage();
		}
	},

    clearStageTranslation: {
        value: function() {
            if (this.application.ninja.currentDocument)
            {
                // get the user content object
                var userContent = this.application.ninja.currentDocument.documentRoot;
                if (!userContent)  return;
                this.setViewportObj( userContent );

                // calculate the new matrix
                var ucMat = this.getMatrixFromElement(userContent);
                var targetMat = ucMat.slice();
                targetMat[12] = 0;  targetMat[13] = 0;  targetMat[14] = 0;
                var ucMatInv = glmat4.inverse( ucMat, [] );
                var deltaMat = glmat4.multiply( targetMat, ucMatInv, [] );
                this.setMatrixForElement(userContent, targetMat );
            }
	    }
    },

	getCurrentDocument:
	{
		value: function()
		{
			return snapManagerModule.SnapManager.application.ninja.currentDocument;
		}
	},

	setStageZoom: {
        value:function( globalPt,  zoomFactor ) {
            var localPt;
            var tmp1, tmp2, tmp3;

            if (this.application.ninja.currentDocument)
            {
                var userContent = this.application.ninja.currentDocument.documentRoot;
                if (!userContent)  return;
                this.setViewportObj( userContent );
                var userContentMat = this.getMatrixFromElement(userContent);

                // create a matrix to do the scaling
                // the input zoomFactor is the total zoom for the resulting matrix, so we need to
                // get the current scale from the existing userContent matrix
                // we assume a uniform scale.
                var ucX = [userContentMat[0], userContentMat[1+0], userContentMat[2+0]];
                var ucY = [userContentMat[4], userContentMat[1+4], userContentMat[2+4]];
                var ucZ = [userContentMat[8], userContentMat[1+8], userContentMat[2+8]];
                var sx = vecUtils.vecMag(3, ucX),
                    sy = vecUtils.vecMag(3, ucY),
                    sz = vecUtils.vecMag(3, ucZ);
                if ((MathUtils.fpCmp(sx,sy) != 0) || (MathUtils.fpCmp(sx,sz)) != 0)
                    console.log( "**** non-uniform scale in view matrix **** " + sx + ", " + sy + ", " + sz );
                var newZoomFactor = zoomFactor/sx;
//                console.log( "old zoom: " + zoomFactor + ", new zoom: " + newZoomFactor );
				if (MathUtils.fpCmp(newZoomFactor,1.0) == 0)
					console.log( "no zoom applied" );
				else
				{
					var zoomMat=[newZoomFactor,0,0,0,0,newZoomFactor,0,0,0,0,newZoomFactor,0,0,0,0,1];

					// get  a point in local userContent space
					localPt  = this.globalToLocal( globalPt, userContent );
					var scrPt = this.screenToView( localPt[0], localPt[1], localPt[2] );
					var worldPt  = MathUtils.transformPoint( scrPt, userContentMat );
					tmp1 = this.localToGlobal( localPt,  userContent );	// DEBUG - remove this line

					// set the viewport object
					this.setViewportObj( userContent );

					// scale around the world point to give the same screen location
					var transPt = worldPt.slice();
					var transPtNeg = transPt.slice();
					vecUtils.vecNegate( 3, transPtNeg );
					var trans1 = Matrix.Translation( transPtNeg ),
						trans2 = Matrix.Translation( transPt );
					var mat = glmat4.multiply( zoomMat, trans1, [] );
					glmat4.multiply( trans2, mat, mat );
					var newUCMat = glmat4.multiply( mat, userContentMat, []);

					this.setMatrixForElement(userContent, newUCMat );
					tmp2 = this.localToGlobal( localPt,  userContent );	// DEBUG - remove this line

					// apply to the stage background
//					var stageBG = this.application.ninja.currentDocument.stageBG;
//					var stageBGMat = this.getMatrixFromElement(stageBG);
//					var newStageBGMat = glmat4.multiply( mat, stageBGMat, []);
//					this.setMatrixForElement(stageBG, newStageBGMat );
				}
            }
        }
    },

	getCanvas:
	{
		value: function()
		{
			return this.application.ninjs.stage.canvas;
		}
	},

	getSelectionManager:
	{
		value: function()
		{
			return this.application.ninja.selectionController;
		}

	},

	getSelectedElements:
	{
		value: function()
		{
			return this.application.ninja.selectedElements.slice();
		}
	},

	getMousePoint:
	{
		value: function(event)
		{
			var point = webkitConvertPointFromPageToNode(this.getCanvas(), new WebKitPoint(event.pageX, event.pageY));
			return [point.x, point.y];
		}
	}

///////////////////////////////////////////////////////////////////////////////////
	
});

