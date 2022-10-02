# DrumHead

Spark AR project to play drums by swinging your head

![DrumHead demo gif](https://github.com/AcroMace/DrumHead/raw/master/Demo.gif)

## Getting started

1. Open DrumHead.arproj in Spark AR Studio
2. Press Play
3. You can send the project to your logged in IG/FB account to test

## Files

All of the actual logic is inside `scripts/drumhead.js`

The drum sounds are in `sounds`. All of the drum sounds are [royalty free sounds from musicradar](https://www.musicradar.com/news/drums/1000-free-drum-samples). These sounds were all converted from the original files with [online-convert](https://audio.online-convert.com/convert-to-m4a). As a note, Spark AR requires that all sounds are

- M4A
- 44100 Hz
- Mono
- AAC

The images are in `textures`. These are all square images created from Procreate. The project expects all images to be square and fudges away the whitespace in code.

## Debugging

- In code, there's `DEBUG`. Set this to `true` to enable some debugging logs.
- The `DebugSphere` has been set to invisible, but can be set to visible again from the Spark AR Studio UI. This is functionally useless, but displays where the code thinks that the current tip of the drum stick is. The `DEBUG` flag must be true in order for the location of the sphere to update. Selecting the sphere in the UI can help you see the coordinates of the sphere if it's hidden inside the drum stick.
- You can't hear the drum sounds when recording since the microphone is enabled. This can be disabled, but then no microphone sounds will be heard in the recording. Otherwise, headphones need to be plugged in while recording to hear the effect sound.

## Actual functionality

The original idea was to be able to play along with music, but that doesn't actually work.

- With the microphone on, you can't hear the sound when you play
- With the microphone off, you can't add music. If you add music through the music sticker, the sound from the effect disappears

So the only way to play along with music is to play music loudly through another device while recording with the microphone enabled and without hearing the sound from the effect. Then, you can review it after the recording is finished.
