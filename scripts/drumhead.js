const Reactive = require('Reactive');
const Scene = require('Scene');
const Audio = require('Audio');
export const FaceTracking = require('FaceTracking');
export const Diagnostics = require('Diagnostics');

const FaceDirection = Object.freeze({
    NONE: 0,
    TOP_LEFT: 1,
    TOP_RIGHT: 2,
    BOTTOM_LEFT: 3,
    BOTTOM_RIGHT: 4,
});

const camera = Scene.root.find('Camera');
const focalPlane = camera.focalPlane;

const sphere = Scene.root.find('Sphere');

const playbackController =
Audio.getPlaybackController('aircanPlaybackController');

// Face rotation tracking - in radians
let faceX = 0; // Left is negative, right is positive, [-PI, PI]
let faceY = 0; // Down is negative, up is positive, [-PI/2, PI/2]
const threshold = 0.1;
let direction = FaceDirection.NONE;

function playSound() {
    switch (direction) {
        case FaceDirection.NONE:
            return;
        case FaceDirection.TOP_LEFT:
            Diagnostics.log('Top left');
            playbackController.reset();
            playbackController.setPlaying(true);
            return;
        case FaceDirection.TOP_RIGHT:
            Diagnostics.log('Top right');
            return;
        case FaceDirection.BOTTOM_LEFT:
            Diagnostics.log('Bottom left');
            return;
        case FaceDirection.BOTTOM_RIGHT:
            Diagnostics.log('Bottom right');
            return;
    }
}

function update() {
    const oldDirection = direction;

    /**
     * Not sure why, but the threshold for looking slightly down seems to be way more sensitive than looking up.
     * Maybe knowing what rotationZ actually does could help figure out what's happening.
     *
     * The other thing is there should be some sort of debouncing so that the little jiggles in the values don't
     * end up repeatedly triggering the same direction.
     */
    if (faceX < -threshold && faceY < -threshold * 3) {
        direction = FaceDirection.BOTTOM_LEFT;
    } else if (faceX < -threshold && faceY > threshold) {
        direction = FaceDirection.TOP_LEFT;
    } else if (faceX > threshold && faceY < -threshold * 3) {
        direction = FaceDirection.BOTTOM_RIGHT;
    } else if (faceX > threshold && faceY > threshold) {
        direction = FaceDirection.TOP_RIGHT;
    } else {
        direction = FaceDirection.NONE;
    }

    if (oldDirection !== direction) {
        playSound();
    }
}

FaceTracking.face(0).cameraTransform.rotationX.monitor().subscribe(function (event) {
    faceY = -event.newValue;
    update();
});

FaceTracking.face(0).cameraTransform.rotationY.monitor().subscribe(function (event) {
    faceX = event.newValue;
    update();
});

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
const pointPositionVector = Reactive.add(slightlyShorterDirectionVector, noseTipPositionVector);

// Debugging only
Diagnostics.watch('TNose x ', pointPositionVector.x);
Diagnostics.watch('TNose y ', pointPositionVector.y);
Diagnostics.watch('TNose z ', pointPositionVector.z);
sphere.transform.x = pointPositionVector.x;
sphere.transform.y = pointPositionVector.y;
sphere.transform.z = pointPositionVector.z;
