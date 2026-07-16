package main

// Version is Konnekt's build version. Overridden at build/release time via
// `-ldflags "-X main.Version=$TAG"` (see the release workflow this repo will
// add once GitHub Releases starts being cut). The "-dev" suffix marks a
// non-release build (e.g. `wails dev`) — the update checker treats it as
// "nothing to check against" since a dev build has no installable artifact.
var Version = "0.1.0-dev"
