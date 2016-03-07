BIN = ./node_modules/.bin
SRC = $(wildcard src/* src/*/*)

build: index.js

index.js: src/index.js $(SRC)
	$(BIN)/rollup $< -c -f cjs > $@

clean:
	rm index.js

.PHONY: build
