.PHONY: help install build test clean

help:  ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: build ## Install globally
	sudo npm install -g .

build: ## Build the project
	npm run build

test: ## Run tests
	npm test

clean: ## Clean build artifacts
	rm -rf dist node_modules

run: ## Run the application
	node dist/index.js

.DEFAULT_GOAL := help
