DRUMGEN-JS
-------

This is a nodejs + docker + lilypond project to generate nicelooking patterns for use in drum excercises.
There is an html page as well as a cordova project for android frontend.

BUILD
---
Run `bash buildandrun.sh` for both app and backend, or `bash run.sh` for only the backend.
Currently the backend is hardcoded to my current public instance at drumgen.apollolms.co.za


DEV-NOTES
---------
Proper accent support in MIDI is allegedly in the 2.20 stable branch.
It would be possible to build it from source and try it out, but since
this use case for it seems trivial it might be best to stick with the
workaround until 2.20 makes it to release.

ALWAYS JSON.parse the importBlocks!
