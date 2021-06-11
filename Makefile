all: node_modules dist

dist:
	npm run build:prod

node_modules:
	npm install

install:
	cp ./dist/cli.bundle.js /usr/bin/bce
	chmod +x /usr/bin/bce

test:
	npm run test

clean:
	rm -rf dist node_modules package-lock.json
