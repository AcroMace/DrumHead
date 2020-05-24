const Reactive = require('Reactive');
const Scene = require('Scene');
const Audio = require('Audio');
export const FaceTracking = require('FaceTracking');
export const Diagnostics = require('Diagnostics');

const PointDirection = Object.freeze({
    NONE: 0,
    TOP_LEFT: 1,
    TOP_RIGHT: 2,
    BOTTOM_LEFT: 3,
    BOTTOM_RIGHT: 4,
});

const sphere = Scene.root.find('Sphere');
const snarePlaybackController = Audio.getPlaybackController('snarePlaybackController');
const hiHatPlaybackController = Audio.getPlaybackController('hiHatPlaybackController');
const kickPlaybackController = Audio.getPlaybackController('kickPlaybackController');
const tomPlaybackController = Audio.getPlaybackController('tomPlaybackController');

const xThreshold = 0.02;
const yThreshold = 0.04;

var state = {
    // Where the nose is pointing
    nosePoint: {
        x: 0,
        y: 0
    },
    // The direction the nose is pointing
    direction: PointDirection.NONE,
}

function playSound() {
    switch (state.direction) {
        case PointDirection.NONE:
            return;
        case PointDirection.TOP_LEFT:
            Diagnostics.log('Top left');
            snarePlaybackController.reset();
            snarePlaybackController.setPlaying(true);
            return;
        case PointDirection.TOP_RIGHT:
            Diagnostics.log('Top right');
            hiHatPlaybackController.reset();
            hiHatPlaybackController.setPlaying(true);
            return;
        case PointDirection.BOTTOM_LEFT:
            Diagnostics.log('Bottom left');
            kickPlaybackController.reset();
            kickPlaybackController.setPlaying(true);
            return;
        case PointDirection.BOTTOM_RIGHT:
            Diagnostics.log('Bottom right');
            tomPlaybackController.reset();
            tomPlaybackController.setPlaying(true);
            return;
    }
}

function update() {
    const oldDirection = state.direction;

    /**
     * TODO: add debouncing
     * The other thing is there should be some sort of debouncing so that the little jiggles in the values don't
     * end up repeatedly triggering the same direction.
     */
    if (state.nosePoint.x < -xThreshold && state.nosePoint.y < -yThreshold) {
        state.direction = PointDirection.BOTTOM_LEFT;
    } else if (state.nosePoint.x < -xThreshold && state.nosePoint.y > yThreshold) {
        state.direction = PointDirection.TOP_LEFT;
    } else if (state.nosePoint.x > xThreshold && state.nosePoint.y < -yThreshold) {
        state.direction = PointDirection.BOTTOM_RIGHT;
    } else if (state.nosePoint.x > xThreshold && state.nosePoint.y > yThreshold) {
        state.direction = PointDirection.TOP_RIGHT;
    } else {
        state.direction = PointDirection.NONE;
    }

    if (oldDirection !== state.direction) {
        playSound();
    }
}

/**
 * This gives the nose's coordinates from the perspective of the camera, where the camera
 * is at (0,0,0).
 * If you plop a 3D object in the scene and set the position to the position reported here,
 * the object would be where the nose tip is.
 */
const noseTipPositionVector = FaceTracking.face(0).cameraTransform.applyTo(FaceTracking.face(0).nose.tip);

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
 * Making the direction vector a bit smaller since otherwise we'd reach all the way back to the camera's z-axis.
 * The closer this number is to 1 (i.e. almost all the way back to the camera), the more drastic the movement is
 * when the head tilts.
 * This number should coordinate with the drumstick length.
 */
const drumstickScaleFromNoseToCamera = 0.7;
const slightlyShorterDirectionVector = Reactive.mul(transformedNoseDirectionVector, drumstickScaleFromNoseToCamera);

/**
 * Finally, adding the position of the nose with the direction vector back to the camera gives us a point
 * near the camera.
 * This is the position of the sphere. It should be slightly extended from where the drumstick position is.
 */
const nosePointPositionVector = Reactive.add(slightlyShorterDirectionVector, noseTipPositionVector);

nosePointPositionVector.x.monitor().subscribe(function (event) {
    state.nosePoint.x = event.newValue;
    update();
});

nosePointPositionVector.y.monitor().subscribe(function (event) {
    state.nosePoint.y = event.newValue;
    update();
});

// Debugging only
Diagnostics.watch('Nose point x ', nosePointPositionVector.x);
Diagnostics.watch('Nose point y ', nosePointPositionVector.y);
Diagnostics.watch('Nose point z ', nosePointPositionVector.z);
sphere.transform.x = nosePointPositionVector.x;
sphere.transform.y = nosePointPositionVector.y;
sphere.transform.z = nosePointPositionVector.z;
