BIN = ./node_modules/.bin
SRC = $(wildcard src/* src/*/*)
TEST = $(wildcard test/* test/*/*)

build: index.js

index.js: src/index.js $(SRC)
	$(BIN)/rollup $< -c -f cjs > $@

test.js: test/index.js $(TEST)
	$(BIN)/rollup $< -c -f cjs > $@

test: test-node test-browser

test-node: test.js
	node $<

test-browser: test.js
	$(BIN)/browserify $< --debug | $(BIN)/tape-run

clean:
	rm -f index.js test.js

.PHONY: build clean test test-node test-browser
