# xfer-tauri — build & distribution targets
#
# Usage: `make help` for the list of commands.
# Most everyday work is `make dev`, then `make archive` to ship a build.

# --- Config ---------------------------------------------------------------

VERSION := $(shell grep '^version' src-tauri/Cargo.toml | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
ARCH    := $(shell uname -m | sed 's/arm64/aarch64/')
DIST    := dist
APP     := src-tauri/target/release/bundle/macos/xfer.app
DMG     := src-tauri/target/release/bundle/dmg/xfer_$(VERSION)_$(ARCH).dmg

# Universal-binary paths (used by `make universal` / `make archive-universal`)
UNI_APP := src-tauri/target/universal-apple-darwin/release/bundle/macos/xfer.app
UNI_DMG := src-tauri/target/universal-apple-darwin/release/bundle/dmg/xfer_$(VERSION)_universal.dmg

.DEFAULT_GOAL := help
.PHONY: help deps dev build release universal archive archive-universal \
        icons clean clean-dist run

# --- Help -----------------------------------------------------------------

help:
	@echo "xfer-tauri  v$(VERSION)  ($(ARCH))"
	@echo ""
	@echo "Common:"
	@echo "  make dev                Start the dev server with hot reload"
	@echo "  make archive            Build release for $(ARCH) and stage a signed .dmg + .app.zip in $(DIST)/"
	@echo "  make archive-universal  Same, but a universal binary (Intel + Apple Silicon)"
	@echo ""
	@echo "Build:"
	@echo "  make deps               Install npm dependencies"
	@echo "  make build              Debug build"
	@echo "  make release            Release build for the host arch ($(ARCH))"
	@echo "  make universal          Universal release build"
	@echo "  make run                Open the built .app"
	@echo ""
	@echo "Maintenance:"
	@echo "  make icons SRC=path/to/source.png   Regenerate all icon files"
	@echo "  make clean              Remove Rust + frontend build artifacts"
	@echo "  make clean-dist         Remove only the staged $(DIST)/ folder"

# --- Setup ----------------------------------------------------------------

deps:
	npm ci

# --- Dev / build ----------------------------------------------------------

dev:
	npm run tauri dev

build:
	npm run tauri build -- --debug

release:
	npm run tauri build

universal:
	rustup target add aarch64-apple-darwin x86_64-apple-darwin
	npm run tauri build -- --target universal-apple-darwin

run:
	@if [ ! -d "$(APP)" ]; then echo "No build yet. Run 'make release' first."; exit 1; fi
	open "$(APP)"

# --- Archive (local distribution) -----------------------------------------
#
# "Archive" = produce a hand-offable .dmg in $(DIST)/ that:
#   1. Has the quarantine xattr stripped
#   2. Is ad-hoc signed so Gatekeeper isn't completely hostile on the build machine
# These DMGs are NOT suitable for shipping to strangers (no Developer ID, no
# notarisation), but they're great for installing on your own machines or
# sharing with technical users who can run a single `xattr` command.

archive: release
	@$(MAKE) _stage SRC_DMG="$(DMG)" SRC_APP="$(APP)" OUT_NAME="xfer-$(VERSION)-$(ARCH)"

archive-universal: universal
	@$(MAKE) _stage SRC_DMG="$(UNI_DMG)" SRC_APP="$(UNI_APP)" OUT_NAME="xfer-$(VERSION)-universal"

# Internal: copy + ad-hoc sign + strip quarantine + zip the .app
_stage:
	@mkdir -p $(DIST)
	@if [ ! -f "$(SRC_DMG)" ]; then echo "DMG not found at $(SRC_DMG)"; exit 1; fi
	@if [ ! -d "$(SRC_APP)" ]; then echo ".app not found at $(SRC_APP)"; exit 1; fi
	@echo "→ Staging $(OUT_NAME)"
	@cp "$(SRC_DMG)" "$(DIST)/$(OUT_NAME).dmg"
	@xattr -cr "$(DIST)/$(OUT_NAME).dmg" || true
	@codesign --force --deep --sign - "$(SRC_APP)" >/dev/null 2>&1 || true
	@xattr -cr "$(SRC_APP)" || true
	@cd "$$(dirname '$(SRC_APP)')" && /usr/bin/ditto -c -k --keepParent "$$(basename '$(SRC_APP)')" "$(CURDIR)/$(DIST)/$(OUT_NAME).app.zip"
	@echo ""
	@ls -lh $(DIST)/$(OUT_NAME).*
	@echo ""
	@echo "Done. Hand-off files in $(DIST)/:"
	@echo "  $(OUT_NAME).dmg       (drag-to-Applications installer)"
	@echo "  $(OUT_NAME).app.zip   (zipped .app — first-time user may need 'xattr -d com.apple.quarantine /Applications/xfer.app')"

# --- Icons ----------------------------------------------------------------
#
# Usage: make icons SRC=/path/to/source.png
# Regenerates the PNGs in src-tauri/icons/ and the multi-resolution .icns
# from a single 1024×1024+ source image.

icons:
	@if [ -z "$(SRC)" ]; then echo "Usage: make icons SRC=path/to/source.png"; exit 1; fi
	@if [ ! -f "$(SRC)" ]; then echo "Source not found: $(SRC)"; exit 1; fi
	@command -v magick >/dev/null 2>&1 || { echo "ImageMagick required. brew install imagemagick"; exit 1; }
	@echo "→ Regenerating icons from $(SRC)"
	@MASTER=$$(mktemp -d)/master.png && \
	  magick "$(SRC)" -resize 1024x1024 -alpha set -define png:color-type=6 "$$MASTER" && \
	  magick "$$MASTER" -resize 32x32   -alpha set -define png:color-type=6 src-tauri/icons/32x32.png && \
	  magick "$$MASTER" -resize 128x128 -alpha set -define png:color-type=6 src-tauri/icons/128x128.png && \
	  magick "$$MASTER" -resize 256x256 -alpha set -define png:color-type=6 src-tauri/icons/128x128@2x.png && \
	  ISET=$$(mktemp -d)/xfer.iconset && mkdir -p "$$ISET" && \
	  magick "$$MASTER" -resize 16x16     "$$ISET/icon_16x16.png" && \
	  magick "$$MASTER" -resize 32x32     "$$ISET/icon_16x16@2x.png" && \
	  magick "$$MASTER" -resize 32x32     "$$ISET/icon_32x32.png" && \
	  magick "$$MASTER" -resize 64x64     "$$ISET/icon_32x32@2x.png" && \
	  magick "$$MASTER" -resize 128x128   "$$ISET/icon_128x128.png" && \
	  magick "$$MASTER" -resize 256x256   "$$ISET/icon_128x128@2x.png" && \
	  magick "$$MASTER" -resize 256x256   "$$ISET/icon_256x256.png" && \
	  magick "$$MASTER" -resize 512x512   "$$ISET/icon_256x256@2x.png" && \
	  magick "$$MASTER" -resize 512x512   "$$ISET/icon_512x512.png" && \
	  magick "$$MASTER" -resize 1024x1024 "$$ISET/icon_512x512@2x.png" && \
	  iconutil -c icns "$$ISET" -o src-tauri/icons/icon.icns
	@echo "Icons written to src-tauri/icons/"

# --- Clean ----------------------------------------------------------------

clean:
	cd src-tauri && cargo clean
	rm -rf node_modules dist $(DIST)

clean-dist:
	rm -rf $(DIST)
