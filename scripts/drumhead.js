const Reactive = require('Reactive');
const Scene = require('Scene');
const Audio = require('Audio');
const FaceTracking = require('FaceTracking');
const CameraInfo = require('CameraInfo');
export const Diagnostics = require('Diagnostics');

const PointDirection = Object.freeze({
    NONE: 0,
    TOP_LEFT: 1,
    TOP_RIGHT: 2,
    BOTTOM_LEFT: 3,
    BOTTOM_RIGHT: 4,
});

(async function() {

    const [
        camera,
        hiHatRectangle,
        cymbalRectangle,
        tomRectangle,
        snareRectangle,
        snarePlaybackController,
        hiHatPlaybackController,
        cymbalPlaybackController,
        tomPlaybackController
    ] = await Promise.all([
         Scene.root.findFirst('Camera'),
         Scene.root.findFirst('hiHatRectangle'),
         Scene.root.findFirst('cymbalRectangle'),
         Scene.root.findFirst('tomRectangle'),
         Scene.root.findFirst('snareRectangle'),
         Audio.getAudioPlaybackController('snarePlaybackController'),
         Audio.getAudioPlaybackController('hiHatPlaybackController'),
         Audio.getAudioPlaybackController('cymbalPlaybackController'),
         Audio.getAudioPlaybackController('tomPlaybackController')
    ]);

    const DEBUG = true;
    const LENGTH_OF_DRUMSTICK_IN_3D_UNITS = 0.24;
    const HIT_TEST_HORIZONTAL_DEAD_SPACE_MULTIPLE = 0.8;
    const HIT_TEST_VERTICAL_DEAD_SPACE_MULTIPLE = 0.7;

    var state = {
        // Where the nose is pointing, projected onto the focal plane
        projectedPoint: {
            x: 0,
            y: 0
        },
        // The direction the nose is pointing
        direction: PointDirection.NONE,
        // Focal point width and height - 0.5 for height in portrait, then the other one in scale
        // The last value is always 0 for some reason, which is why I save these values in the update events as a hack
        focalWidth: 0,
        focalHeight: 0,
        // Updated when we get dimensions - hit test length at each corner in focal plane coordinates
        horizontalHitTestEdgeLength: 0,
        verticalHitTestEdgeLength: 0,
    }

    function playSound() {
        switch (state.direction) {
            case PointDirection.NONE:
                return;
            case PointDirection.TOP_LEFT:
                hiHatPlaybackController.reset();
                hiHatPlaybackController.setPlaying(true);
                return;
            case PointDirection.TOP_RIGHT:
                cymbalPlaybackController.reset();
                cymbalPlaybackController.setPlaying(true);
                return;
            case PointDirection.BOTTOM_LEFT:
                snarePlaybackController.reset();
                snarePlaybackController.setPlaying(true);
                return;
            case PointDirection.BOTTOM_RIGHT:
                tomPlaybackController.reset();
                tomPlaybackController.setPlaying(true);
                return;
        }
    }

    function isInHiHatLocation(x, y) {
        // Top left
        return x < -state.focalWidth / 2 + state.horizontalHitTestEdgeLength
            && y > state.focalHeight / 2 - state.verticalHitTestEdgeLength;
    }

    function isInCymbalLocation(x, y) {
        // Top right
        return x > state.focalWidth / 2 - state.horizontalHitTestEdgeLength
            && y > state.focalHeight / 2 - state.verticalHitTestEdgeLength;
    }

    function isInSnareLocation(x, y) {
        // Bottom left
        return x < -state.focalWidth / 2 + state.horizontalHitTestEdgeLength
            && y < -state.focalHeight / 2 + state.verticalHitTestEdgeLength;
    }

    function isInTomLocation(x, y) {
        // Bottom right
        return x > state.focalWidth / 2 - state.horizontalHitTestEdgeLength
            && y < -state.focalHeight / 2 + state.verticalHitTestEdgeLength;
    }

    /**
     * TODO: This can probably be simplified to use an AndList instead of using these if statements to
     * make things more efficient, though not sure if it would still support debouncing
     */
    function update() {
        const oldDirection = state.direction;

        /**
         * TODO: add debouncing
         * The other thing is there should be some sort of debouncing so that the little jiggles in the values don't
         * end up repeatedly triggering the same direction.
         */

        if (isInHiHatLocation(state.projectedPoint.x, state.projectedPoint.y)) {
            state.direction = PointDirection.TOP_LEFT;
        } else if (isInCymbalLocation(state.projectedPoint.x, state.projectedPoint.y)) {
            state.direction = PointDirection.TOP_RIGHT;
        } else if (isInSnareLocation(state.projectedPoint.x, state.projectedPoint.y)) {
            state.direction = PointDirection.BOTTOM_LEFT;
        } else if (isInTomLocation(state.projectedPoint.x, state.projectedPoint.y)) {
            state.direction = PointDirection.BOTTOM_RIGHT;
        } else {
            state.direction = PointDirection.NONE;
        }

        if (oldDirection !== state.direction) {
            playSound();
        }
    }

    /**
     * Recalculate dimensions for the art assets
     */

    function resizeAndRepositionDrum() {
        const screenScaleValue = CameraInfo.previewScreenScale; // Const signal
        const screenScale = screenScaleValue.ge(0).ifThenElse(screenScaleValue, 1);
        const screenWidth = CameraInfo.previewSize.width.div(screenScale);
        const screenHeight = CameraInfo.previewSize.height.div(screenScale);
        const squareEdgeLength = screenWidth.div(2).min(screenHeight.div(2)).floor();

        Diagnostics.log('Updating drum art assets to square edge length: ' + squareEdgeLength.pinLastValue());
        hiHatRectangle.width = squareEdgeLength;
        hiHatRectangle.height = squareEdgeLength;
        cymbalRectangle.width = squareEdgeLength;
        cymbalRectangle.height = squareEdgeLength;
        tomRectangle.width = squareEdgeLength;
        tomRectangle.height = squareEdgeLength;
        snareRectangle.width = squareEdgeLength;
        snareRectangle.height = squareEdgeLength;
    }

    function updateHitTestEdgeLength() {
        const hitTestEdgeLength = Math.min(state.focalWidth / 2, state.focalHeight / 2);

        // Reducing the hit test edge length in order to compensate for the empty space in the image files
        state.horizontalHitTestEdgeLength = hitTestEdgeLength * HIT_TEST_HORIZONTAL_DEAD_SPACE_MULTIPLE;
        state.verticalHitTestEdgeLength = hitTestEdgeLength * HIT_TEST_VERTICAL_DEAD_SPACE_MULTIPLE;
    }

    camera.focalPlane.width.monitor({ fireOnInitialValue: true }).subscribe(function (event) {
        state.focalWidth = event.newValue;
        updateHitTestEdgeLength();
    });

    camera.focalPlane.height.monitor({ fireOnInitialValue: true }).subscribe(function (event) {
        state.focalHeight = event.newValue;
        updateHitTestEdgeLength();
    });

    CameraInfo.previewSize.width.monitor({ fireOnInitialValue: true }).subscribe(function (event) {
        resizeAndRepositionDrum();
    });

    CameraInfo.previewSize.height.monitor({ fireOnInitialValue: true }).subscribe(function (event) {
        resizeAndRepositionDrum();
    });

    // Required in order for us to get a lastValue
    CameraInfo.previewScreenScale.monitor({ fireOnInitialValue: true });


    /**
     * This gives the nose's coordinates from the perspective of the camera, where the camera
     * is at (0,0,0).
     * If you plop a 3D object in the scene and set the position to the position reported here,
     * the object would be where the nose tip is.
     */
    const noseTipPositionVector = FaceTracking.face(0).cameraTransform.applyToPoint(FaceTracking.face(0).nose.tip);

    /**
     * Line pointing directly forward from the nose.
     * This does not point to the camera unless the nose is centered at the camera.
     * Negative since the positive direction is from the camera to the nose, so making it negative
     * points the vector from the nose to the camera.
     */
    const straightLineForwardFromNoseDirectionVector = Reactive.vector(0, 0, Reactive.mul(noseTipPositionVector.z, -1));

    /**
     * This should be the direction vector from the nose, transformed to the face rotation.
     * Imagine an anchor where the nose tip is from where the straight line was.
     * When the head rotates, the vector rotates from that anchor without following the nose.
     */
    const transformedNoseDirectionVector = FaceTracking.face(0).cameraTransform.applyTo(straightLineForwardFromNoseDirectionVector);

    /**
     * We want to make the direction vector a bit smaller since otherwise we'd reach all the way back to the camera's z-axis.
     * However, we want to start with the unit vector for the direction since the length of the drumstick is constant.
     * If we don't and just multiply by a constant, then the point we point to would depend on how far the user is from
     * the camera.
     */
    const unitTransformedNoseDirectionVector = Reactive.mul(transformedNoseDirectionVector, Reactive.div(1, transformedNoseDirectionVector.z));

    /**
     * This magic number we're multiplying by should coordinate with the drumstick length.
     * That length is set by the actual length of the 3D object, not programmatically.
     */
    const slightlyShorterDirectionVector = Reactive.mul(unitTransformedNoseDirectionVector, LENGTH_OF_DRUMSTICK_IN_3D_UNITS);

    /**
     * Finally, adding the position of the nose with the direction vector back to the camera gives us a point
     * near the camera.
     * This is the position of the sphere. It should be slightly extended from where the drumstick position is.
     */
    const nosePointPositionVector = Reactive.add(slightlyShorterDirectionVector, noseTipPositionVector);

    /**
     * Projecting the nose point to the z-index of the focal point gives us an (x,y) coordinate bounded to the
     * focal plane width and height.
     * This is what the sphere would look like on the screen since that's 2D.
     */
    const focalPointProjectionMultiple = Reactive.div(camera.focalPlane.distance, Reactive.abs(nosePointPositionVector.z));

    /**
     * The multiplication part works since the position and direction vector are the same from the perspective
     * of the camera.
     * We're basically taking the vector to the point from the camera and extending it, or taking steps in the
     * length of the distance between the camera and the point, until we reach the focal point.
     */
    const nosePointProjectedToFocalPoint = Reactive.mul(nosePointPositionVector, focalPointProjectionMultiple);

    nosePointProjectedToFocalPoint.x.monitor().subscribe(function (event) {
        state.projectedPoint.x = event.newValue;
        update();
    });

    nosePointProjectedToFocalPoint.y.monitor().subscribe(function (event) {
        state.projectedPoint.y = event.newValue;
        update();
    });

    /**
     * Used only for debugging
     */

    if (DEBUG) {
        Diagnostics.watch('Screen width', CameraInfo.previewSize.width);
        Diagnostics.watch('Focal plane width', camera.focalPlane.width);
        Diagnostics.watch('Focal plane height', camera.focalPlane.height);
        Diagnostics.watch('Focal plane distance', camera.focalPlane.distance);

        Diagnostics.watch('Projected point x', nosePointProjectedToFocalPoint.x);
        Diagnostics.watch('Projected point y', nosePointProjectedToFocalPoint.y);

        Diagnostics.watch('Nose point x', nosePointPositionVector.x);
        Diagnostics.watch('Nose point y', nosePointPositionVector.y);
        Diagnostics.watch('Nose point z', nosePointPositionVector.z);

        const debugSphere = Scene.root.findFirst('DebugSphere');
        if (debugSphere && debugSphere.transform) {
            debugSphere.transform.x = nosePointPositionVector.x;
            debugSphere.transform.y = nosePointPositionVector.y;
            debugSphere.transform.z = nosePointPositionVector.z;
        }
    }

})();
