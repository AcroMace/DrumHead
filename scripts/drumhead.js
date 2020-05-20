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

const playbackController =
Audio.getPlaybackController('aircanPlaybackController');

// Face rotation tracking
let faceX = 0; // Left is negative, right is positive, [-0.5, 0.5]
let faceY = 0; // Down is negative, up is positive, [-0.5, 0.5]
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

Diagnostics.watch('Face rotation horizontal ', FaceTracking.face(0).cameraTransform.rotationY);
Diagnostics.watch('Face rotation veritcal ', FaceTracking.face(0).cameraTransform.rotationX);
