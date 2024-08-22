checkpoint:
	@git add -A
	@git commit -m "checkpoint at $$(date '+%Y-%m-%dT%H:%M:%S%z')"
	@git push
	@echo Checkpoint created and pushed to remote

dist:
	@CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build

kill:
	@ps aux | grep "llmtree/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron . --no-sandbox" | grep -v "grep" | awk '{ print $$2 }' | xargs kill -9 || true
