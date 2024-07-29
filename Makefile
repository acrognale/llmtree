checkpoint:
	@git add -A
	@git commit -m "checkpoint at $$(date '+%Y-%m-%dT%H:%M:%S%z')"
	@git push
	@echo Checkpoint created and pushed to remote

dist:
	@CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build