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
const noseTip = FaceTracking.face(0).cameraTransform.applyTo(FaceTracking.face(0).nose.tip);

/**
 * Trying to figure out how to rotate back from the position of the nose.
 * Since the position of the nose is relative to the camera at (0,0,0), it's also the direction
 * vector to the nose from the camera.
 */
const noseVector = Reactive.vector(noseTip.x, noseTip.y, noseTip.z);
// This is the direction vector back from the nose to the camera
const directionBackFromNose = Reactive.mul(noseVector, -1);
// This should be the direction vector from the nose, transformed to the face rotation
const transformedNoseDirection = FaceTracking.face(0).cameraTransform.applyTo(directionBackFromNose);
// Making the direction vector a bit smaller since otherwise we'd reach all the way back to the camera's z-axis
// This is too close to the camera so the sphere would not show up
const slightlySmallerDirectionVector = Reactive.mul(transformedNoseDirection, 0.8);
// Adding the location of the nose to the transformed direction should give a vector back from the nose
const transformedNose = Reactive.add(slightlySmallerDirectionVector, noseVector);
Diagnostics.watch('TNose x ', transformedNose.x);
Diagnostics.watch('TNose y ', transformedNose.y);
Diagnostics.watch('TNose z ', transformedNose.z);
sphere.transform.x = transformedNose.x;
sphere.transform.y = transformedNose.y;
sphere.transform.z = transformedNose.z;
