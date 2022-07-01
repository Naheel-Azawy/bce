PREFIX = /usr/local

all: node_modules dist

dist:
	npm run build:prod

node_modules:
	npm install

install:
	mkdir -p $(PREFIX)/share/bce
	cp -r ./dist/* $(PREFIX)/share/bce/

	chmod +x $(PREFIX)/share/bce/index.js
	ln -sf $(PREFIX)/share/bce/index.js $(PREFIX)/bin/bce

	mkdir -p $(PREFIX)/share/icons/hicolor/256x256/apps
	mkdir -p $(PREFIX)/share/applications
	ln -sf $(PREFIX)/share/bce/icon_256x256.png $(PREFIX)/share/icons/hicolor/256x256/apps/bce.png
	cp ./src/ui-web/bce.desktop $(PREFIX)/share/applications
	update-desktop-database

uninstall:
	rm -r $(PREFIX)/share/bce/
	rm $(PREFIX)/bin/bce
	rm $(PREFIX)/share/icons/hicolor/256x256/apps/bce.png
	rm $(PREFIX)/share/applications/bce.desktop

test:
	npm run test

clean:
	rm -rf dist node_modules package-lock.json

.PHONY: install uninstall test clean
