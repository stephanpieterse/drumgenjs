DRUMGEN-JS or ACCENTS COMPANION APP
-------

This is a nodejs + docker + lilypond project to generate nicelooking
 patterns for use in drum excercises.
The page is also an installable PWA that should work on most platforms.

BUILD
---
The project is built with docker in mind, so if you have docker installed you can simply
run the `run.sh` script with bash and it will boot everything.
It was never intended to run outside of a container environment, mainly because you
have to fiddle with some dependencies to get things working as expected.


TESTS
----
Tests are also launched with a bash script, to have it in a container where
we can do some performance testing as well as normal unit and integration tests.

NOTES TO SELF
-------------
ALWAYS JSON.parse the importBlocks!
